import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/alerts/sms-sender";

/**
 * GET /api/cron/process-alerts
 * Vercel Cron: runs every 5 minutes.
 *
 * Queries alerts where status='scheduled' AND scheduled_for <= NOW().
 * For each due alert:
 *   1. Verifies the device assignment is still active
 *   2. If device was already returned: cancels alert with reason 'device_retrieved'
 *   3. If device still out: fetches enabled SMS recipients and sends
 *   4. Updates alert status (sent/failed) with delivery results
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // ── Auth: CRON_SECRET ────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[process-alerts] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  const expectedHeader = `Bearer ${cronSecret}`;

  // Vercel also sends cron requests from its own infrastructure;
  // accept the standard Bearer token check.
  if (authHeader !== expectedHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const stats = {
    processed: 0,
    sent: 0,
    cancelled: 0,
    failed: 0,
  };

  // ── Fetch due alerts ─────────────────────────────────────────────────────────
  const { data: dueAlerts, error: fetchError } = await supabase
    .from("alerts")
    .select("id, vessel_id, device_id, assignment_id, tier, message")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (fetchError) {
    console.error(
      "[process-alerts] Failed to fetch due alerts:",
      fetchError.message
    );
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueAlerts || dueAlerts.length === 0) {
    return NextResponse.json({ ...stats, message: "No alerts due" });
  }

  // ── Fetch enabled SMS recipients once ───────────────────────────────────────
  const { data: recipients } = await supabase
    .from("alert_recipients")
    .select("profile_id, method, enabled")
    .eq("enabled", true)
    .eq("method", "sms");

  let recipientPhones: string[] = [];
  if (recipients && recipients.length > 0) {
    const profileIds = recipients.map((r) => r.profile_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone, receives_alerts")
      .in("id", profileIds)
      .eq("receives_alerts", true)
      .not("phone", "is", null);

    recipientPhones = (profiles ?? [])
      .map((p) => p.phone)
      .filter(
        (phone): phone is string =>
          typeof phone === "string" && phone.length > 0
      );
  }

  // ── Process each due alert ───────────────────────────────────────────────────
  for (const alert of dueAlerts) {
    stats.processed++;

    // Verify assignment is still active
    if (alert.assignment_id) {
      const { data: assignment } = await supabase
        .from("device_assignments")
        .select("id, status")
        .eq("id", alert.assignment_id)
        .single();

      if (!assignment || assignment.status !== "active") {
        // Device was already returned — cancel this alert
        await supabase
          .from("alerts")
          .update({
            status: "cancelled",
            cancelled_at: now,
            cancel_reason: "device_retrieved",
            updated_at: now,
          })
          .eq("id", alert.id);

        stats.cancelled++;
        continue;
      }
    }

    // No recipients configured — mark as sent with a note, don't fail silently
    if (recipientPhones.length === 0) {
      await supabase
        .from("alerts")
        .update({
          status: "sent",
          sent_at: now,
          delivery_status: { note: "no_recipients_configured" },
          updated_at: now,
        })
        .eq("id", alert.id);
      stats.sent++;
      continue;
    }

    // Send to each recipient
    const deliveryResults: Record<
      string,
      { success: boolean; sid?: string; error?: string }
    > = {};
    let anySuccess = false;
    let allFailed = true;

    for (const phone of recipientPhones) {
      const result = await sendSMS(phone, alert.message);
      deliveryResults[phone] = result;
      if (result.success) {
        anySuccess = true;
        allFailed = false;
      }
    }

    if (anySuccess) {
      await supabase
        .from("alerts")
        .update({
          status: "sent",
          sent_at: now,
          delivery_status: deliveryResults,
          delivery_method: "sms",
          updated_at: now,
        })
        .eq("id", alert.id);
      stats.sent++;
    } else if (allFailed) {
      await supabase
        .from("alerts")
        .update({
          status: "failed",
          sent_at: now,
          delivery_status: deliveryResults,
          delivery_method: "sms",
          updated_at: now,
        })
        .eq("id", alert.id);
      stats.failed++;
    }
  }

  console.log("[process-alerts] Complete:", stats);
  return NextResponse.json(stats);
}
