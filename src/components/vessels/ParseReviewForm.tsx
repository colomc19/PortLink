'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RawSourceSection } from '@/components/vessels/RawSourceSection';
import type { VesselDetail, PilotReportRowSummary } from '@/types/vessel-detail';

const TERMINAL_OPTIONS = [
  'Coal Dock',
  'Mobile Container Terminal (South)',
  'Cooper Marine Terminal (North/South Dock)',
  'Plains',
  'Pier 2',
  'Pier 7',
  'Rail Dock',
  'Pinto Island Terminal',
  'North B3',
  'South C2',
  'Vertex Blakely Terminal (Shell)',
  'Core (east end)',
  'ACT',
  'Middle Bay Port',
  'Other',
] as const;

const STATUS_OPTIONS = [
  { value: 'arriving', label: 'Arriving' },
  { value: 'in_port', label: 'In Port' },
  { value: 'at_anchor', label: 'At Anchor' },
  { value: 'sailing', label: 'Sailing' },
  { value: 'sailed', label: 'Sailed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

interface ParseReviewFormProps {
  vessel: VesselDetail;
  onSaved: (updated: VesselDetail) => void;
  onSkip: () => void;
}

interface FormState {
  status: string;
  terminal: string;
  arrival_date: string;
  arrival_time: string;
  sailing_date: string;
  sailing_time: string;
  agent: string;
  notes: string;
}

function toFormTime(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

export function ParseReviewForm({ vessel, onSaved, onSkip }: ParseReviewFormProps) {
  const reviewRows: PilotReportRowSummary[] = vessel.pilot_report_rows.filter(
    (r) => r.needs_review
  );

  const [form, setForm] = useState<FormState>({
    status: vessel.status,
    terminal: vessel.terminal ?? '',
    arrival_date: vessel.arrival_date ?? '',
    arrival_time: toFormTime(vessel.arrival_time),
    sailing_date: vessel.sailing_date ?? '',
    sailing_time: toFormTime(vessel.sailing_time),
    agent: vessel.agent ?? '',
    notes: vessel.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveAndResolve() {
    setSaving(true);
    setError(null);

    const patch: Record<string, string | null> = {
      status: form.status,
      terminal: form.terminal || null,
      arrival_date: form.arrival_date || null,
      arrival_time: form.arrival_time || null,
      sailing_date: form.sailing_date || null,
      sailing_time: form.sailing_time || null,
      agent: form.agent || null,
      notes: form.notes || null,
    };

    try {
      // Save vessel fields
      const patchRes = await fetch(`/api/vessels/${vessel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Request failed: ${patchRes.status}`);
      }

      const updated = await patchRes.json();

      // Mark as reviewed
      const resolveRes = await fetch(`/api/vessels/${vessel.id}/resolve-review`, {
        method: 'PATCH',
      });

      if (!resolveRes.ok) {
        // Non-fatal — vessel was saved; log but continue
        console.warn('[ParseReviewForm] resolve-review failed');
      }

      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Review reason banner */}
      {vessel.review_reason && (
        <div className="flex items-start gap-2 rounded-md bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5">
          <ExclamationTriangleIcon
            className="h-4 w-4 text-amber shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-[#78350F]">{vessel.review_reason}</p>
        </div>
      )}

      {/* Raw source for reference */}
      {reviewRows.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Raw source</p>
          <RawSourceSection rows={reviewRows} />
        </div>
      )}

      {/* Correctable fields */}
      <div className="space-y-4">
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setField('status', e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          label="Terminal"
          value={form.terminal}
          onChange={(e) => setField('terminal', e.target.value)}
        >
          <option value="">— Not specified —</option>
          {TERMINAL_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Arrival Date"
            type="date"
            value={form.arrival_date}
            onChange={(e) => setField('arrival_date', e.target.value)}
          />
          <Input
            label="Arrival Time"
            type="time"
            value={form.arrival_time}
            onChange={(e) => setField('arrival_time', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Sailing Date"
            type="date"
            value={form.sailing_date}
            onChange={(e) => setField('sailing_date', e.target.value)}
          />
          <Input
            label="Sailing Time"
            type="time"
            value={form.sailing_time}
            onChange={(e) => setField('sailing_time', e.target.value)}
          />
        </div>

        <Input
          label="Agent / Shipping Line"
          value={form.agent}
          onChange={(e) => setField('agent', e.target.value)}
        />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          maxLength={500}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-crimson flex items-center gap-1.5">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onSkip} type="button" disabled={saving}>
          Skip for Now
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveAndResolve}
          loading={saving}
          type="button"
        >
          Save &amp; Mark Reviewed
        </Button>
      </div>
    </div>
  );
}
