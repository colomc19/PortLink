'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseRealtimeDevicesOptions {
  /** Called when any device status changes; triggers vessel list refresh */
  onDeviceChange: () => void;
}

/**
 * Subscribes to Supabase Realtime UPDATE events on the devices table.
 * Device status changes affect which vessels show device badges, so we
 * notify the dashboard to refresh vessel data.
 *
 * Also subscribes to device_assignments INSERT/UPDATE to catch check-out
 * and check-in events.
 */
export function useRealtimeDevices({ onDeviceChange }: UseRealtimeDevicesOptions) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('realtime:devices')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
        },
        () => {
          onDeviceChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_assignments',
        },
        () => {
          onDeviceChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_assignments',
        },
        () => {
          onDeviceChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onDeviceChange]);
}
