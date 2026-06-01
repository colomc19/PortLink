import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { AlertLogEntry } from '@/components/alerts/AlertLogEntry';
import { UpcomingAlerts } from '@/components/alerts/UpcomingAlerts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { AlertWithContext } from '@/hooks/useAlerts';

export const metadata: Metadata = { title: 'Alerts' };

/**
 * Alerts page — server component.
 *
 * Three sections:
 *   Active Alerts    — status IN ('sent') — waiting for action
 *   Upcoming Alerts  — status='scheduled' — fires in the next N hours
 *   History          — status IN ('cancelled', 'sent', 'failed'), last 7 days
 */
export default async function AlertsPage() {
  const supabase = await createClient();

  // async server component: reading the request-time clock to bound the query is intentional
  const sevenDaysAgo = new Date(
    // eslint-disable-next-line react-hooks/purity
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Fetch all relevant alerts with vessel and device context
  const { data: rows, error } = await supabase
    .from('alerts')
    .select(
      `
      id,
      tier,
      status,
      message,
      scheduled_for,
      sent_at,
      vessel_id,
      device_id,
      assignment_id,
      sailing_time,
      vessels!alerts_vessel_id_fkey(
        id,
        name
      ),
      devices!alerts_device_id_fkey(
        id,
        device_number
      )
      `
    )
    .gte('scheduled_for', sevenDaysAgo)
    .order('scheduled_for', { ascending: false });

  if (error) {
    console.error('[AlertsPage]', error.message);
  }

  type AlertRow = {
    id: string;
    tier: string;
    status: string;
    message: string;
    scheduled_for: string;
    sent_at: string | null;
    vessel_id: string;
    device_id: string | null;
    assignment_id: string | null;
    sailing_time: string | null;
    vessels: { id: string; name: string } | null;
    devices: { id: string; device_number: number } | null;
  };

  const allAlerts: AlertWithContext[] = (rows ?? []).map((row: AlertRow) => ({
    id: row.id,
    tier: row.tier as AlertWithContext['tier'],
    status: row.status as AlertWithContext['status'],
    message: row.message,
    scheduled_for: row.scheduled_for,
    sent_at: row.sent_at,
    vessel_id: row.vessel_id,
    vessel_name: row.vessels?.name ?? 'Unknown vessel',
    device_id: row.device_id,
    device_number: row.devices?.device_number ?? null,
    sailing_time: row.sailing_time,
    assignment_id: row.assignment_id,
  }));

  // Partition into sections
  const active = allAlerts.filter((a) => a.status === 'sent');
  const upcoming = allAlerts.filter((a) => a.status === 'scheduled');
  const history = allAlerts.filter(
    (a) => a.status === 'cancelled' || a.status === 'failed'
  );

  // Sort active: urgent first, then by scheduled_for
  const tierOrder: Record<string, number> = { urgent: 0, warning: 1, info: 2 };
  active.sort((a, b) => {
    const tierDiff = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
    if (tierDiff !== 0) return tierDiff;
    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
  });

  // Sort upcoming: soonest first
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );

  const totalActive = active.length + upcoming.length;
  const subtitle =
    totalActive === 0
      ? 'All devices accounted for.'
      : `${totalActive} alert${totalActive === 1 ? '' : 's'} active or upcoming.`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Alerts"
        subtitle={subtitle}
      />

      {/* Active Alerts */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Active Alerts
        </h2>
        {active.length === 0 ? (
          <EmptyState
            icon={<ShieldCheckIcon />}
            title="No active alerts"
            description="All devices accounted for. No sailing alerts require attention."
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((alert) => (
              <AlertLogEntry key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Alerts */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Upcoming Alerts
          </h2>
          <UpcomingAlerts alerts={upcoming} />
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
          History (Last 7 Days)
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 px-1">No alert history in the last 7 days.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((alert) => (
              <AlertLogEntry key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
