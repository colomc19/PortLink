import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET /api/alerts
 *
 * Returns alerts with vessel and device context.
 *
 * Query params:
 *   status=active   → status IN ('scheduled', 'sent') [default for banner stack]
 *   status=history  → status IN ('cancelled', 'sent', 'failed'), last 7 days
 *   status=<value>  → exact match (scheduled|sent|cancelled|failed)
 *   vessel_id=<id>  → filter to a specific vessel
 *   page=<n>        → 1-based page number (default: 1)
 *   per_page=<n>    → page size (default: 50, max: 100)
 *
 * Returns: { alerts: AlertWithContext[], total: number }
 */
export async function GET(request: NextRequest) {
  const { response: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const statusParam = searchParams.get("status") ?? "active";
  const vesselId = searchParams.get("vessel_id");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") ?? "50", 10)));
  const offset = (page - 1) * perPage;

  // Build base query with vessel and device joins
  let query = supabase
    .from("alerts")
    .select(
      `
      id,
      tier,
      status,
      message,
      scheduled_for,
      sent_at,
      vessel_id,
      device_id,
      assignment_id,
      sailing_time,
      vessels!alerts_vessel_id_fkey(
        id,
        name
      ),
      devices!alerts_device_id_fkey(
        id,
        device_number
      )
      `,
      { count: "exact" }
    )
    .order("scheduled_for", { ascending: false })
    .range(offset, offset + perPage - 1);

  // Status filter
  if (statusParam === "active") {
    query = query.in("status", ["scheduled", "sent"]);
  } else if (statusParam === "history") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query
      .in("status", ["cancelled", "sent", "failed"])
      .gte("scheduled_for", sevenDaysAgo);
  } else if (["scheduled", "sent", "cancelled", "failed"].includes(statusParam)) {
    query = query.eq("status", statusParam);
  }

  // Vessel filter
  if (vesselId) {
    query = query.eq("vessel_id", vesselId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[GET /api/alerts]", error.message);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }

  // Shape the response
  type AlertRow = {
    id: string;
    tier: string;
    status: string;
    message: string;
    scheduled_for: string;
    sent_at: string | null;
    vessel_id: string;
    device_id: string | null;
    assignment_id: string | null;
    sailing_time: string | null;
    vessels: { id: string; name: string } | null;
    devices: { id: string; device_number: number } | null;
  };

  const alerts = (data ?? []).map((row: AlertRow) => ({
    id: row.id,
    tier: row.tier,
    status: row.status,
    message: row.message,
    scheduled_for: row.scheduled_for,
    sent_at: row.sent_at,
    vessel_id: row.vessel_id,
    vessel_name: row.vessels?.name ?? "Unknown vessel",
    device_id: row.device_id,
    device_number: row.devices?.device_number ?? null,
    sailing_time: row.sailing_time,
    assignment_id: row.assignment_id,
  }));

  // Sort active alerts: urgent first, then by scheduled_for ascending
  if (statusParam === "active") {
    const tierOrder: Record<string, number> = { urgent: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      const tierDiff =
        (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
      if (tierDiff !== 0) return tierDiff;
      return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
    });
  }

  return NextResponse.json({ alerts, total: count ?? 0 });
}
