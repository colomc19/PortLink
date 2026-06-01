'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import type { PilotReportRowSummary } from '@/types/vessel-detail';

interface RawSourceSectionProps {
  rows: PilotReportRowSummary[];
}

function buildRawText(row: PilotReportRowSummary): string {
  const parts: string[] = [];

  parts.push(`Vessel: ${row.raw_vessel_name}`);
  if (row.section) parts.push(`Section: ${row.section}`);
  if (row.raw_date) parts.push(`Date: ${row.raw_date}`);
  if (row.raw_time_status) parts.push(`Time/Status: ${row.raw_time_status}`);
  if (row.raw_terminal) parts.push(`Terminal: ${row.raw_terminal}`);
  if (row.raw_agent) parts.push(`Agent: ${row.raw_agent}`);
  if (row.raw_notes) parts.push(`Notes: ${row.raw_notes}`);

  return parts.join('\n');
}

export function RawSourceSection({ rows }: RawSourceSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-[#F8FAFC] transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-[-2px]"
        aria-expanded={expanded}
      >
        <span>
          View raw Pilot Report{rows.length > 1 ? ` (${rows.length} rows)` : ''}
        </span>
        {expanded ? (
          <ChevronDownIcon className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 space-y-4">
          {rows.map((row, idx) => (
            <div key={row.id}>
              {rows.length > 1 && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Row {idx + 1} &mdash; {row.section}
                </p>
              )}
              <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {buildRawText(row)}
              </pre>
              {row.needs_review && row.review_reason && (
                <p className="mt-1 text-xs text-[#78350F] italic">
                  Review note: {row.review_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
