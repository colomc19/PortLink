import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { VesselGroups, VesselSummary } from "@/types/vessels";
import type { VesselCreateBody } from "@/types/vessel-detail";

/**
 * GET /api/vessels
 *
 * Returns active vessels grouped by section: inPort, arriving, sailing.
 *
 * Query params:
 *   status          – filter to a single status value
 *   include_sailed  – "true" to also include sailed/cancelled vessels
 *
 * Each vessel includes an active device assignment if one exists.
 * Sailing group: urgent vessels (with device assigned) are sorted first.
 *
 * 401 if not authenticated.
 */
export async function GET(request: NextRequest) {
  const { response: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const statusFilter = searchParams.get("status");
  const includeSailed = searchParams.get("include_sailed") === "true";

  // Build vessel query
  let query = supabase
    .from("vessels")
    .select(
      `
      id,
      name,
      status,
      terminal,
      arrival_date,
      arrival_time,
      arrival_time_display,
      sailing_date,
      sailing_time,
      sailing_time_display,
      sailing_time_confidence,
      agent,
      source,
      is_new,
      needs_review,
      review_reason,
      has_manual_override,
      device_assignments!device_assignments_vessel_id_fkey(
        id,
        status,
        checked_out_at,
        devices(
          id,
          device_number,
          label,
          status
        )
      )
    `
    )
    .order("arrival_date", { ascending: true, nullsFirst: false });

  // Apply status filter
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  } else if (!includeSailed) {
    query = query.not("status", "in", '("sailed","cancelled")');
  }

  const { data: vessels, error } = await query;

  if (error) {
    console.error("[GET /api/vessels]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch vessels" },
      { status: 500 }
    );
  }

  // Shape each vessel row into VesselSummary
  const summaries: VesselSummary[] = (vessels ?? []).map((vessel) => {
    // Find the active (non-checked-in) device assignment
    const activeAssignment = (vessel.device_assignments as DeviceAssignmentRow[] | null)?.find(
      (a) => a.status === "active" || a.status === "out"
    ) ?? null;

    const device = activeAssignment?.devices
      ? {
          deviceId: activeAssignment.devices.id,
          deviceNumber: activeAssignment.devices.device_number,
          deviceLabel: activeAssignment.devices.label,
          deviceStatus: activeAssignment.devices.status,
          assignedAt: activeAssignment.checked_out_at,
        }
      : null;

    return {
      id: vessel.id,
      name: vessel.name,
      status: vessel.status,
      terminal: vessel.terminal,
      arrival_date: vessel.arrival_date,
      arrival_time: vessel.arrival_time,
      arrival_time_display: vessel.arrival_time_display,
      sailing_date: vessel.sailing_date,
      sailing_time: vessel.sailing_time,
      sailing_time_display: vessel.sailing_time_display,
      sailing_time_confidence: vessel.sailing_time_confidence,
      agent: vessel.agent,
      source: vessel.source,
      is_new: vessel.is_new,
      needs_review: vessel.needs_review,
      review_reason: vessel.review_reason,
      has_manual_override: vessel.has_manual_override,
      device,
    };
  });

  // Group into sections
  const inPort: VesselSummary[] = [];
  const arriving: VesselSummary[] = [];
  const sailing: VesselSummary[] = [];

  for (const vessel of summaries) {
    if (vessel.status === "in_port" || vessel.status === "at_anchor") {
      inPort.push(vessel);
    } else if (vessel.status === "arriving") {
      arriving.push(vessel);
    } else if (vessel.status === "sailing") {
      sailing.push(vessel);
    }
  }

  // Sort each group by time ascending (nulls last)
  sortByTime(inPort, "arrival");
  sortByTime(arriving, "arrival");
  sortByTime(sailing, "sailing");

  // Within sailing: urgent (has device) first
  sailing.sort((a, b) => {
    const aUrgent = a.device !== null ? 0 : 1;
    const bUrgent = b.device !== null ? 0 : 1;
    return aUrgent - bUrgent;
  });

  const result: VesselGroups = { inPort, arriving, sailing };
  return NextResponse.json(result);
}

/**
 * POST /api/vessels
 *
 * Creates a vessel record manually (admin only).
 * Body: { name, date?, time?, status, terminal?, agent?, notes? }
 *
 * - source = 'manual', has_manual_override = true
 * - Normalizes vessel name via DB function
 * - Sets is_new = true, new_since = NOW()
 * - Records in vessel_status_history with source = 'manual'
 *
 * 401 if not authenticated, 403 if not admin, 400 if invalid body.
 */
