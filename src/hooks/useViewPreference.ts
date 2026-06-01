'use client';

import { useState, useCallback } from 'react';
import type { ViewMode } from '@/components/ui/ViewToggle';

interface UseViewPreferenceOptions {
  /** Initial value from the server-rendered profile */
  initial: ViewMode;
}

interface UseViewPreferenceResult {
  view: ViewMode;
  setView: (v: ViewMode) => void;
}

/**
 * Manages the current view mode (table | card) for the dashboard.
 * Reads the initial value from the profile (passed from server component).
 * On change, optimistically updates local state and persists to the API.
 */
export function useViewPreference({
  initial,
}: UseViewPreferenceOptions): UseViewPreferenceResult {
  const [view, setViewState] = useState<ViewMode>(initial);

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);

    // Persist in the background — fire-and-forget; failure is non-critical
    fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_preference: next }),
    }).catch(() => {
      // Swallow network errors; preference will reset on next login at most
    });
  }, []);

  return { view, setView };
}
