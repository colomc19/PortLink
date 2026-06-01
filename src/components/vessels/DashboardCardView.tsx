'use client';

import {
  MapPinIcon,
  ArrowRightCircleIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/solid';
import { VesselSection } from './VesselSection';
import type { VesselGroups } from '@/types/vessels';

interface DashboardCardViewProps {
  groups: VesselGroups;
  lastUpdated: Date | null;
}

export function DashboardCardView({ groups, lastUpdated }: DashboardCardViewProps) {
  return (
    <div
      className={[
        // Mobile: single column stacked
        'flex flex-col gap-8',
        // Tablet: In Port + Arriving side by side, Sailing full width below
        'md:grid md:grid-cols-2 md:gap-6',
        // Desktop: three equal columns
        'lg:grid-cols-3',
      ].join(' ')}
    >
      {/* In Port */}
      <div className="md:col-span-1">
        <VesselSection
          title="In Port"
          icon={<MapPinIcon />}
          count={groups.inPort.length}
          vessels={groups.inPort}
          variant="inPort"
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Arriving */}
      <div className="md:col-span-1">
        <VesselSection
          title="Arriving"
          icon={<ArrowRightCircleIcon />}
          count={groups.arriving.length}
          vessels={groups.arriving}
          variant="arriving"
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Sailing — full width on tablet, third column on desktop */}
      <div className="md:col-span-2 lg:col-span-1">
        <VesselSection
          title="Sailing"
          icon={<ArrowUpRightIcon />}
          count={groups.sailing.length}
          vessels={groups.sailing}
          variant="sailing"
          lastUpdated={lastUpdated}
        />
      </div>
    </div>
  );
}
