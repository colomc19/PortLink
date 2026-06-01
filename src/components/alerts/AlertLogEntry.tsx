'use client';

import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { AlertWithContext, AlertStatus, AlertTier } from '@/hooks/useAlerts';

interface AlertLogEntryProps {
  alert: AlertWithContext;
}

const TIER_ICONS: Record<AlertTier, (props: { className?: string }) => React.ReactElement> = {
  info: ({ className }) => <InformationCircleIcon className={className} />,
  warning: ({ className }) => <ExclamationTriangleIcon className={className} />,
  urgent: ({ className }) => <ExclamationCircleIcon className={className} />,
};

const TIER_ICON_COLORS: Record<AlertTier, string> = {
  info: 'text-[#2C5282]',
  warning: 'text-[#D97706]',
  urgent: 'text-[#B91C1C]',
};

const STATUS_CONFIG: Record<
  AlertStatus,
  { label: string; className: string; Icon: (props: { className?: string }) => React.ReactElement }
> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700',
    Icon: ({ className }) => <ClockIcon className={className} />,
  },
  sent: {
    label: 'Sent',
    className: 'bg-green-100 text-green-700',
    Icon: ({ className }) => <CheckCircleIcon className={className} />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-500',
    Icon: ({ className }) => <XCircleIcon className={className} />,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
    Icon: ({ className }) => <XCircleIcon className={className} />,
  },
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Single alert entry in the alert log.
 * Shows tier icon, vessel/device info, message, status badge, and timestamp.
 */
export function AlertLogEntry({ alert }: AlertLogEntryProps) {
  const TierIcon = TIER_ICONS[alert.tier];
  const statusConfig = STATUS_CONFIG[alert.status];
  const StatusIcon = statusConfig.Icon;
  const tierIconColor = TIER_ICON_COLORS[alert.tier];

  const timestamp = alert.sent_at ?? alert.scheduled_for;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border border-[#E2E8F0] rounded-md bg-white">
      {/* Tier icon */}
      <TierIcon className={['h-5 w-5 mt-0.5 shrink-0', tierIconColor].join(' ')} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-sm text-slate-800 truncate">
            {alert.vessel_name}
          </span>
          {alert.device_number !== null && (
            <span className="text-xs text-slate-500">
              Device {alert.device_number}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-600 leading-snug">{alert.message}</p>
        <p className="mt-1 text-xs text-slate-400">{formatTimestamp(timestamp)}</p>
      </div>

      {/* Status badge */}
      <div
        className={[
          'shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          statusConfig.className,
        ].join(' ')}
      >
        <StatusIcon className="h-3.5 w-3.5" />
        {statusConfig.label}
      </div>
    </div>
  );
}
