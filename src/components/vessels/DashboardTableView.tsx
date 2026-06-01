'use client';

import { useState } from 'react';
import {
  MapPinIcon,
  ArrowRightCircleIcon,
  ArrowUpRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid';
import { EmptyState } from '@/components/ui/EmptyState';
import { VesselRow } from './VesselRow';
import { UpdateIndicator } from './UpdateIndicator';
import type { VesselGroups, VesselSummary } from '@/types/vessels';

interface DashboardTableViewProps {
  groups: VesselGroups;
  lastUpdated: Date | null;
}

type SortField = 'name' | 'status' | 'terminal' | 'time' | 'device' | 'agent';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField;
  dir: SortDir;
}

function getTimeKey(vessel: VesselSummary): string {
  const sailKey =
    vessel.sailing_date && vessel.sailing_time
      ? `${vessel.sailing_date} ${vessel.sailing_time}`
      : vessel.sailing_date ?? '';
  const arrKey =
    vessel.arrival_date && vessel.arrival_time
      ? `${vessel.arrival_date} ${vessel.arrival_time}`
      : vessel.arrival_date ?? '';

  if (vessel.status === 'sailing' || vessel.status === 'sailed') return sailKey;
  if (vessel.status === 'in_port' || vessel.status === 'at_anchor')
    return sailKey || arrKey;
  return arrKey;
}

function sortVessels(vessels: VesselSummary[], sort: SortState): VesselSummary[] {
  return [...vessels].sort((a, b) => {
    let cmp = 0;
    switch (sort.field) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'terminal':
        cmp = (a.terminal ?? '').localeCompare(b.terminal ?? '');
        break;
      case 'time':
        cmp = getTimeKey(a).localeCompare(getTimeKey(b));
        break;
      case 'device':
        cmp = (a.device ? 0 : 1) - (b.device ? 0 : 1);
        break;
      case 'agent':
        cmp = (a.agent ?? '').localeCompare(b.agent ?? '');
        break;
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}

interface ColumnHeaderProps {
  field: SortField;
  sort: SortState;
  onSort: (f: SortField) => void;
  className?: string;
  children: React.ReactNode;
}

function ColumnHeader({ field, sort, onSort, className = '', children }: ColumnHeaderProps) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={[
        'flex items-center gap-1 px-4 py-2.5 text-left text-sm font-semibold',
        'select-none whitespace-nowrap cursor-pointer',
        'hover:text-navy transition-colors duration-100',
        active ? 'text-navy' : 'text-slate-text',
        className,
      ].join(' ')}
    >
      {children}
      {active ? (
        sort.dir === 'asc' ? (
          <ChevronUpIcon className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-3.5 h-3.5 shrink-0" />
        )
      ) : (
        <span className="inline-flex flex-col opacity-30 shrink-0">
          <ChevronUpIcon className="w-3 h-3 -mb-0.5" />
          <ChevronDownIcon className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

interface HeaderRowProps {
  sort: SortState;
  onSort: (f: SortField) => void;
  showAgent: boolean;
}

function HeaderRow({ sort, onSort, showAgent }: HeaderRowProps) {
  return (
    <div
      className="hidden md:flex items-stretch bg-white border-b border-[#E2E8F0] sticky top-0 z-[5]"
      role="row"
      aria-hidden="false"
    >
      <ColumnHeader field="name" sort={sort} onSort={onSort} className="flex-[2] min-w-0">
        Vessel
      </ColumnHeader>
      <ColumnHeader field="status" sort={sort} onSort={onSort} className="flex-[1.5]">
        Status
      </ColumnHeader>
      <ColumnHeader field="terminal" sort={sort} onSort={onSort} className="flex-1 min-w-0">
        Terminal
      </ColumnHeader>
      <ColumnHeader field="time" sort={sort} onSort={onSort} className="flex-[1.5] min-w-0">
        Time
      </ColumnHeader>
      <ColumnHeader field="device" sort={sort} onSort={onSort} className="flex-1">
        Device
      </ColumnHeader>
      <div className="w-16 px-4 py-2.5 text-sm font-semibold text-slate-text">
        Flags
      </div>
      {showAgent && (
        <ColumnHeader field="agent" sort={sort} onSort={onSort} className="flex-1 min-w-0">
          Agent
        </ColumnHeader>
      )}
    </div>
  );
}

interface SectionBlockProps {
  icon: React.ReactNode;
  title: string;
  vessels: VesselSummary[];
  emptyMessage: string;
  sort: SortState;
  onSort: (field: SortField) => void;
  showAgent: boolean;
  lastUpdated: Date | null;
  urgent?: boolean;
}

function SectionBlock({
  icon,
  title,
  vessels,
  emptyMessage,
  sort,
  onSort,
  showAgent,
  lastUpdated,
  urgent,
}: SectionBlockProps) {
  const sorted = sortVessels(vessels, sort);

  return (
    <section aria-label={title}>
      {/* Section header */}
      <div
        className={[
          'sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2',
          'border-b border-[#E2E8F0]',
          urgent ? 'bg-[#FEF2F2]' : 'bg-[#F1F5F9]',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span
            className={[
              '[&>svg]:w-5 [&>svg]:h-5',
              urgent ? 'text-crimson' : 'text-navy',
            ].join(' ')}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span
            className={[
              'text-sm font-bold uppercase tracking-wide',
              urgent ? 'text-crimson' : 'text-navy',
            ].join(' ')}
          >
            {title}{' '}
            <span className="font-normal normal-case tracking-normal text-slate-text">
              ({vessels.length})
            </span>
          </span>
        </div>
        <UpdateIndicator lastUpdated={lastUpdated} />
      </div>

      {/* Column headers (tablet+) */}
      {vessels.length > 0 && (
        <HeaderRow sort={sort} onSort={onSort} showAgent={showAgent} />
      )}

      {/* Rows */}
      {vessels.length === 0 ? (
        <EmptyState title={emptyMessage} className="py-8" />
      ) : (
        <div role="rowgroup">
          {sorted.map((vessel) => (
            <VesselRow key={vessel.id} vessel={vessel} showAgent={showAgent} />
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardTableView({ groups, lastUpdated }: DashboardTableViewProps) {
  const [sort, setSort] = useState<SortState>({ field: 'time', dir: 'asc' });

  function handleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    );
  }

  const sailingUrgent = groups.sailing.some((v) => v.device !== null);

  return (
    <div
      className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0]"
      role="table"
      aria-label="Vessel list"
    >
      <SectionBlock
        icon={<MapPinIcon />}
        title="In Port"
        vessels={groups.inPort}
        emptyMessage="No vessels currently in port."
        sort={sort}
        onSort={handleSort}
        showAgent={true}
        lastUpdated={lastUpdated}
      />
      <SectionBlock
        icon={<ArrowRightCircleIcon />}
        title="Arriving"
        vessels={groups.arriving}
        emptyMessage="No arrivals scheduled for today."
        sort={sort}
        onSort={handleSort}
        showAgent={true}
        lastUpdated={lastUpdated}
      />
      <SectionBlock
        icon={<ArrowUpRightIcon />}
        title="Sailing"
        vessels={groups.sailing}
        emptyMessage="No departures today. All devices are safe."
        sort={sort}
        onSort={handleSort}
        showAgent={true}
        lastUpdated={lastUpdated}
        urgent={sailingUrgent}
      />
    </div>
  );
}
