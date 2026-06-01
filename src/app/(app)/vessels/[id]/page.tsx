import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VesselDetail } from '@/components/vessels/VesselDetail';
import type { VesselDetail as VesselDetailType } from '@/types/vessel-detail';

interface VesselDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VesselDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('vessels')
    .select('name')
    .eq('id', id)
    .single();
  return { title: data?.name ?? 'Vessel Detail' };
}

export default async function VesselDetailPage({ params }: VesselDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch full vessel detail
  const { data: vessel, error } = await supabase
    .from('vessels')
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
    .eq('id', id)
    .single();

  if (error || !vessel) {
    if (error && error.code !== 'PGRST116') {
      console.error('[VesselDetailPage]', error.message);
    }
    notFound();
  }

  // Shape the result
  type StatusHistoryRow = {
    id: string;
    status: string;
    changed_at: string;
    source: string;
    source_id: string | null;
    changed_by: string | null;
    details: Record<string, unknown> | null;
  };

  type DeviceRow = {
    id: string;
    device_number: number;
    label: string;
    status: string;
    notes: string | null;
  };

  type AssignmentRow = {
    id: string;
    device_id: string;
    vessel_id: string;
    status: string;
    checked_out_at: string;
    checked_out_by: string | null;
    checked_in_at: string | null;
    checked_in_by: string | null;
    devices: DeviceRow | null;
  };

  const statusHistory = (
    (vessel.vessel_status_history as StatusHistoryRow[] | null) ?? []
  ).sort(
    (a, b) =>
      new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  const assignments =
    (vessel.device_assignments as AssignmentRow[] | null) ?? [];
  const activeAssignment =
    assignments.find((a) => a.status === 'active' || a.status === 'out') ??
    null;

  const detail: VesselDetailType = {
    ...(vessel as Omit<typeof vessel, 'vessel_status_history' | 'device_assignments' | 'pilot_report_rows'>),
    status_history: statusHistory,
    pilot_report_rows: (vessel.pilot_report_rows ?? []) as VesselDetailType['pilot_report_rows'],
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
          device: activeAssignment.devices!,
        }
      : null,
  };

  return <VesselDetail vessel={detail} />;
}
