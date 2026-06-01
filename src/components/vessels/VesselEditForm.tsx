'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { VesselDetail } from '@/types/vessel-detail';

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

interface VesselEditFormProps {
  vessel: VesselDetail;
  onSave: (updated: VesselDetail) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
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
  // Convert "HH:MM:SS" or "HH:MM" to "HH:MM"
  return time.slice(0, 5);
}

export function VesselEditForm({ vessel, onSave, onCancel }: VesselEditFormProps) {
  const [form, setForm] = useState<FormState>({
    name: vessel.name,
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

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Build patch body with only changed fields
    const patch: Record<string, string | null> = {};
    if (form.name !== vessel.name) patch.name = form.name.trim();
    if (form.status !== vessel.status) patch.status = form.status;
    if (form.terminal !== (vessel.terminal ?? ''))
      patch.terminal = form.terminal || null;
    if (form.arrival_date !== (vessel.arrival_date ?? ''))
      patch.arrival_date = form.arrival_date || null;
    if (form.arrival_time !== toFormTime(vessel.arrival_time))
      patch.arrival_time = form.arrival_time || null;
    if (form.sailing_date !== (vessel.sailing_date ?? ''))
      patch.sailing_date = form.sailing_date || null;
    if (form.sailing_time !== toFormTime(vessel.sailing_time))
      patch.sailing_time = form.sailing_time || null;
    if (form.agent !== (vessel.agent ?? ''))
      patch.agent = form.agent || null;
    if (form.notes !== (vessel.notes ?? ''))
      patch.notes = form.notes || null;

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    try {
      const res = await fetch(`/api/vessels/${vessel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
      }

      const updated = await res.json();
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Input
        label="Vessel Name"
        value={form.name}
        onChange={(e) => setField('name', e.target.value)}
        placeholder="Enter vessel name"
        required
      />

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
          label="Arrival Time (24h)"
          type="time"
          value={form.arrival_time}
          onChange={(e) => setField('arrival_time', e.target.value)}
          placeholder="e.g. 13:00"
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
          label="Sailing Time (24h)"
          type="time"
          value={form.sailing_time}
          onChange={(e) => setField('sailing_time', e.target.value)}
          placeholder="e.g. 23:00"
        />
      </div>

      <Input
        label="Agent / Shipping Line"
        value={form.agent}
        onChange={(e) => setField('agent', e.target.value)}
        placeholder="e.g. Gulf Copper & Manufacturing"
      />

      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => setField('notes', e.target.value)}
        placeholder="Internal notes about this vessel visit"
        maxLength={500}
      />

      {/* Override warning */}
      <div className="flex items-start gap-2 rounded-md bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2.5">
        <ExclamationTriangleIcon
          className="h-4 w-4 text-amber shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-sm text-[#78350F]">
          Saving will mark this record as manually edited. Future Pilot Report updates will be
          flagged for your review.
        </p>
      </div>

      {/* API error */}
      {error && (
        <p role="alert" className="text-sm text-crimson flex items-center gap-1.5">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
        <Button variant="secondary" onClick={onCancel} type="button" disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving} type="button">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
