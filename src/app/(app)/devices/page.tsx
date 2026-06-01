import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevicesClient } from '@/components/devices/DevicesClient';
import type { DeviceSummary } from '@/types/devices';

export const metadata: Metadata = { title: 'Devices' };

/**
 * Devices inventory page — server renders initial data,
 * client component handles refresh and modals.
 */
export default async function DevicesPage() {
  const supabase = await createClient();

  // Verify session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('devices')
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
    .order('device_number', { ascending: true });

  const STATUS_ORDER: Record<string, number> = {
    needs_retrieval: 0,
    assigned: 1,
    available: 2,
  };

  type RawAssignment = {
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
  };

  const devices: DeviceSummary[] = (data ?? [])
    .map((device) => {
      const assignments = device.device_assignments as RawAssignment[];
      const activeAssignment =
        assignments?.find((a) => a.status === 'active') ?? null;

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
    })
    .sort((a, b) => {
      const aRank = STATUS_ORDER[a.status] ?? 3;
      const bRank = STATUS_ORDER[b.status] ?? 3;
      if (aRank !== bRank) return aRank - bRank;
      return a.device_number - b.device_number;
    });

  if (error) {
    // Render with empty state — client can retry
    return <DevicesClient initialDevices={[]} />;
  }

  return <DevicesClient initialDevices={devices} />;
}
