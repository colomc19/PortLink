import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { scheduleAlerts } from "@/lib/alerts/scheduler";

/**
 * POST /api/devices/[id]/checkout
 * Body: { vesselId: string }
 * Creates a device_assignment with status='active' and updates device status.
 * Returns 409 if the device is already assigned.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { id: deviceId } = await params;

  let body: { vesselId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { vesselId } = body;
  if (!vesselId) {
    return NextResponse.json({ error: "vesselId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify the device exists and is available
  const { data: device, error: deviceErr } = await supabase
    .from("devices")
    .select("id, status, device_number")
    .eq("id", deviceId)
    .single();

  if (deviceErr || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (device.status !== "available") {
    return NextResponse.json(
      { error: `Device ${device.device_number} is already ${device.status}` },
      { status: 409 }
    );
  }

  // Verify the vessel exists and get sailing info for alert scheduling
  const { data: vessel, error: vesselErr } = await supabase
    .from("vessels")
    .select("id, name, sailing_date, sailing_time, sailing_time_confidence")
    .eq("id", vesselId)
    .single();

  if (vesselErr || !vessel) {
    return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Create the assignment
  const { data: assignment, error: assignErr } = await supabase
    .from("device_assignments")
    .insert({
      device_id: deviceId,
      vessel_id: vesselId,
      status: "active",
      checked_out_at: now,
      checked_out_by: user.id,
    })
    .select()
    .single();

  if (assignErr) {
    // Unique constraint violation — device was already assigned concurrently
    if (assignErr.code === "23505") {
      return NextResponse.json(
        { error: `Device ${device.device_number} is already assigned` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: assignErr.message }, { status: 500 });
  }

  // Update device status
  const { error: updateErr } = await supabase
    .from("devices")
    .update({
      status: "assigned",
      current_vessel_id: vesselId,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", deviceId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Schedule sailing alerts if the vessel has a sailing time
  if (vessel.sailing_time) {
    scheduleAlerts(vessel, assignment).catch((err: unknown) => {
      console.error("[checkout] scheduleAlerts failed:", err);
    });
  }

  return NextResponse.json(assignment, { status: 201 });
}
