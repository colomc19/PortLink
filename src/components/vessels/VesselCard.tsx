'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { VesselSummary } from '@/types/vessels';
import {
  formatSailingDisplay,
  formatArrivalDisplay,
  todayString,
} from '@/lib/format-time';

interface VesselCardProps {
  vessel: VesselSummary;
}

/** Returns the left-border color for a vessel card based on status and flags. */
function getBorderColor(vessel: VesselSummary): string {
  if (vessel.needs_review || vessel.source === 'manual') return '#D97706'; // Amber
  switch (vessel.status) {
    case 'in_port':
    case 'at_anchor':
      return '#2C5282'; // Bay Blue
    case 'arriving':
      return '#0284C7'; // Ocean
    case 'sailing':
      return vessel.device !== null ? '#B91C1C' : '#94A3B8'; // Crimson or Slate
    case 'sailed':
      return '#CBD5E1';
    default:
      return '#94A3B8';
  }
}

/** Returns the Badge variant for a vessel's status. */
function getStatusBadgeVariant(vessel: VesselSummary): BadgeVariant {
  if (vessel.status === 'sailing' && vessel.device !== null) {
    return 'sailing_urgent';
  }
  if (vessel.needs_review) return 'needs_review';
  if (vessel.source === 'manual') return 'manual';

  switch (vessel.status) {
    case 'in_port':
    case 'at_anchor':
      return 'in_port';
    case 'arriving':
      return 'arriving';
    case 'sailing':
      return 'sailing';
    case 'sailed':
      return 'sailed';
    default:
      return 'in_port';
  }
}

/** Returns the device Badge variant based on device status. */
function getDeviceBadgeVariant(deviceStatus: string): BadgeVariant {
  if (deviceStatus === 'needs_retrieval') return 'needs_retrieval';
  return 'assigned';
}

export function VesselCard({ vessel }: VesselCardProps) {
  const today = todayString();
  const isUrgent = vessel.status === 'sailing' && vessel.device !== null;
  const borderColor = getBorderColor(vessel);
  const statusVariant = getStatusBadgeVariant(vessel);

  const timeDisplay =
    vessel.status === 'arriving' || vessel.status === 'at_anchor'
      ? formatArrivalDisplay(
          vessel.arrival_date,
          vessel.arrival_time,
          vessel.arrival_time_display,
          today
        )
      : vessel.status === 'sailing' || vessel.status === 'sailed'
      ? formatSailingDisplay(
          vessel.sailing_date,
          vessel.sailing_time,
          vessel.sailing_time_display,
          vessel.sailing_time_confidence,
          today
        )
      : vessel.arrival_date
      ? formatArrivalDisplay(
          vessel.arrival_date,
          vessel.arrival_time,
          vessel.arrival_time_display,
          today
        )
      : '';

  const ariaLabel = [
    vessel.name,
    vessel.status.replace(/_/g, ' '),
    vessel.terminal ? `at ${vessel.terminal}` : null,
    vessel.device ? `Device ${vessel.device.deviceNumber} assigned` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      as="a"
      href={`/vessels/${vessel.id}`}
      borderColor={borderColor}
      urgent={isUrgent}
      className="p-4 md:p-5"
      aria-label={ariaLabel}
    >
      {/* Header row: name + NEW badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2
          className="text-xl font-semibold text-foreground leading-snug line-clamp-2 min-w-0"
          title={vessel.name}
        >
          {vessel.name}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5 mt-0.5">
          {vessel.is_new && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#0D9488] text-white uppercase tracking-wider">
              NEW
            </span>
          )}
          {vessel.has_manual_override && vessel.source !== 'manual' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FFF7ED] text-[#92400E] uppercase tracking-wider border border-[#FDE68A]">
              EDITED
            </span>
          )}
        </div>
      </div>

      {/* Status badge row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={statusVariant} />
        {vessel.source === 'manual' && statusVariant !== 'manual' && (
          <Badge variant="manual" />
        )}
        {vessel.needs_review && statusVariant !== 'needs_review' && (
          <Badge variant="needs_review" />
        )}
      </div>

      {/* Terminal and time info */}
      <div className="space-y-1">
        {vessel.terminal && (
          <p className="text-base text-slate-text">{vessel.terminal}</p>
        )}
        {timeDisplay && (
          <p className="text-base text-slate-text">{timeDisplay}</p>
        )}
      </div>

      {/* Device assignment */}
      {vessel.device && (
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
          <Badge variant={getDeviceBadgeVariant(vessel.device.deviceStatus)} />
          <span className="text-sm text-slate-text">
            {vessel.device.deviceLabel}
          </span>
        </div>
      )}

      {/* Review warning */}
      {vessel.needs_review && vessel.review_reason && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-[#78350F]">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
          <span>{vessel.review_reason}</span>
        </div>
      )}
    </Card>
  );
}
