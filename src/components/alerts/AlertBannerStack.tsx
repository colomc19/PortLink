'use client';

import { useState, useCallback } from 'react';
import { AlertBanner } from '@/components/ui/AlertBanner';
import type { AlertWithContext } from '@/hooks/useAlerts';

interface AlertBannerStackProps {
  alerts: AlertWithContext[];
  onDismiss?: (alertId: string) => void;
  onConfirmRetrieved?: (alertId: string, deviceId: string | null) => void;
}

const COLLAPSE_THRESHOLD = 3;

/**
 * Renders a stack of alert banners at the top of the dashboard.
 *
 * - Maps alert tiers to AlertBanner tiers
 * - When 3+ alerts exist, collapses to a summary banner
 * - Dismissing a banner only hides it in the UI (does not cancel the alert)
 * - "Confirm Retrieved" links to the vessel detail page where checkin can happen
 */
export function AlertBannerStack({
  alerts,
  onDismiss,
}: AlertBannerStackProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const handleDismiss = useCallback(
    (alertId: string) => {
      setDismissedIds((prev) => new Set([...prev, alertId]));
      onDismiss?.(alertId);
    },
    [onDismiss]
  );

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));

  if (visible.length === 0) return null;

  // Collapsed summary when 3+ alerts
  if (visible.length >= COLLAPSE_THRESHOLD && collapsed) {
    const urgentCount = visible.filter((a) => a.tier === 'urgent').length;
    const title =
      urgentCount > 0
        ? `${urgentCount} URGENT: devices still aboard sailing vessels`
        : `${visible.length} vessels need attention`;

    return (
      <div className="flex flex-col gap-2">
        <AlertBanner
          tier="urgent"
          title={title}
          description="Expand to see individual alerts."
          primaryAction={{
            label: 'Show All Alerts',
            onClick: () => setCollapsed(false),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.length >= COLLAPSE_THRESHOLD && !collapsed && (
        <button
          onClick={() => setCollapsed(true)}
          className="self-end text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
        >
          Collapse alerts
        </button>
      )}
      {visible.map((alert) => {
        const sailingDisplay = alert.sailing_time
          ? alert.sailing_time.slice(0, 5)
          : null;

        const deviceLabel = alert.device_number
          ? `Device ${alert.device_number}`
          : 'Device';

        const description = [
          sailingDisplay ? `Sailing at ${sailingDisplay}` : null,
          alert.device_number ? `${deviceLabel} aboard` : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <AlertBanner
            key={alert.id}
            tier={alert.tier}
            title={alert.vessel_name}
            description={description || undefined}
            primaryAction={{
              label: 'View Vessel',
              href: `/vessels/${alert.vessel_id}`,
            }}
            onDismiss={() => handleDismiss(alert.id)}
          />
        );
      })}
    </div>
  );
}
