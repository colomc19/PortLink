'use client';

import { useState, useEffect } from 'react';

interface UpdateIndicatorProps {
  lastUpdated: Date | null;
  className?: string;
}

/**
 * Shows a human-friendly "Updated X min ago" timestamp.
 * Refreshes every 30 seconds to stay current.
 * When lastUpdated is null, shows nothing.
 */
function computeLabel(ts: Date): string {
  const diffMs = Date.now() - ts.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 10) return 'Updated just now';
  if (diffMin < 1) return 'Updated < 1 min ago';
  if (diffMin === 1) return 'Updated 1 min ago';
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return 'Updated 1 hr ago';
  return `Updated ${diffHr} hr ago`;
}

export function UpdateIndicator({ lastUpdated, className = '' }: UpdateIndicatorProps) {
  // The timer only forces a re-render; the label is derived during render below,
  // so there is no setState synchronously inside the effect.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!lastUpdated) return null;

  const label = computeLabel(lastUpdated);

  return (
    <span
      className={[
        'text-sm text-slate-text whitespace-nowrap tabular-nums',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
