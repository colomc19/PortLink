'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VesselGroups, VesselSummary } from '@/types/vessels';

interface UseRealtimeVesselsOptions {
  /** Current vessel groups; used when merging single-row updates */
  groups: VesselGroups;
  /** Called with the full refreshed groups after any change */
  onUpdate: (groups: VesselGroups, updatedAt: Date) => void;
}

/**
 * Subscribes to Supabase Realtime INSERT/UPDATE events on the vessels table.
 * On any change, refetches the full vessel list from the API and calls onUpdate.
 *
 * Only active (non-sailed, non-cancelled) vessels are tracked.
 */
export function useRealtimeVessels({ onUpdate }: UseRealtimeVesselsOptions) {
  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/vessels', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as VesselGroups;
      onUpdate(data, new Date());
    } catch {
      // Network errors during background refresh are non-critical
    }
  }, [onUpdate]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('realtime:vessels')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vessels',
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vessels',
          // Only care about active vessels — filter on the server after refetch
        },
        (payload) => {
          const newRecord = payload.new as { status?: string };
          // Skip updates that move a vessel to sailed/cancelled — refetch will clean up
          if (
            newRecord?.status === 'sailed' ||
            newRecord?.status === 'cancelled'
          ) {
            refetch();
            return;
          }
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);
}

// Re-export the VesselSummary type so consumers can import from one place
export type { VesselSummary };
