'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { UsersIcon } from '@heroicons/react/24/outline';
import type { AlertRecipientSummary } from '@/app/api/admin/alert-recipients/route';

interface AlertRecipientListProps {
  initialRecipients: AlertRecipientSummary[];
}

interface ToggleState {
  [profileId: string]: boolean; // optimistic values
}

interface LoadingState {
  [profileId: string]: boolean;
}

function Toggle({
  checked,
  disabled,
  loading,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  loading: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked && !loading ? 'bg-navy' : 'bg-slate-200',
        loading ? 'opacity-60' : '',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow',
          'transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

export function AlertRecipientList({ initialRecipients }: AlertRecipientListProps) {
  const [recipients, setRecipients] = useState<AlertRecipientSummary[]>(initialRecipients);
  const [optimistic, setOptimistic] = useState<ToggleState>({});
  const [loading, setLoading] = useState<LoadingState>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function isEnabled(r: AlertRecipientSummary): boolean {
    return optimistic[r.profile_id] !== undefined
      ? optimistic[r.profile_id]
      : r.sms_enabled;
  }

  async function handleToggle(recipient: AlertRecipientSummary) {
    if (!recipient.has_phone && !isEnabled(recipient)) {
      // Can't enable without a phone — should not reach here due to disabled state,
      // but guard just in case.
      return;
    }

    const newValue = !isEnabled(recipient);
    setErrorMsg(null);

    // Optimistic update
    setOptimistic((prev) => ({ ...prev, [recipient.profile_id]: newValue }));
    setLoading((prev) => ({ ...prev, [recipient.profile_id]: true }));

    try {
      const res = await fetch(`/api/admin/alert-recipients/${recipient.profile_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert optimistic update
        setOptimistic((prev) => ({ ...prev, [recipient.profile_id]: !newValue }));
        setErrorMsg(data.error ?? 'Failed to update alert setting.');
        return;
      }

      // Commit the update to the base list
      setRecipients((prev) =>
        prev.map((r) =>
          r.profile_id === recipient.profile_id
            ? { ...r, sms_enabled: data.recipient.enabled }
            : r
        )
      );
      // Clear optimistic state for this row (now synced)
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[recipient.profile_id];
        return next;
      });
    } catch {
      setOptimistic((prev) => ({ ...prev, [recipient.profile_id]: !newValue }));
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, [recipient.profile_id]: false }));
    }
  }

  if (recipients.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No team members"
        description="Add team members before configuring alerts."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-crimson">{errorMsg}</p>
        </div>
      )}

      <div className="rounded-md border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {recipients.map((recipient) => {
          const enabled = isEnabled(recipient);
          const isLoading = loading[recipient.profile_id] ?? false;
          const disabledReason = !recipient.has_phone
            ? 'No phone number on file'
            : null;

          return (
            <div
              key={recipient.profile_id}
              className="flex items-center justify-between gap-4 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm">{recipient.full_name}</p>
                {recipient.phone ? (
                  <p className="text-sm text-slate-400">{recipient.phone}</p>
                ) : (
                  <p className="text-sm text-slate-300 italic">No phone number</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {disabledReason && (
                  <span
                    className="hidden sm:block text-xs text-slate-400"
                    title={disabledReason}
                  >
                    {disabledReason}
                  </span>
                )}
                <Toggle
                  checked={enabled}
                  disabled={!!disabledReason}
                  loading={isLoading}
                  onChange={() => handleToggle(recipient)}
                  ariaLabel={`${enabled ? 'Disable' : 'Enable'} SMS alerts for ${recipient.full_name}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        SMS alerts notify team members before a vessel with a loaned device is scheduled to sail.
      </p>
    </div>
  );
}
