import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVesselName } from "./vessel-name-normalizer";
import type { ParsedRow } from "./types";

// ─── Status definitions ───────────────────────────────────────────────────────

type VesselStatus =
  | "arriving"
  | "at_anchor"
  | "in_port"
  | "sailing"
  | "sailed"
  | "cancelled";

const STATUS_ORDER: VesselStatus[] = [
  "arriving",
  "at_anchor",
  "in_port",
  "sailing",
  "sailed",
  "cancelled",
];

function statusRank(status: VesselStatus | string): number {
  const idx = STATUS_ORDER.indexOf(status as VesselStatus);
  return idx === -1 ? 0 : idx;
}

/**
 * Maps a parsed section + time-parser status to a vessel status.
 */
function mapToVesselStatus(row: ParsedRow): VesselStatus {
  if (row.section === "sailings") return "sailing";

  // Arrivals: derive from time-parser status keyword
  const parsedStatus = row.parsedTime.status;
  switch (parsedStatus) {
    case "anchor":
      return "at_anchor";
    case "pilot":
    case "boarded":
      return "arriving";
    case "docked":
      return "in_port";
    default:
      return "arriving";
  }
}

// ─── Merge result types ───────────────────────────────────────────────────────

export interface MergeRowResult {
  rowId: string;
  vesselId: string;
  action: "created" | "updated" | "skipped";
  vesselName: string;
  needsReview: boolean;
  reviewReason: string | null;
}

export interface MergeResult {
  created: number;
  updated: number;
  skipped: number;
  needsReview: number;
  rows: MergeRowResult[];
  errors: string[];
}

// ─── Field types for override checking ───────────────────────────────────────

// Stored as a JSONB array of field names on vessels.override_fields (see the
// core schema and PATCH /api/vessels/[id], which writes Array.from(newOverrides)).
type OverrideFields = string[];

// ─── Main merge logic ─────────────────────────────────────────────────────────

/**
 * Merges parsed pilot-report rows into the vessels table.
 *
 * For each row:
 *   - Normalizes the vessel name
 *   - Looks for an active matching vessel (within a 7-day window)
 *   - Creates a new vessel if no match found
 *   - Updates an existing vessel respecting `override_fields`
 *   - Records status history for every status change
 *   - Links the pilot_report_row to the vessel
 *
 * Uses the service-role client to bypass RLS.
 */
