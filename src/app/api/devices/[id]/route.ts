import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET /api/devices/[id] — device detail with full assignment history
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: device, error: deviceErr } = await supabase
    .from("devices")
    .select("*")
    .eq("id", id)
    .single();

  if (deviceErr || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const { data: assignments, error: assignErr } = await supabase
    .from("device_assignments")
    .select(`
      id,
      status,
      checked_out_at,
      checked_in_at,
      checked_out_by,
      checked_in_by,
      vessel_id,
      vessels!device_assignments_vessel_id_fkey(
        id,
        name,
        terminal,
        sailing_date,
        sailing_time,
        sailing_time_display,
        status
      )
    `)
    .eq("device_id", id)
    .order("checked_out_at", { ascending: false });

  if (assignErr) {
    return NextResponse.json({ error: assignErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ...device,
    assignment_history: assignments ?? [],
  });
}

export async function PATCH() {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
