'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { todayString } from '@/lib/format-time';

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
  { value: 'sailing', label: 'Sailing' },
] as const;

interface FormState {
  name: string;
  date: string;
  time: string;
  status: string;
  terminal: string;
  agent: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  date?: string;
  status?: string;
  notes?: string;
}

const NOTES_MAX = 500;

export function VesselEntryForm() {
  const router = useRouter();
  const today = todayString();
  const firstErrorRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    date: today,
    time: '',
    status: 'in_port',
    terminal: '',
    agent: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field if it had one
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FormErrors];
        return next;
      });
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!form.name.trim()) {
      errs.name = 'Vessel name is required.';
    }

    if (!form.status) {
      errs.status = 'Status is required.';
    }

    if (form.notes.length > NOTES_MAX) {
      errs.notes = `Notes must be ${NOTES_MAX} characters or fewer.`;
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      setTimeout(() => {
        firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/vessels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          date: form.date || null,
          time: form.time || null,
          status: form.status,
          terminal: form.terminal || null,
          agent: form.agent || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`);
      }

      const vessel = await res.json();
      router.push(`/vessels/${vessel.id}`);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Scroll target for first error */}
      <div ref={firstErrorRef} />

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-[#FEF2F2] border border-[#FECACA] px-3 py-2.5"
        >
          <ExclamationTriangleIcon
            className="h-4 w-4 text-crimson shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-crimson">{serverError}</p>
        </div>
      )}

      <Input
        label="Vessel Name"
        id="vessel-name"
        value={form.name}
        onChange={(e) => setField('name', e.target.value)}
        placeholder="e.g. MV ATLANTIC CARRIER"
        required
        error={errors.name}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          id="vessel-date"
          type="date"
          value={form.date}
          onChange={(e) => setField('date', e.target.value)}
          error={errors.date}
        />
        <Input
          label="Time (optional)"
          id="vessel-time"
          type="time"
          value={form.time}
          onChange={(e) => setField('time', e.target.value)}
          placeholder="e.g. 13:00"
        />
      </div>

      <Select
        label="Status"
        id="vessel-status"
        value={form.status}
        onChange={(e) => setField('status', e.target.value)}
        error={errors.status}
        required
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <Select
        label="Terminal (optional)"
        id="vessel-terminal"
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

      <Input
        label="Agent / Shipping Line (optional)"
        id="vessel-agent"
        value={form.agent}
        onChange={(e) => setField('agent', e.target.value)}
        placeholder="e.g. Gulf Copper & Manufacturing"
      />

      <div className="flex flex-col gap-1">
        <Textarea
          label="Notes (optional)"
          id="vessel-notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Internal notes about this vessel visit"
          maxLength={NOTES_MAX}
          error={errors.notes}
        />
        <p className="text-xs text-slate-400 text-right">
          {form.notes.length}/{NOTES_MAX}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-[#E2E8F0]">
        <Button
          variant="secondary"
          type="button"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          Save Vessel
        </Button>
      </div>
    </form>
  );
}
