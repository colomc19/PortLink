'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import type { VesselSummary } from '@/types/vessels';

interface VesselPickerProps {
  selectedVesselId: string | null;
  onSelect: (vesselId: string) => void;
}

const ACTIVE_STATUSES = ['in_port', 'at_anchor', 'arriving'];

export function VesselPicker({ selectedVesselId, onSelect }: VesselPickerProps) {
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVessels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vessels', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load vessels');
      const data = (await res.json()) as { inPort: VesselSummary[]; arriving: VesselSummary[]; sailing: VesselSummary[] };
      const active = [
        ...(data.inPort ?? []),
        ...(data.arriving ?? []),
      ].filter((v) => ACTIVE_STATUSES.includes(v.status));
      setVessels(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vessels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  const filtered = query.trim()
    ? vessels.filter((v) =>
        v.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : vessels;

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-crimson flex items-center gap-1">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search vessels..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[44px] pl-9 pr-3 rounded-md border-2 border-[#CBD5E1] bg-white text-base text-foreground focus:border-[#2C5282] focus:outline-none placeholder:text-slate-400"
          aria-label="Search vessels"
        />
      </div>

      {/* Vessel list */}
      <div
        className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto"
        role="listbox"
        aria-label="Select a vessel"
      >
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No vessels found</p>
        )}

        {filtered.map((vessel) => {
          const isSelected = vessel.id === selectedVesselId;
          const isSailing = vessel.status === 'sailing';

          return (
            <button
              key={vessel.id}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(vessel.id)}
              className={[
                'flex flex-col gap-0.5 w-full text-left px-3 py-2.5 rounded-lg border-2 transition-colors duration-100 cursor-pointer',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy',
                isSelected
                  ? 'border-navy bg-navy/5'
                  : 'border-[#CBD5E1] bg-white hover:border-bay-blue hover:bg-[#EFF6FF]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{vessel.name}</span>
                {isSailing && (
                  <ExclamationTriangleIcon
                    className="h-4 w-4 text-amber shrink-0"
                    aria-label="Vessel is sailing"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {vessel.terminal && <span>{vessel.terminal}</span>}
                <span className="capitalize">{vessel.status.replace('_', ' ')}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
