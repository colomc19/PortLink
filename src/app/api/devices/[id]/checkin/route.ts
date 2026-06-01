import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { cancelAlerts } from "@/lib/alerts/scheduler";

/**
 * POST /api/devices/[id]/checkin
 * Finds the active assignment for this device, marks it returned,
 * and resets the device back to available.
 * Returns 404 if no active assignment exists.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { id: deviceId } = await params;
  const supabase = await createClient();

  // Find the active assignment
  const { data: assignment, error: findErr } = await supabase
    .from("device_assignments")
    .select("id, vessel_id")
    .eq("device_id", deviceId)
    .eq("status", "active")
    .single();

  if (findErr || !assignment) {
    return NextResponse.json(
      { error: "No active assignment found for this device" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // Close the assignment
  const { data: updatedAssignment, error: closeErr } = await supabase
    .from("device_assignments")
    .update({
      status: "returned",
      checked_in_at: now,
      checked_in_by: user.id,
    })
    .eq("id", assignment.id)
    .select()
    .single();

  if (closeErr) {
    return NextResponse.json({ error: closeErr.message }, { status: 500 });
  }

  // Reset device to available
  const { error: deviceUpdateErr } = await supabase
    .from("devices")
    .update({
      status: "available",
      current_vessel_id: null,
      assigned_at: null,
      updated_at: now,
    })
    .eq("id", deviceId);

  if (deviceUpdateErr) {
    return NextResponse.json({ error: deviceUpdateErr.message }, { status: 500 });
  }

  // Cancel any scheduled alerts for this assignment
  cancelAlerts(assignment.id, "device_retrieved").catch((err: unknown) => {
    console.error("[checkin] cancelAlerts failed:", err);
  });

  return NextResponse.json(updatedAssignment);
}
