import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/vessels/DashboardClient';
import type { VesselGroups, VesselSummary } from '@/types/vessels';
import type { ViewMode } from '@/components/ui/ViewToggle';

export const dynamic = 'force-dynamic';

/**
 * Dashboard page — server component.
 *
 * Fetches initial vessel data and user view preference directly from Supabase
 * (no HTTP round-trip) for fast server-rendered first paint.
 *
 * Passes data to DashboardClient which manages real-time updates.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch user profile for view preference
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewPreference: ViewMode = 'table';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('view_preference')
      .eq('id', user.id)
      .single();
    if (profile?.view_preference === 'card') viewPreference = 'card';
  }

  // Fetch active vessels with device assignments
  const { data: vessels, error } = await supabase
    .from('vessels')
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
    .not('status', 'in', '("sailed","cancelled")')
    .order('arrival_date', { ascending: true, nullsFirst: false });

  console.log('[DashboardPage] vessels count:', vessels?.length, 'error:', error?.message ?? 'none');
  if (error) {
    console.error('[DashboardPage] Failed to fetch vessels:', error.message);
  }

  // Shape rows into VesselSummary and group them
  const inPort: VesselSummary[] = [];
  const arriving: VesselSummary[] = [];
  const sailing: VesselSummary[] = [];

  for (const row of vessels ?? []) {
    const activeAssignment = (
      row.device_assignments as DeviceAssignmentRow[] | null
    )?.find((a) => a.status === 'active' || a.status === 'out') ?? null;

    const device = activeAssignment?.devices
      ? {
          deviceId: activeAssignment.devices.id,
          deviceNumber: activeAssignment.devices.device_number,
          deviceLabel: activeAssignment.devices.label,
          deviceStatus: activeAssignment.devices.status,
          assignedAt: activeAssignment.checked_out_at,
        }
      : null;

    const summary: VesselSummary = {
      id: row.id,
      name: row.name,
      status: row.status,
      terminal: row.terminal,
      arrival_date: row.arrival_date,
      arrival_time: row.arrival_time,
      arrival_time_display: row.arrival_time_display,
      sailing_date: row.sailing_date,
      sailing_time: row.sailing_time,
      sailing_time_display: row.sailing_time_display,
      sailing_time_confidence: row.sailing_time_confidence,
      agent: row.agent,
      source: row.source,
      is_new: row.is_new,
      needs_review: row.needs_review,
      review_reason: row.review_reason,
      has_manual_override: row.has_manual_override,
      device,
    };

    if (row.status === 'in_port' || row.status === 'at_anchor') {
      inPort.push(summary);
    } else if (row.status === 'arriving') {
      arriving.push(summary);
    } else if (row.status === 'sailing') {
      sailing.push(summary);
    }
  }

  // Sort within each group by time
  sortByTime(inPort, 'arrival');
  sortByTime(arriving, 'arrival');
  sortByTime(sailing, 'sailing');

  // Sailing: urgent (has device) first
  sailing.sort((a, b) => (a.device ? 0 : 1) - (b.device ? 0 : 1));

  const initialGroups: VesselGroups = { inPort, arriving, sailing };

  return (
    <DashboardClient
      initialGroups={initialGroups}
      initialView={viewPreference}
    />
  );
}

// ---------------------------------------------------------------------------
// Local types for Supabase join shape
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortByTime(vessels: VesselSummary[], timeField: 'arrival' | 'sailing'): void {
  vessels.sort((a, b) => {
    const aDate = timeField === 'arrival' ? a.arrival_date : a.sailing_date;
    const bDate = timeField === 'arrival' ? b.arrival_date : b.sailing_date;
    const aTime = timeField === 'arrival' ? a.arrival_time : a.sailing_time;
    const bTime = timeField === 'arrival' ? b.arrival_time : b.sailing_time;

    const aKey = aDate ? (aTime ? `${aDate} ${aTime}` : aDate) : null;
    const bKey = bDate ? (bTime ? `${bDate} ${bTime}` : bDate) : null;

    if (!aKey && !bKey) return 0;
    if (!aKey) return 1;
    if (!bKey) return -1;
    return aKey.localeCompare(bKey);
  });
}
