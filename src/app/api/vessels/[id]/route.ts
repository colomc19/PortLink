import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { VesselPatchBody } from "@/types/vessel-detail";
import { recalculateAlerts } from "@/lib/alerts/scheduler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/vessels/[id]
 *
 * Returns full vessel detail including:
 * - All vessel fields
 * - Status history (ordered DESC)
 * - Linked pilot_report_rows
 * - Active device assignment + device info
 *
 * 401 if not authenticated, 404 if vessel not found.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { response: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createClient();

  // Fetch vessel with status history, pilot report rows, and device assignments
  const { data: vessel, error } = await supabase
    .from("vessels")
    .select(
      `
      *,
      vessel_status_history(
        id,
        status,
        changed_at,
        source,
        source_id,
        changed_by,
        details
      ),
      pilot_report_rows(
        id,
        pilot_report_id,
        section,
        raw_vessel_name,
        raw_date,
        raw_time_status,
        raw_terminal,
        raw_agent,
        raw_notes,
        parsed_date,
        parsed_time,
        parsed_status,
        needs_review,
        review_reason,
        time_confidence,
        created_at
      ),
      device_assignments(
        id,
        device_id,
        vessel_id,
        status,
        checked_out_at,
        checked_out_by,
        checked_in_at,
        checked_in_by,
        devices(
          id,
          device_number,
          label,
          status,
          notes
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !vessel) {
    if (error?.code === "PGRST116") {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }
    console.error("[GET /api/vessels/[id]]", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch vessel" },
      { status: 500 }
    );
  }

  // Sort status history descending (most recent first)
  const statusHistory = (
    (vessel.vessel_status_history as StatusHistoryRow[] | null) ?? []
  ).sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  // Find the active device assignment (not checked in)
  const assignments =
    (vessel.device_assignments as DeviceAssignmentRow[] | null) ?? [];
  const activeAssignment =
    assignments.find((a) => a.status === "active" || a.status === "out") ??
    null;

  const result = {
    ...vessel,
    vessel_status_history: undefined,
    device_assignments: undefined,
    status_history: statusHistory,
    pilot_report_rows: vessel.pilot_report_rows ?? [],
    active_assignment: activeAssignment
      ? {
          id: activeAssignment.id,
          device_id: activeAssignment.device_id,
          vessel_id: activeAssignment.vessel_id,
          status: activeAssignment.status,
          checked_out_at: activeAssignment.checked_out_at,
          checked_out_by: activeAssignment.checked_out_by,
          checked_in_at: activeAssignment.checked_in_at,
          checked_in_by: activeAssignment.checked_in_by,
          device: activeAssignment.devices,
        }
      : null,
  };

  return NextResponse.json(result);
}

/**
 * PATCH /api/vessels/[id]
 *
 * Updates vessel fields (admin only).
 * Tracks which fields were manually overridden in override_fields JSONB array.
 * Records status change in vessel_status_history if status changed.
 *
 * 401 if not authenticated, 403 if not admin, 404 if not found.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { user, profile, response: adminError } = await requireAdmin();
  if (adminError) return adminError;

  const { id } = await params;
  const supabase = await createClient();

  let body: VesselPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Fetch current vessel to compare status and get existing override_fields
  const { data: current, error: fetchError } = await supabase
    .from("vessels")
    .select("id, status, override_fields, sailing_date, sailing_time")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    if (fetchError?.code === "PGRST116") {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }
    console.error("[PATCH /api/vessels/[id]] fetch", fetchError?.message);
    return NextResponse.json(
      { error: "Failed to fetch vessel" },
      { status: 500 }
    );
  }

  // Build the set of overridden field names
  const existingOverrides: string[] = Array.isArray(current.override_fields)
    ? (current.override_fields as string[])
    : [];

  const editableFields: (keyof VesselPatchBody)[] = [
    "name",
    "status",
    "terminal",
    "arrival_date",
    "arrival_time",
    "sailing_date",
    "sailing_time",
    "agent",
    "notes",
  ];

  const newOverrides = new Set(existingOverrides);
  const updates: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (field in body) {
      updates[field] = body[field];
      newOverrides.add(field);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided" },
      { status: 400 }
    );
  }

  updates.has_manual_override = true;
  updates.override_fields = Array.from(newOverrides);
  updates.updated_by = user.id;
  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("vessels")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[PATCH /api/vessels/[id]] update", updateError?.message);
    return NextResponse.json(
      { error: "Failed to update vessel" },
      { status: 500 }
    );
  }

  // If status changed, record in history. vessel_status_history exposes only a
  // SELECT policy under RLS (append-only audit trail written by the server), so
  // this server-controlled insert uses the service-role client.
  if (body.status && body.status !== current.status) {
    const { error: historyError } = await createAdminClient()
      .from("vessel_status_history")
      .insert({
        vessel_id: id,
        status: body.status,
        source: "manual",
        changed_by: user.id,
        details: { previous_status: current.status, override_by: profile.full_name },
      });

    if (historyError) {
      console.error(
        "[PATCH /api/vessels/[id]] history insert",
        historyError.message
      );
      // Non-fatal — vessel was updated; history entry failed
    }
  }

  // If sailing_date or sailing_time changed, recalculate alerts for this vessel
  const sailingTimeChanged =
    ("sailing_date" in body && body.sailing_date !== current.sailing_date) ||
    ("sailing_time" in body && body.sailing_time !== current.sailing_time);

  if (sailingTimeChanged) {
    recalculateAlerts(id).catch((err: unknown) => {
      console.error("[PATCH /api/vessels/[id]] recalculateAlerts failed:", err);
    });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/vessels/[id]
 * Soft-delete (admin only) — future implementation.
 */
export async function DELETE(_request: NextRequest, { params: _params }: RouteContext) {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}

// ---------------------------------------------------------------------------
// Internal types for query result shapes
// ---------------------------------------------------------------------------

interface StatusHistoryRow {
  id: string;
  status: string;
  changed_at: string;
  source: string;
  source_id: string | null;
  changed_by: string | null;
  details: Record<string, unknown> | null;
}

interface DeviceRow {
  id: string;
  device_number: number;
  label: string;
  status: string;
  notes: string | null;
}

interface DeviceAssignmentRow {
  id: string;
  device_id: string;
  vessel_id: string;
  status: string;
  checked_out_at: string;
  checked_out_by: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  devices: DeviceRow | null;
}
