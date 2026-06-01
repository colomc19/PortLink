import { NextRequest, NextResponse } from "next/server";
import { processIncomingEmail } from "@/lib/parser/ingestion-pipeline";

/**
 * POST /api/ingest/pilot-report
 *
 * SendGrid Inbound Parse webhook endpoint.
 * SendGrid sends emails as multipart/form-data with the following fields:
 *   - from:    sender address
 *   - subject: email subject
 *   - html:    HTML body
 *   - text:    plain-text body (optional)
 *
 * Authentication: validates the X-Webhook-Secret header against
 * SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET environment variable.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth: validate webhook secret ─────────────────────────────────────────
  const webhookSecret = process.env.SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(
      "[ingest] SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET is not configured"
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const requestSecret = request.headers.get("X-Webhook-Secret");
  if (!requestSecret || requestSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse multipart form data ─────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Failed to parse form data:", msg);
    return NextResponse.json(
      { error: "Invalid form data", details: msg },
      { status: 400 }
    );
  }

  const from = formData.get("from");
  const subject = formData.get("subject");
  const html = formData.get("html");
  const text = formData.get("text");

  // Validate required fields
  if (!from || typeof from !== "string") {
    return NextResponse.json(
      { error: "Missing required field: from" },
      { status: 400 }
    );
  }
  if (!html || typeof html !== "string") {
    return NextResponse.json(
      { error: "Missing required field: html" },
      { status: 400 }
    );
  }

  const subjectStr = typeof subject === "string" ? subject : "";
  const textStr = typeof text === "string" ? text : undefined;

  // ── Run ingestion pipeline ────────────────────────────────────────────────
  try {
    const result = await processIncomingEmail({
      from,
      subject: subjectStr,
      html,
      text: textStr,
    });

    // Always return 200 to SendGrid — even partial failures.
    // If we return non-2xx, SendGrid will retry indefinitely.
    return NextResponse.json(
      {
        ok: true,
        pilotReportId: result.pilotReportId,
        reportDate: result.reportDate,
        status: result.status,
        stats: {
          rowsTotal: result.rowsTotal,
          rowsCreated: result.rowsCreated,
          rowsUpdated: result.rowsUpdated,
          rowsSkipped: result.rowsSkipped,
          rowsNeedReview: result.rowsNeedReview,
        },
        errors:
          result.parseErrors.length + result.mergeErrors.length > 0
            ? { parse: result.parseErrors, merge: result.mergeErrors }
            : undefined,
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest] Unhandled pipeline error:", msg);

    // Return 500 for truly unhandled errors (e.g., could not store the raw email).
    // Pipeline-level failures (parse errors, merge errors) return 200 above so
    // SendGrid does not retry. Only throw-level failures reach here.
    return NextResponse.json(
      {
        ok: false,
        error: "Pipeline error",
        details: msg,
      },
      { status: 500 }
    );
  }
}
