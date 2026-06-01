import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET /api/devices — list all devices with current status
 * Sort: needs_retrieval → assigned → available, then by device_number within group.
 */
export async function GET() {
  const { response } = await requireAuth();
  if (response) return response;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("devices")
    .select(`
      id,
      device_number,
      label,
      status,
      notes,
      assigned_at,
      current_vessel_id,
      updated_at,
      device_assignments!device_assignments_device_id_fkey(
        id,
        status,
        checked_out_at,
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
      )
    `)
    .order("device_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach active assignment to each device, then sort
  const STATUS_ORDER: Record<string, number> = {
    needs_retrieval: 0,
    assigned: 1,
    available: 2,
  };

  const devices = (data ?? []).map((device) => {
    const assignments = device.device_assignments as Array<{
      id: string;
      status: string;
      checked_out_at: string;
      vessel_id: string;
      vessels: {
        id: string;
        name: string;
        terminal: string | null;
        sailing_date: string | null;
        sailing_time: string | null;
        sailing_time_display: string | null;
        status: string;
      } | null;
    }>;

    const activeAssignment = assignments?.find((a) => a.status === "active") ?? null;

    return {
      id: device.id,
      device_number: device.device_number,
      label: device.label,
      status: device.status,
      notes: device.notes,
      assigned_at: device.assigned_at,
      current_vessel_id: device.current_vessel_id,
      updated_at: device.updated_at,
      active_assignment: activeAssignment
        ? {
            id: activeAssignment.id,
            checked_out_at: activeAssignment.checked_out_at,
            vessel: activeAssignment.vessels,
          }
        : null,
    };
  });

  devices.sort((a, b) => {
    const aRank = STATUS_ORDER[a.status] ?? 3;
    const bRank = STATUS_ORDER[b.status] ?? 3;
    if (aRank !== bRank) return aRank - bRank;
    return a.device_number - b.device_number;
  });

  return NextResponse.json(devices);
}

export async function POST() {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
