'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CheckIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { IngestionStatus, IngestionEvent, IngestionStatusResponse } from '@/app/api/admin/ingestion-status/route';

interface IngestionStatusProps {
  initialData: IngestionStatusResponse;
}

function StatusIndicator({ status }: { status: IngestionStatus }) {
  if (status === 'active') {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-forest" />
        </span>
        <span className="text-sm font-semibold text-forest">Active</span>
      </div>
    );
  }
  if (status === 'warning') {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber" />
        </span>
        <span className="text-sm font-semibold text-amber">Warning</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="relative inline-flex rounded-full h-3 w-3 bg-crimson" />
      </span>
      <span className="text-sm font-semibold text-crimson">Inactive</span>
    </div>
  );
}

function StatusIcon({ status }: { status: IngestionStatus }) {
  if (status === 'active') return <CheckCircleIcon className="h-5 w-5 text-forest" />;
  if (status === 'warning') return <ExclamationTriangleIcon className="h-5 w-5 text-amber" />;
  return <XCircleIcon className="h-5 w-5 text-crimson" />;
}

function EventIcon({ eventType }: { eventType: string }) {
  const lower = eventType.toLowerCase();
  if (lower.includes('receiv') || lower.includes('email') || lower.includes('ingest')) {
    return <EnvelopeIcon className="h-4 w-4 text-slate-400 shrink-0" />;
  }
  if (lower.includes('success') || lower.includes('parsed') || lower.includes('complete')) {
    return <CheckIcon className="h-4 w-4 text-forest shrink-0" />;
  }
  if (lower.includes('error') || lower.includes('fail')) {
    return <ExclamationCircleIcon className="h-4 w-4 text-crimson shrink-0" />;
  }
  return <InformationCircleIcon className="h-4 w-4 text-slate-400 shrink-0" />;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  // Display in Central Time via toLocaleString
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatLastReport(ts: string | null): string {
  if (!ts) return 'Never';

  const now = Date.now();
  const reportTime = new Date(ts).getTime();
  const diffMs = now - reportTime;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 8) {
    const h = Math.floor(diffHours);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
  }

  // More than 8 hours: show absolute time in Central
  return new Date(ts).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function IngestionStatus({ initialData }: IngestionStatusProps) {
  const [data, setData] = useState<IngestionStatusResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/admin/ingestion-status');
      if (!res.ok) throw new Error('Failed to refresh');
      const fresh: IngestionStatusResponse = await res.json();
      setData(fresh);
    } catch {
      setRefreshError('Could not refresh status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const showAlert = data.status !== 'active';

  return (
    <div className="flex flex-col gap-4">
      {/* Status summary card */}
      <div className="rounded-md border border-slate-200 bg-white p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusIcon status={data.status} />
            <span className="font-semibold text-foreground text-sm">Pilot Report Pipeline</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusIndicator status={data.status} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh ingestion status"
            >
              <ArrowPathIcon className={['h-4 w-4', refreshing ? 'animate-spin' : ''].join(' ')} />
            </button>
          </div>
        </div>

        {refreshError && (
          <p className="text-sm text-crimson">{refreshError}</p>
        )}

        {showAlert && (
          <div
            className={[
              'rounded-md px-3 py-2 text-sm font-medium',
              data.status === 'warning'
                ? 'bg-amber/10 text-dark-amber border border-amber/20'
                : 'bg-red-50 text-crimson border border-red-200',
            ].join(' ')}
          >
            {data.status === 'warning'
              ? 'No Pilot Report received in the last 8 hours. Vessel data may be stale.'
              : 'No Pilot Report received in over 24 hours. Check SendGrid and email routing.'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last Report</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {formatLastReport(data.lastReportAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reports Today</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{data.reportsToday}</p>
          </div>
        </div>
      </div>

      {/* Recent events timeline */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-2">Recent Events</h3>

        {data.recentEvents.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No ingestion events recorded yet.</p>
        ) : (
          <div className="rounded-md border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {data.recentEvents.map((event: IngestionEvent) => (
              <div key={event.id} className="flex items-start gap-3 bg-white px-4 py-2.5">
                <div className="mt-0.5">
                  <EventIcon eventType={event.event_type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatTimestamp(event.created_at)}
                    </span>
                  </div>
                  {event.details && Object.keys(event.details).length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {Object.entries(event.details)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
