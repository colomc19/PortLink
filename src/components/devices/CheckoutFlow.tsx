'use client';

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { VesselPicker } from './VesselPicker';
import { DevicePicker } from './DevicePicker';
import type { VesselSummary } from '@/types/vessels';
import type { DeviceSummary } from '@/types/devices';

type Step = 'vessel' | 'device' | 'confirm';

interface CheckoutFlowProps {
  preselectedVesselId?: string;
  preselectedDeviceId?: string;
  onComplete: () => void;
  onClose: () => void;
}

const STEP_TITLES: Record<Step, string> = {
  vessel: 'Select Vessel',
  device: 'Select Device',
  confirm: 'Confirm Assignment',
};

export function CheckoutFlow({
  preselectedVesselId,
  preselectedDeviceId,
  onComplete,
  onClose,
}: CheckoutFlowProps) {
  // Determine initial step based on what's preselected
  const initialStep: Step =
    preselectedVesselId && preselectedDeviceId
      ? 'confirm'
      : preselectedVesselId
        ? 'device'
        : preselectedDeviceId
          ? 'vessel'
          : 'vessel';

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(
    preselectedVesselId ?? null
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    preselectedDeviceId ?? null
  );

  const [vesselName, setVesselName] = useState<string | null>(null);
  const [deviceNumber, setDeviceNumber] = useState<number | null>(null);
  const [vesselTerminal, setVesselTerminal] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve display names when IDs are preselected or chosen
  const resolveVesselInfo = useCallback(async (vesselId: string) => {
    try {
      const res = await fetch('/api/vessels', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { inPort: VesselSummary[]; arriving: VesselSummary[]; sailing: VesselSummary[] };
      const all = [...(data.inPort ?? []), ...(data.arriving ?? []), ...(data.sailing ?? [])];
      const found = all.find((v) => v.id === vesselId);
      if (found) {
        setVesselName(found.name);
        setVesselTerminal(found.terminal);
      }
    } catch {
      // Non-critical
    }
  }, []);

  const resolveDeviceInfo = useCallback(async (deviceId: string) => {
    try {
      const res = await fetch('/api/devices', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as DeviceSummary[];
      const found = data.find((d) => d.id === deviceId);
      if (found) setDeviceNumber(found.device_number);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    if (preselectedVesselId) resolveVesselInfo(preselectedVesselId);
  }, [preselectedVesselId, resolveVesselInfo]);

  useEffect(() => {
    if (preselectedDeviceId) resolveDeviceInfo(preselectedDeviceId);
  }, [preselectedDeviceId, resolveDeviceInfo]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleVesselSelected(vesselId: string) {
    setSelectedVesselId(vesselId);
  }

  function handleVesselNext() {
    if (!selectedVesselId) return;
    // Fetch vessel name for display
    resolveVesselInfo(selectedVesselId);
    if (preselectedDeviceId) {
      setStep('confirm');
    } else {
      setStep('device');
    }
  }

  function handleDeviceSelected(deviceId: string) {
    setSelectedDeviceId(deviceId);
  }

  function handleDeviceNext() {
    if (!selectedDeviceId) return;
    resolveDeviceInfo(selectedDeviceId);
    setStep('confirm');
  }

  function handleBack() {
    if (step === 'confirm') {
      if (preselectedDeviceId && !preselectedVesselId) {
        setStep('vessel');
      } else if (preselectedVesselId && !preselectedDeviceId) {
        setStep('device');
      } else {
        setStep('device');
      }
    } else if (step === 'device') {
      setStep('vessel');
    }
  }

  async function handleConfirm() {
    if (!selectedVesselId || !selectedDeviceId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vesselId: selectedVesselId }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Assignment failed');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  }

  const canProceedVessel = !!selectedVesselId;
  const canProceedDevice = !!selectedDeviceId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-[520px] bg-white rounded-t-xl md:rounded-xl shadow-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          {step !== initialStep && (
            <button
              onClick={handleBack}
              className="p-1 rounded text-slate-500 hover:text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}
          <h2 id="checkout-modal-title" className="text-lg font-bold text-foreground flex-1">
            {STEP_TITLES[step]}
          </h2>

          {/* Step indicator */}
          <span className="text-sm text-slate-400 font-medium">
            {step === 'vessel' ? '1' : step === 'device' ? '2' : '3'} / 3
          </span>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'vessel' && (
            <VesselPicker
              selectedVesselId={selectedVesselId}
              onSelect={handleVesselSelected}
            />
          )}

          {step === 'device' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">
                Select an available device to assign to{' '}
                <span className="font-semibold text-foreground">
                  {vesselName ?? 'this vessel'}
                </span>
                .
              </p>
              <DevicePicker
                selectedDeviceId={selectedDeviceId}
                onSelect={handleDeviceSelected}
              />
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-[#F8FAFC] border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">Vessel</span>
                  <span className="font-semibold text-foreground">
                    {vesselName ?? selectedVesselId}
                  </span>
                </div>
                {vesselTerminal && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Terminal</span>
                    <span className="text-foreground">{vesselTerminal}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">Device</span>
                  <span className="font-semibold text-foreground">
                    Device {deviceNumber ?? '—'}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-crimson font-medium" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>

          {step === 'vessel' && (
            <Button
              variant="primary"
              onClick={handleVesselNext}
              disabled={!canProceedVessel}
              type="button"
            >
              Next: Select Device
            </Button>
          )}

          {step === 'device' && (
            <Button
              variant="primary"
              onClick={handleDeviceNext}
              disabled={!canProceedDevice}
              type="button"
            >
              Next: Confirm
            </Button>
          )}

          {step === 'confirm' && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={submitting}
              disabled={submitting}
              type="button"
            >
              Assign Device
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