export async function mergeRows(
  pilotReportId: string,
  parsedRows: ParsedRow[]
): Promise<MergeResult> {
  const supabase = createAdminClient();
  const result: MergeResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    needsReview: 0,
    rows: [],
    errors: [],
  };

  for (const row of parsedRows) {
    try {
      const rowResult = await processRow(supabase, pilotReportId, row);
      result.rows.push(rowResult);

      if (rowResult.action === "created") result.created++;
      else if (rowResult.action === "updated") result.updated++;
      else result.skipped++;

      if (rowResult.needsReview) result.needsReview++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Row "${row.rawVesselName}": ${msg}`);
    }
  }

  return result;
}

async function processRow(
  supabase: ReturnType<typeof createAdminClient>,
  pilotReportId: string,
  row: ParsedRow
): Promise<MergeRowResult> {
  const nameNormalized = normalizeVesselName(row.rawVesselName);
  const desiredStatus = mapToVesselStatus(row);

  // Store the raw parsed row first (status=pending linkage)
  const { data: insertedRow, error: rowInsertErr } = await supabase
    .from("pilot_report_rows")
    .insert({
      pilot_report_id: pilotReportId,
      raw_vessel_name: row.rawVesselName,
      raw_date: row.rawDate,
      raw_time_status: row.rawTimeStatus,
      raw_terminal: row.rawTerminal,
      raw_agent: row.rawAgent,
      raw_notes: row.rawNotes,
      section: row.section,
      parsed_date: row.parsedDate,
      parsed_time: row.parsedTime.time,
      parsed_time_end: row.parsedTime.timeEnd,
      parsed_status: row.parsedTime.status,
      time_confidence: row.parsedTime.confidence,
      needs_review: row.needsReview,
      review_reason: row.reviewReason,
    })
    .select("id")
    .single();

  if (rowInsertErr || !insertedRow) {
    throw new Error(`Failed to insert pilot_report_row: ${rowInsertErr?.message}`);
  }

  const rowId = insertedRow.id;

  // Search for an active matching vessel within a 7-day window
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);

  const { data: existingVessels, error: searchErr } = await supabase
    .from("vessels")
    .select("*")
    .eq("name_normalized", nameNormalized)
    .not("status", "in", '("sailed","cancelled")')
    .gte("visit_start", windowStart.toISOString())
    .order("visit_start", { ascending: false })
    .limit(1);

  if (searchErr) {
    throw new Error(`Vessel search failed: ${searchErr.message}`);
  }

  const existingVessel = existingVessels?.[0] ?? null;

  if (existingVessel) {
    // Update existing vessel
    const mergeResult = await updateVessel(
      supabase,
      existingVessel,
      row,
      desiredStatus,
      rowId,
      pilotReportId
    );
    return mergeResult;
  } else {
    // Create new vessel
    const createResult = await createVessel(
      supabase,
      row,
      nameNormalized,
      desiredStatus,
      rowId,
      pilotReportId
    );
    return createResult;
  }
}

async function createVessel(
  supabase: ReturnType<typeof createAdminClient>,
  row: ParsedRow,
  nameNormalized: string,
  status: VesselStatus,
  rowId: string,
  pilotReportId: string
): Promise<MergeRowResult> {
  const now = new Date().toISOString();

  const visitStart =
    row.parsedDate ? `${row.parsedDate}T00:00:00.000Z` : now;

  const { data: vessel, error } = await supabase
    .from("vessels")
    .insert({
      name: row.rawVesselName,
      name_normalized: nameNormalized,
      status,
      source: "pilot_report",
      is_new: true,
      new_since: now,
      needs_review: row.needsReview,
      review_reason: row.reviewReason,
      terminal: row.rawTerminal,
      agent: row.rawAgent,
      notes: row.rawNotes,
      arrival_date: row.section === "arrivals" ? row.parsedDate : null,
      arrival_time: row.section === "arrivals" ? row.parsedTime.time : null,
      sailing_date: row.section === "sailings" ? row.parsedDate : null,
      sailing_time: row.section === "sailings" ? row.parsedTime.time : null,
      sailing_time_end:
        row.section === "sailings" ? row.parsedTime.timeEnd : null,
      sailing_time_confidence: row.parsedTime.confidence,
      visit_start: visitStart,
    })
    .select("id")
    .single();

  if (error || !vessel) {
    throw new Error(`Failed to create vessel: ${error?.message}`);
  }

  // Record initial status history
  await supabase.from("vessel_status_history").insert({
    vessel_id: vessel.id,
    status,
    source: "pilot_report",
    source_id: pilotReportId,
    details: { row_id: rowId, section: row.section },
  });

  // Link the pilot_report_row to the vessel
  await supabase
    .from("pilot_report_rows")
    .update({ vessel_id: vessel.id })
    .eq("id", rowId);

  return {
    rowId,
    vesselId: vessel.id,
    action: "created",
    vesselName: row.rawVesselName,
    needsReview: row.needsReview,
    reviewReason: row.reviewReason,
  };
}

async function updateVessel(
  supabase: ReturnType<typeof createAdminClient>,
  existing: Record<string, unknown>,
  row: ParsedRow,
  desiredStatus: VesselStatus,
  rowId: string,
  pilotReportId: string
): Promise<MergeRowResult> {
  const vesselId = existing.id as string;
  const overrideFields: OverrideFields = Array.isArray(existing.override_fields)
    ? (existing.override_fields as OverrideFields)
    : [];

  const updates: Record<string, unknown> = {};
  const reviewReasons: string[] = [];
  let needsReview = false;

  // Helper: apply update only if not overridden; flag review if override conflict
  const applyField = (
    fieldName: string,
    newValue: unknown,
    existingValue: unknown
  ) => {
    if (overrideFields.includes(fieldName)) {
      if (newValue !== null && newValue !== existingValue) {
        needsReview = true;
        reviewReasons.push(
          `Parsed "${fieldName}" differs from manual override: "${existingValue}" vs "${newValue}"`
        );
      }
      return; // do not overwrite
    }
    if (newValue !== null && newValue !== existingValue) {
      updates[fieldName] = newValue;
    }
  };

  // Status progression check
  const currentStatus = existing.status as VesselStatus;
  if (statusRank(desiredStatus) < statusRank(currentStatus)) {
    needsReview = true;
    reviewReasons.push(
      `Status would move backward: "${currentStatus}" → "${desiredStatus}"`
    );
    // Do not update status if it would regress
  } else if (desiredStatus !== currentStatus && !overrideFields.includes("status")) {
    updates["status"] = desiredStatus;
  } else if (overrideFields.includes("status") && desiredStatus !== currentStatus) {
    needsReview = true;
    reviewReasons.push(
      `Parsed status "${desiredStatus}" differs from manual override "${currentStatus}"`
    );
  }

  // Field updates
  applyField("terminal", row.rawTerminal, existing.terminal);
  applyField("agent", row.rawAgent, existing.agent);
  applyField("notes", row.rawNotes, existing.notes);

  if (row.section === "arrivals") {
    applyField("arrival_date", row.parsedDate, existing.arrival_date);
    applyField("arrival_time", row.parsedTime.time, existing.arrival_time);
  } else {
    applyField("sailing_date", row.parsedDate, existing.sailing_date);
    applyField("sailing_time", row.parsedTime.time, existing.sailing_time);
    applyField(
      "sailing_time_end",
      row.parsedTime.timeEnd,
      existing.sailing_time_end
    );
    applyField(
      "sailing_time_confidence",
      row.parsedTime.confidence,
      existing.sailing_time_confidence
    );
  }

  if (needsReview) {
    updates["needs_review"] = true;
    updates["review_reason"] = reviewReasons.join("; ");
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await supabase
      .from("vessels")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", vesselId);

    if (updateErr) {
      throw new Error(`Failed to update vessel: ${updateErr.message}`);
    }

    // Record status history if status changed
    if (updates["status"]) {
      await supabase.from("vessel_status_history").insert({
        vessel_id: vesselId,
        status: updates["status"] as string,
        source: "pilot_report",
        source_id: pilotReportId,
        details: { row_id: rowId, section: row.section, previous_status: currentStatus },
      });

      // When a vessel transitions to sailing, flag any assigned device for retrieval
      if (updates["status"] === "sailing") {
        const { data: activeAssignments } = await supabase
          .from("device_assignments")
          .select("id, device_id")
          .eq("vessel_id", vesselId)
          .eq("status", "active");

        if (activeAssignments && activeAssignments.length > 0) {
          const deviceIds = activeAssignments.map((a) => a.device_id);

          await supabase
            .from("devices")
            .update({ status: "needs_retrieval", updated_at: new Date().toISOString() })
            .in("id", deviceIds);
        }
      }
    }
  }

  // Link the pilot_report_row to the vessel
  await supabase
    .from("pilot_report_rows")
    .update({ vessel_id: vesselId })
    .eq("id", rowId);

  return {
    rowId,
    vesselId,
    // No field changed and nothing to review → the row was effectively a no-op.
    action: Object.keys(updates).length > 0 ? "updated" : "skipped",
    vesselName: row.rawVesselName,
    needsReview,
    reviewReason: reviewReasons.length > 0 ? reviewReasons.join("; ") : null,
  };
}
