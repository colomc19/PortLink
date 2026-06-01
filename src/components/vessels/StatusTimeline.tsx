'use client';

import type { StatusHistoryEntry } from '@/types/vessel-detail';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
  currentStatus: string;
}

const STATUS_LABELS: Record<string, string> = {
  arriving: 'Arriving',
  in_port: 'In Port',
  at_anchor: 'At Anchor',
  sailing: 'Sailing',
  sailed: 'Sailed',
  cancelled: 'Cancelled',
};

const SOURCE_LABELS: Record<string, string> = {
  pilot_report: 'Pilot Report',
  manual: 'Manual Entry',
  system: 'System',
  scraper: 'Harbor Master',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function StatusTimeline({ history, currentStatus }: StatusTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">No status history available.</p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-0" aria-label="Status history">
      {history.map((entry, index) => {
        const isFirst = index === 0;
        const isLast = index === history.length - 1;
        const isCurrent = isFirst && entry.status === currentStatus;
        const label = STATUS_LABELS[entry.status] ?? entry.status;
        const sourceLabel = SOURCE_LABELS[entry.source] ?? entry.source;

        return (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className="absolute left-[9px] top-5 bottom-0 w-px bg-[#E2E8F0]"
                aria-hidden="true"
              />
            )}

            {/* Dot */}
            <div className="relative z-10 shrink-0 mt-0.5" aria-hidden="true">
              {isCurrent ? (
                <div className="w-5 h-5 rounded-full bg-navy flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[#CBD5E1] bg-white" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={[
                    'text-sm font-semibold',
                    isCurrent ? 'text-navy' : 'text-foreground',
                  ].join(' ')}
                >
                  {label}
                </span>
                {isCurrent && (
                  <span className="text-xs font-medium uppercase tracking-wider text-white bg-navy px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatTimestamp(entry.changed_at)} &middot; {sourceLabel}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
