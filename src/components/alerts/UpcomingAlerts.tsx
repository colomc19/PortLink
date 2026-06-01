'use client';

import { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import type { AlertWithContext } from '@/hooks/useAlerts';

interface UpcomingAlertsProps {
  alerts: AlertWithContext[];
}

function getCountdown(scheduledFor: string): string {
  const now = Date.now();
  const target = new Date(scheduledFor).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return 'firing soon';

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

const TIER_COLORS: Record<string, string> = {
  info: 'text-[#2C5282]',
  warning: 'text-[#D97706]',
  urgent: 'text-[#B91C1C]',
};

/**
 * List of upcoming scheduled alerts with live countdowns.
 *
 * Shows the next alerts to fire in chronological order with a countdown timer.
 * Updates every 30 seconds.
 */
export function UpcomingAlerts({ alerts }: UpcomingAlertsProps) {
  const [, forceUpdate] = useState(0);

  // Refresh countdowns every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const upcoming = alerts
    .filter((a) => a.status === 'scheduled')
    .sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
    )
    .slice(0, 10);

  if (upcoming.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {upcoming.map((alert) => {
        const countdown = getCountdown(alert.scheduled_for);
        const tierColor = TIER_COLORS[alert.tier] ?? 'text-slate-600';
        const deviceLabel = alert.device_number !== null
          ? `Device ${alert.device_number}`
          : null;

        return (
          <div
            key={alert.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md bg-white border border-[#E2E8F0] text-sm"
          >
            <ClockIcon className={['h-4 w-4 shrink-0', tierColor].join(' ')} />
            <span className="flex-1 text-slate-700 min-w-0 truncate">
              Next {alert.tier} alert in{' '}
              <span className={['font-semibold', tierColor].join(' ')}>
                {countdown}
              </span>{' '}
              for{' '}
              <a
                href={`/vessels/${alert.vessel_id}`}
                className="font-semibold text-navy hover:underline"
              >
                {alert.vessel_name}
              </a>
              {deviceLabel && (
                <span className="text-slate-400"> ({deviceLabel})</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