export async function POST(request: NextRequest) {
  const { user, response: adminError } = await requireAdmin();
  if (adminError) return adminError;

  const supabase = await createClient();

  let body: VesselCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, date, time, status, terminal, agent, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const validStatuses = ["arriving", "in_port", "sailing"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Normalize the vessel name using the DB function
  const { data: normalizeResult, error: normalizeError } = await supabase.rpc(
    "normalize_vessel_name",
    { name: name.trim() }
  );

  if (normalizeError) {
    console.error("[POST /api/vessels] normalize", normalizeError.message);
    return NextResponse.json(
      { error: "Failed to normalize vessel name" },
      { status: 500 }
    );
  }

  const nameNormalized: string = normalizeResult ?? name.trim().toLowerCase();
  const now = new Date().toISOString();

  // Build the insert payload
  type VesselInsert = {
    name: string;
    name_normalized: string;
    status: string;
    source: string;
    has_manual_override: boolean;
    is_new: boolean;
    new_since: string;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
    arrival_date?: string | null;
    arrival_time?: string | null;
    sailing_date?: string | null;
    sailing_time?: string | null;
    terminal?: string | null;
    agent?: string | null;
    notes?: string | null;
  };

  const insertPayload: VesselInsert = {
    name: name.trim(),
    name_normalized: nameNormalized,
    status,
    source: "manual",
    has_manual_override: true,
    is_new: true,
    new_since: now,
    created_by: user.id,
    updated_by: user.id,
    created_at: now,
    updated_at: now,
    terminal: terminal ?? null,
    agent: agent ?? null,
    notes: notes ?? null,
  };

  // Assign date and time based on the vessel status direction
  if (status === "arriving") {
    insertPayload.arrival_date = date ?? null;
    insertPayload.arrival_time = time ?? null;
  } else if (status === "sailing") {
    insertPayload.sailing_date = date ?? null;
    insertPayload.sailing_time = time ?? null;
  } else {
    // in_port — use arrival date as reference
    insertPayload.arrival_date = date ?? null;
    insertPayload.arrival_time = time ?? null;
  }

  const { data: vessel, error: insertError } = await supabase
    .from("vessels")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !vessel) {
    console.error("[POST /api/vessels] insert", insertError?.message);
    return NextResponse.json(
      { error: "Failed to create vessel" },
      { status: 500 }
    );
  }

  // Record in status history. vessel_status_history exposes only a SELECT policy
  // under RLS (it's an append-only audit trail written by the server), so this
  // server-controlled insert uses the service-role client.
  const { error: historyError } = await createAdminClient()
    .from("vessel_status_history")
    .insert({
      vessel_id: vessel.id,
      status,
      source: "manual",
      changed_by: user.id,
      details: { created_manually: true },
    });

  if (historyError) {
    console.error("[POST /api/vessels] history insert", historyError.message);
    // Non-fatal
  }

  return NextResponse.json(vessel, { status: 201 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DeviceRow {
  id: string;
  device_number: number;
  label: string;
  status: string;
}

interface DeviceAssignmentRow {
  id: string;
  status: string;
  checked_out_at: string;
  devices: DeviceRow | null;
}

function sortByTime(
  vessels: VesselSummary[],
  timeField: "arrival" | "sailing"
): void {
  vessels.sort((a, b) => {
    const aDate =
      timeField === "arrival" ? a.arrival_date : a.sailing_date;
    const bDate =
      timeField === "arrival" ? b.arrival_date : b.sailing_date;
    const aTime =
      timeField === "arrival" ? a.arrival_time : a.sailing_time;
    const bTime =
      timeField === "arrival" ? b.arrival_time : b.sailing_time;

    // Build sortable strings: "YYYY-MM-DD HH:MM" or just "YYYY-MM-DD"
    const aKey = aDate
      ? aTime
        ? `${aDate} ${aTime}`
        : aDate
      : null;
    const bKey = bDate
      ? bTime
        ? `${bDate} ${bTime}`
        : bDate
      : null;

    if (aKey === null && bKey === null) return 0;
    if (aKey === null) return 1;
    if (bKey === null) return -1;
    return aKey.localeCompare(bKey);
  });
}
