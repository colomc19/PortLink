'use client';

import Link from 'next/link';
import { ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { VesselSummary } from '@/types/vessels';
import {
  formatSailingDisplay,
  formatArrivalDisplay,
  todayString,
} from '@/lib/format-time';

interface VesselRowProps {
  vessel: VesselSummary;
  /** Show agent column (desktop only) */
  showAgent?: boolean;
}

function getStatusBadgeVariant(vessel: VesselSummary): BadgeVariant {
  if (vessel.status === 'sailing' && vessel.device !== null) return 'sailing_urgent';
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

function getDeviceBadgeVariant(deviceStatus: string): BadgeVariant {
  if (deviceStatus === 'needs_retrieval') return 'needs_retrieval';
  return 'assigned';
}

/**
 * A single vessel row for the table/list view.
 *
 * Renders as a block-level Link to keep valid HTML.
 * Mobile: compact two-line list item.
 * Tablet/Desktop: flex row mimicking table columns — aligned via CSS grid on the parent.
 */
export function VesselRow({ vessel, showAgent = false }: VesselRowProps) {
  const today = todayString();
  const isUrgent = vessel.status === 'sailing' && vessel.device !== null;
  const statusVariant = getStatusBadgeVariant(vessel);

  const timeDisplay =
    vessel.status === 'arriving'
      ? formatArrivalDisplay(
          vessel.arrival_date,
          vessel.arrival_time,
          vessel.arrival_time_display,
          today
        )
      : vessel.status === 'in_port' || vessel.status === 'at_anchor'
      ? vessel.sailing_date || vessel.sailing_time
        ? formatSailingDisplay(
            vessel.sailing_date,
            vessel.sailing_time,
            vessel.sailing_time_display,
            vessel.sailing_time_confidence,
            today
          )
        : formatArrivalDisplay(
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
      : '';

  return (
    <Link
      href={`/vessels/${vessel.id}`}
      className={[
        'flex items-stretch border-b border-[#E2E8F0] min-h-[48px]',
        'transition-colors duration-100 hover:bg-[#F8FAFC] focus-visible:outline',
        'focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-[-2px]',
        isUrgent ? 'border-l-4 border-l-crimson bg-[#FEF9F9] hover:bg-[#FEF2F2]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Mobile: compact two-line layout */}
      <div className="flex w-full items-center gap-3 px-3 py-2 md:hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-foreground truncate">
              {vessel.name}
            </span>
            {vessel.is_new && (
              <span className="inline-flex items-center px-1.5 py-0 rounded text-xs font-bold bg-[#0D9488] text-white uppercase shrink-0">
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge variant={statusVariant} className="text-xs" />
            {vessel.terminal && (
              <span className="text-sm text-slate-text truncate">{vessel.terminal}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {vessel.device && (
            <Badge variant={getDeviceBadgeVariant(vessel.device.deviceStatus)} />
          )}
          {vessel.needs_review && (
            <ExclamationTriangleIcon className="w-5 h-5 text-amber" />
          )}
        </div>
      </div>

      {/* Tablet/Desktop: grid columns (grid defined on parent) */}
      <div className="hidden md:flex w-full items-center">
        {/* Vessel name — flex-[2] */}
        <div className="flex-[2] min-w-0 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground truncate">
              {vessel.name}
            </span>
            {vessel.is_new && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-[#0D9488] text-white uppercase shrink-0">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Status — flex-[1.5] */}
        <div className="flex-[1.5] px-4 py-3">
          <Badge variant={statusVariant} />
        </div>

        {/* Terminal — flex-1 */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <span className="text-base text-slate-text truncate block">
            {vessel.terminal ?? '—'}
          </span>
        </div>

        {/* Time — flex-[1.5] */}
        <div className="flex-[1.5] px-4 py-3 min-w-0">
          <span className="text-base text-slate-text truncate block">
            {timeDisplay || '—'}
          </span>
        </div>

        {/* Device — flex-1 */}
        <div className="flex-1 px-4 py-3">
          {vessel.device ? (
            <Badge variant={getDeviceBadgeVariant(vessel.device.deviceStatus)} />
          ) : (
            <span className="text-slate-text">—</span>
          )}
        </div>

        {/* Flags — w-16 */}
        <div className="w-16 px-4 py-3 flex items-center gap-1">
          {vessel.needs_review && (
            <ExclamationTriangleIcon
              className="w-5 h-5 text-amber"
              title={vessel.review_reason ?? 'Needs review'}
            />
          )}
          {vessel.source === 'manual' && (
            <PencilSquareIcon className="w-5 h-5 text-amber" title="Manual entry" />
          )}
        </div>

        {/* Agent — flex-1 (desktop only, when showAgent=true) */}
        {showAgent && (
          <div className="flex-1 px-4 py-3 min-w-0">
            <span className="text-base text-slate-text truncate block">
              {vessel.agent ?? '—'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
