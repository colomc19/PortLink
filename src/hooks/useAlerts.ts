'use client';

import { useState, useEffect, useCallback } from 'react';

export type AlertTier = 'info' | 'warning' | 'urgent';
export type AlertStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed';

export interface AlertWithContext {
  id: string;
  tier: AlertTier;
  status: AlertStatus;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
  vessel_id: string;
  vessel_name: string;
  device_id: string | null;
  device_number: number | null;
  sailing_time: string | null;
  assignment_id: string | null;
}

interface UseAlertsResult {
  alerts: AlertWithContext[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches active and upcoming alerts for the dashboard banner stack.
 *
 * Returns alerts where status IN ('scheduled', 'sent'), sorted by urgency
 * (urgent first, then by scheduled_for ascending).
 */
export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<AlertWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?status=active', {
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { alerts: AlertWithContext[] };
      setAlerts(data.alerts ?? []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load alerts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh: fetchAlerts };
}
