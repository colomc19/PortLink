import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/alerts/sms-sender";

/**
 * GET /api/cron/check-ingestion
 * Vercel Cron: runs at 8am, 12pm, 4pm, and 8pm Central.
 *
 * Checks if a pilot report parse has been completed in the last 8 hours.
 * If none found during business hours (6am–8pm Central, approximated as
 * UTC-6 offset for simplicity), sends a warning SMS to admin recipients
 * and logs a 'no_report_warning' event in ingestion_log.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET not set" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // ── Business hours check (6am–8pm Central = UTC-6 approximate) ──────────────
  // Port of Mobile, AL is in Central Time (UTC-5 CDT / UTC-6 CST).
  // We use UTC-6 as a conservative approximation.
  const centralOffsetMs = 6 * 60 * 60 * 1000;
  const centralNow = new Date(now.getTime() - centralOffsetMs);
  const centralHour = centralNow.getUTCHours();

  const businessHoursStart = 6;  // 6am Central
  const businessHoursEnd = 20;   // 8pm Central

  if (centralHour < businessHoursStart || centralHour >= businessHoursEnd) {
    return NextResponse.json({
      checked: false,
      reason: "outside_business_hours",
      centralHour,
    });
  }

  // ── Check for recent parse_completed event ───────────────────────────────────
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

  const { data: recentLogs, error: logError } = await supabase
    .from("ingestion_log")
    .select("id, created_at")
    .eq("event_type", "parse_completed")
    .gte("created_at", eightHoursAgo)
    .limit(1);

  if (logError) {
    console.error("[check-ingestion] Failed to query ingestion_log:", logError.message);
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  if (recentLogs && recentLogs.length > 0) {
    // Recent report found — all good
    return NextResponse.json({
      checked: true,
      reportFound: true,
      lastIngestionAt: recentLogs[0].created_at,
    });
  }

  // ── No recent report — send warning to admins ────────────────────────────────
  const warningMessage =
    `PortLink: No pilot report received in the last 8 hours. ` +
    `Please check the inbox or contact the pilot station. ` +
    `(${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" })} CT)`;

  // Fetch admin profiles with phone numbers
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id, phone, receives_alerts")
    .eq("role", "admin")
    .eq("receives_alerts", true)
    .not("phone", "is", null);

  const adminPhones = (adminProfiles ?? [])
    .map((p) => p.phone)
    .filter((phone): phone is string => typeof phone === "string" && phone.length > 0);

  const smsResults: Array<{ phone: string; success: boolean; error?: string }> = [];

  for (const phone of adminPhones) {
    const result = await sendSMS(phone, warningMessage);
    smsResults.push({ phone, success: result.success, error: result.error });
  }

  // Log the warning event
  await supabase.from("ingestion_log").insert({
    event_type: "no_report_warning",
    details: {
      centralHour,
      warningMessage,
      adminCount: adminPhones.length,
      smsResults,
    },
  });

  console.log("[check-ingestion] No recent report — warning sent to", adminPhones.length, "admins");

  return NextResponse.json({
    checked: true,
    reportFound: false,
    warned: true,
    adminCount: adminPhones.length,
  });
}
