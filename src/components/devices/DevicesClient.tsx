'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DeviceSummaryBar } from './DeviceSummaryBar';
import { DeviceList } from './DeviceList';
import { CheckoutFlow } from './CheckoutFlow';
import type { DeviceSummary } from '@/types/devices';

interface DevicesClientProps {
  initialDevices: DeviceSummary[];
}

export function DevicesClient({ initialDevices }: DevicesClientProps) {
  const [devices, setDevices] = useState<DeviceSummary[]>(initialDevices);
  const [showCheckout, setShowCheckout] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/devices', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as DeviceSummary[];
      setDevices(data);
    } catch {
      // Non-critical background refresh
    }
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setShowCheckout(false);
    refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Devices"
        subtitle="Wifi hotspot inventory and assignments."
        actions={
          <Button
            variant="primary"
            onClick={() => setShowCheckout(true)}
            type="button"
          >
            Assign Device
          </Button>
        }
      />

      <DeviceSummaryBar devices={devices} />

      <DeviceList devices={devices} onRefresh={refresh} />

      {showCheckout && (
        <CheckoutFlow
          onComplete={handleCheckoutComplete}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
