import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngestionStatus = "active" | "warning" | "inactive";

export interface IngestionEvent {
  id: string;
  event_type: string;
  created_at: string;
  details: Record<string, unknown> | null;
  pilot_report_id: string | null;
}

export interface IngestionStatusResponse {
  status: IngestionStatus;
  lastReportAt: string | null;
  reportsToday: number;
  recentEvents: IngestionEvent[];
}

/**
 * GET /api/admin/ingestion-status
 * Returns pipeline health based on pilot_reports + ingestion_log. Admin only.
 * Status logic:
 *   active   — last report within 8 hours
 *   warning  — last report 8–24 hours ago
 *   inactive — last report >24 hours ago or never
 */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const adminClient = createAdminClient();

  // Latest pilot report
  const { data: latestReport, error: reportError } = await adminClient
    .from("pilot_reports")
    .select("id, received_at")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    console.error("[ingestion-status] pilot_reports error:", reportError);
    return NextResponse.json(
      { error: "Failed to fetch ingestion status" },
      { status: 500 }
    );
  }

  // Count reports received today (Central Time — use UTC midnight equivalent)
  // We use a simple approach: last 24 hours from the current date boundary
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );

  const { count: reportsToday, error: countError } = await adminClient
    .from("pilot_reports")
    .select("id", { count: "exact", head: true })
    .gte("received_at", todayStart.toISOString());

  if (countError) {
    console.error("[ingestion-status] count error:", countError);
  }

  // Recent ingestion events (last 10)
  const { data: events, error: eventsError } = await adminClient
    .from("ingestion_log")
    .select("id, event_type, created_at, details, pilot_report_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (eventsError) {
    console.error("[ingestion-status] ingestion_log error:", eventsError);
  }

  // Derive status
  let status: IngestionStatus = "inactive";
  const lastReportAt = latestReport?.received_at ?? null;

  if (lastReportAt) {
    const ageMs = now.getTime() - new Date(lastReportAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours <= 8) {
      status = "active";
    } else if (ageHours <= 24) {
      status = "warning";
    } else {
      status = "inactive";
    }
  }

  const result: IngestionStatusResponse = {
    status,
    lastReportAt,
    reportsToday: reportsToday ?? 0,
    recentEvents: (events ?? []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      created_at: e.created_at,
      details: (e.details as Record<string, unknown>) ?? null,
      pilot_report_id: e.pilot_report_id,
    })),
  };

  return NextResponse.json(result);
}
