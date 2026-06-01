'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VesselCard } from './VesselCard';
import { UpdateIndicator } from './UpdateIndicator';
import type { VesselSummary } from '@/types/vessels';

export type SectionVariant = 'inPort' | 'arriving' | 'sailing';

interface VesselSectionProps {
  title: string;
  icon: ReactNode;
  count: number;
  vessels: VesselSummary[];
  variant: SectionVariant;
  lastUpdated: Date | null;
}

const EMPTY_STATE: Record<SectionVariant, { title: string }> = {
  inPort: { title: 'No vessels currently in port.' },
  arriving: { title: 'No arrivals scheduled for today.' },
  sailing: { title: 'No departures today. All devices are safe.' },
};

/**
 * Returns true when the sailing section has at least one vessel with a device.
 * This triggers the crimson urgent header style.
 */
function sailingHasDevice(vessels: VesselSummary[]): boolean {
  return vessels.some((v) => v.device !== null);
}

export function VesselSection({
  title,
  icon,
  count,
  vessels,
  variant,
  lastUpdated,
}: VesselSectionProps) {
  const isUrgentSailing = variant === 'sailing' && sailingHasDevice(vessels);
  const emptyState = EMPTY_STATE[variant];

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      {/* Sticky section header */}
      <div
        className={[
          'sticky top-0 z-10 flex items-center justify-between gap-2',
          'px-1 py-2 rounded-sm',
          isUrgentSailing
            ? 'bg-[#FEF2F2]'
            : 'bg-background',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span
            className={[
              '[&>svg]:w-5 [&>svg]:h-5',
              isUrgentSailing ? 'text-crimson' : 'text-navy',
            ].join(' ')}
            aria-hidden="true"
          >
            {icon}
          </span>
          <h2
            className={[
              'text-base font-bold uppercase tracking-wide',
              isUrgentSailing ? 'text-crimson' : 'text-navy',
            ].join(' ')}
          >
            {title}{' '}
            <span className="font-normal normal-case tracking-normal text-slate-text">
              ({count})
            </span>
          </h2>
        </div>
        <UpdateIndicator lastUpdated={lastUpdated} />
      </div>

      {/* Vessel list or empty state */}
      {vessels.length === 0 ? (
        <EmptyState title={emptyState.title} className="py-8" />
      ) : (
        <div className="flex flex-col gap-3">
          {vessels.map((vessel) => (
            <VesselCard key={vessel.id} vessel={vessel} />
          ))}
        </div>
      )}
    </section>
  );
}
