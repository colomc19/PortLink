import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import type { DeviceBadgeVariant } from '@/components/ui/Badge';
import type { DeviceDetail } from '@/types/devices';

interface DeviceDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default async function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: device, error: deviceErr } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single();

  if (deviceErr || !device) notFound();

  const { data: assignments } = await supabase
    .from('device_assignments')
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
    .eq('device_id', id)
    .order('checked_out_at', { ascending: false });

  const detail: DeviceDetail = {
    ...device,
    assignment_history: (assignments ?? []) as DeviceDetail['assignment_history'],
  };

  const activeAssignment = detail.assignment_history.find((a) => a.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/devices"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy rounded w-fit"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        All Devices
      </Link>

      <PageHeader
        title={`Device ${device.device_number}`}
        subtitle={device.label}
        actions={
          <Badge
            variant={device.status as DeviceBadgeVariant}
          />
        }
      />

      {/* Current assignment */}
      {activeAssignment && (
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-4 md:p-6 flex flex-col gap-3 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Current Assignment</h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <span className="text-slate-500 font-medium">Vessel</span>
            <span className="font-semibold text-foreground">
              {activeAssignment.vessels?.name ?? '—'}
            </span>

            {activeAssignment.vessels?.terminal && (
              <>
                <span className="text-slate-500 font-medium">Terminal</span>
                <span>{activeAssignment.vessels.terminal}</span>
              </>
            )}

            {activeAssignment.vessels?.sailing_time_display && (
              <>
                <span className="text-slate-500 font-medium">Sails</span>
                <span>{activeAssignment.vessels.sailing_time_display}</span>
              </>
            )}

            <span className="text-slate-500 font-medium">Checked out</span>
            <span>{formatDateTime(activeAssignment.checked_out_at)}</span>
          </div>
        </section>
      )}

      {/* Device info */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-4 md:p-6 flex flex-col gap-3 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Device Info</h2>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <span className="text-slate-500 font-medium">Label</span>
          <span>{device.label}</span>

          <span className="text-slate-500 font-medium">Status</span>
          <span className="capitalize">{device.status.replace('_', ' ')}</span>

          {device.notes && (
            <>
              <span className="text-slate-500 font-medium">Notes</span>
              <span>{device.notes}</span>
            </>
          )}
        </div>
      </section>

      {/* Assignment history */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-4 md:p-6 flex flex-col gap-3 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Assignment History</h2>

        {detail.assignment_history.length === 0 ? (
          <p className="text-sm text-slate-400">No assignments recorded.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {detail.assignment_history.map((assignment) => (
              <div key={assignment.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">
                    {assignment.vessels?.name ?? 'Unknown vessel'}
                  </span>
                  <span
                    className={[
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      assignment.status === 'active'
                        ? 'bg-[#EFF6FF] text-[#1E3A5F]'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {assignment.status === 'active' ? 'Active' : 'Returned'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                  <span>Out: {formatDateTime(assignment.checked_out_at)}</span>
                  {assignment.checked_in_at && (
                    <span>In: {formatDateTime(assignment.checked_in_at)}</span>
                  )}
                  {assignment.vessels?.terminal && (
                    <span>{assignment.vessels.terminal}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
