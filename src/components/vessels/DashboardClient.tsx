'use client';

import { useState, useCallback } from 'react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardCardView } from './DashboardCardView';
import { DashboardTableView } from './DashboardTableView';
import { AlertBannerStack } from '@/components/alerts/AlertBannerStack';
import { useRealtimeVessels } from '@/hooks/useRealtimeVessels';
import { useRealtimeDevices } from '@/hooks/useRealtimeDevices';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useAlerts } from '@/hooks/useAlerts';
import type { VesselGroups } from '@/types/vessels';
import type { ViewMode } from '@/components/ui/ViewToggle';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface DashboardClientProps {
  initialGroups: VesselGroups;
  initialView: ViewMode;
}

/**
 * Client wrapper for the dashboard page.
 * Manages real-time vessel/device subscriptions and view toggle state.
 * Receives server-rendered initial data as props for fast first paint.
 */
export function DashboardClient({ initialGroups, initialView }: DashboardClientProps) {
  const [groups, setGroups] = useState<VesselGroups>(initialGroups);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { view, setView } = useViewPreference({ initial: initialView });
  const { alerts } = useAlerts();

  const handleUpdate = useCallback((updated: VesselGroups, ts: Date) => {
    setGroups(updated);
    setLastUpdated(ts);
    setFetchError(null);
  }, []);

  const handleDeviceChange = useCallback(async () => {
    try {
      const res = await fetch('/api/vessels', { cache: 'no-store' });
      if (!res.ok) {
        setFetchError('Failed to refresh vessel data. Showing last known state.');
        return;
      }
      const data = (await res.json()) as VesselGroups;
      setGroups(data);
      setLastUpdated(new Date());
      setFetchError(null);
    } catch {
      setFetchError('Network error refreshing vessel data. Showing last known state.');
    }
  }, []);

  useRealtimeVessels({ groups, onUpdate: handleUpdate });
  useRealtimeDevices({ onDeviceChange: handleDeviceChange });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle="Vessel activity and device status at a glance."
        actions={<ViewToggle value={view} onChange={setView} />}
      />

      {fetchError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          {fetchError}
        </div>
      )}

      {alerts.length > 0 && (
        <AlertBannerStack alerts={alerts} />
      )}

      <div aria-live="polite" aria-atomic="false">
        {view === 'card' ? (
          <DashboardCardView groups={groups} lastUpdated={lastUpdated} />
        ) : (
          <DashboardTableView groups={groups} lastUpdated={lastUpdated} />
        )}
      </div>
    </div>
  );
}
