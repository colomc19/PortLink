import { createAdminClient } from "@/lib/supabase/admin";
import { parsePilotReportHtml } from "./pilot-report-parser";
import { mergeRows } from "./vessel-merger";
import { recalculateAlerts } from "@/lib/alerts/scheduler";

export interface IngestionParams {
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IngestionResult {
  pilotReportId: string;
  reportDate: string | null;
  rowsTotal: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsNeedReview: number;
  parseErrors: string[];
  mergeErrors: string[];
  status: "parsed" | "partial" | "failed";
}

/**
 * End-to-end ingestion pipeline for an incoming Pilot Report email.
 *
 * Steps:
 *   1. Store raw email in pilot_reports (status: 'pending')
 *   2. Log 'email_received' event
 *   3. Parse HTML body into structured rows
 *   4. Store parsed rows via vessel-merger (which writes pilot_report_rows)
 *   5. Merge rows into vessels table
 *   6. Update pilot_report status and stats
 *   7. Log completion event
 *   8. Return stats
 */
export async function processIncomingEmail(
  params: IngestionParams
): Promise<IngestionResult> {
  const supabase = createAdminClient();

  // ── Step 1: Store raw email ──────────────────────────────────────────────
  const { data: report, error: reportErr } = await supabase
    .from("pilot_reports")
    .insert({
      sender_email: params.from,
      subject: params.subject,
      raw_html: params.html,
      raw_text: params.text ?? null,
      parse_status: "pending",
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (reportErr || !report) {
    // Can't even store the raw email — nothing we can do
    throw new Error(
      `Failed to store raw pilot report: ${reportErr?.message ?? "unknown error"}`
    );
  }

  const pilotReportId = report.id;

  // ── Step 2: Log email_received ───────────────────────────────────────────
  await supabase.from("ingestion_log").insert({
    pilot_report_id: pilotReportId,
    event_type: "email_received",
    details: {
      from: params.from,
      subject: params.subject,
    },
  });

  // ── Step 3: Parse HTML ───────────────────────────────────────────────────
  let parseResult;
  try {
    parseResult = parsePilotReportHtml(params.html, params.subject);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed(supabase, pilotReportId, [msg]);
    return buildResult(pilotReportId, null, 0, 0, 0, 0, 0, [msg], [], "failed");
  }

  // Update the report with the parsed date now that we have it
  if (parseResult.reportDate) {
    await supabase
      .from("pilot_reports")
      .update({ report_date: parseResult.reportDate })
      .eq("id", pilotReportId);
  }

  // If parse produced no rows, mark as failed
  if (parseResult.rows.length === 0) {
    const errors = [
      ...parseResult.errors,
      "No rows parsed from email body",
    ];
    await markFailed(supabase, pilotReportId, errors);
    return buildResult(
      pilotReportId,
      parseResult.reportDate,
      0,
      0,
      0,
      0,
      0,
      errors,
      [],
      "failed"
    );
  }

  // ── Steps 4 & 5: Merge rows into vessels (also writes pilot_report_rows) ──
  let mergeResult;
  try {
    mergeResult = await mergeRows(pilotReportId, parseResult.rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed(supabase, pilotReportId, [...parseResult.errors, msg]);
    return buildResult(
      pilotReportId,
      parseResult.reportDate,
      parseResult.rows.length,
      0,
      0,
      0,
      0,
      parseResult.errors,
      [msg],
      "failed"
    );
  }

  // ── Step 6: Update pilot_report status ──────────────────────────────────
  const allErrors = [...parseResult.errors, ...mergeResult.errors];
  const finalStatus: "parsed" | "partial" | "failed" =
    allErrors.length === 0
      ? "parsed"
      : mergeResult.rows.length > 0
        ? "partial"
        : "failed";

  await supabase
    .from("pilot_reports")
    .update({
      parse_status: finalStatus,
      parsed_at: new Date().toISOString(),
      row_count: parseResult.rows.length,
      parse_errors: allErrors.length > 0 ? allErrors : null,
    })
    .eq("id", pilotReportId);

  // ── Step 6.5: Recalculate alerts for affected sailing vessels ───────────
  // For each vessel that was created or updated and has status 'sailing',
  // recalculate alerts in case sailing time changed.
  const vesselIdsToRecalculate = new Set<string>();
  for (const row of mergeResult.rows) {
    if (row.action === "created" || row.action === "updated") {
      vesselIdsToRecalculate.add(row.vesselId);
    }
  }
  if (vesselIdsToRecalculate.size > 0) {
    // Only recalculate for sailing vessels with active device assignments
    const { data: sailingVessels } = await supabase
      .from("vessels")
      .select("id")
      .eq("status", "sailing")
      .in("id", Array.from(vesselIdsToRecalculate));

    const sailingIds = (sailingVessels ?? []).map((v: { id: string }) => v.id);
    for (const vesselId of sailingIds) {
      // Fire and forget — errors logged inside recalculateAlerts
      recalculateAlerts(vesselId).catch((err: unknown) => {
        console.error(
          "[ingestion-pipeline] recalculateAlerts failed for vessel %s:",
          vesselId,
          err
        );
      });
    }
  }

  // ── Step 7: Log completion ───────────────────────────────────────────────
  await supabase.from("ingestion_log").insert({
    pilot_report_id: pilotReportId,
    event_type: "parse_completed",
    details: {
      status: finalStatus,
      rows_total: parseResult.rows.length,
      rows_created: mergeResult.created,
      rows_updated: mergeResult.updated,
      rows_skipped: mergeResult.skipped,
      rows_needs_review: mergeResult.needsReview,
      parse_errors: parseResult.errors.length,
      merge_errors: mergeResult.errors.length,
    },
  });

  // ── Step 8: Return stats ─────────────────────────────────────────────────
  return buildResult(
    pilotReportId,
    parseResult.reportDate,
    parseResult.rows.length,
    mergeResult.created,
    mergeResult.updated,
    mergeResult.skipped,
    mergeResult.needsReview,
    parseResult.errors,
    mergeResult.errors,
    finalStatus
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  pilotReportId: string,
  errors: string[]
): Promise<void> {
  await supabase
    .from("pilot_reports")
    .update({
      parse_status: "failed",
      parsed_at: new Date().toISOString(),
      parse_errors: errors,
    })
    .eq("id", pilotReportId);

  await supabase.from("ingestion_log").insert({
    pilot_report_id: pilotReportId,
    event_type: "parse_failed",
    details: { errors },
  });
}

function buildResult(
  pilotReportId: string,
  reportDate: string | null,
  rowsTotal: number,
  rowsCreated: number,
  rowsUpdated: number,
  rowsSkipped: number,
  rowsNeedReview: number,
  parseErrors: string[],
  mergeErrors: string[],
  status: "parsed" | "partial" | "failed"
): IngestionResult {
  return {
    pilotReportId,
    reportDate,
    rowsTotal,
    rowsCreated,
    rowsUpdated,
    rowsSkipped,
    rowsNeedReview,
    parseErrors,
    mergeErrors,
    status,
  };
}
