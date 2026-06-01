'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';

interface CheckinConfirmationProps {
  deviceId: string;
  deviceNumber: number;
  vesselName: string;
  onComplete: () => void;
  onClose: () => void;
}

export function CheckinConfirmation({
  deviceId,
  deviceNumber,
  vesselName,
  onComplete,
  onClose,
}: CheckinConfirmationProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/devices/${deviceId}/checkin`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Check-in failed');
      }

      setSuccess(true);
      // Brief pause to show success message, then notify parent
      setTimeout(() => {
        onComplete();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!submitting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-xl md:rounded-xl shadow-lg p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2 id="checkin-modal-title" className="text-lg font-bold text-foreground">
            Confirm Retrieval
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-slate-500 hover:text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-40"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4" role="status">
            <CheckCircleIcon className="h-12 w-12 text-forest" aria-hidden="true" />
            <p className="text-base font-semibold text-foreground text-center">
              Device {deviceNumber} retrieved.
            </p>
            <p className="text-sm text-slate-500 text-center">
              All pending alerts cancelled.
            </p>
          </div>
        ) : (
          <>
            {/* Confirmation message */}
            <p className="text-base text-slate-700">
              Confirm retrieval of{' '}
              <span className="font-semibold text-foreground">
                Device {deviceNumber}
              </span>{' '}
              from{' '}
              <span className="font-semibold text-foreground">{vesselName}</span>?
            </p>

            {/* Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-5 w-5 rounded border-2 border-slate-300 text-navy cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 accent-navy"
                aria-describedby="checkin-checkbox-label"
              />
              <span
                id="checkin-checkbox-label"
                className="text-sm font-medium text-slate-700 group-hover:text-foreground"
              >
                I have Device {deviceNumber} in hand.
              </span>
            </label>

            {error && (
              <p className="text-sm text-crimson font-medium" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="urgent"
                onClick={handleConfirm}
                loading={submitting}
                disabled={!confirmed || submitting}
                type="button"
              >
                Confirm Retrieved
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
