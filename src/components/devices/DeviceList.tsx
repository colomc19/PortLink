'use client';

import { useState, useCallback } from 'react';
import { DeviceCard } from './DeviceCard';
import { CheckoutFlow } from './CheckoutFlow';
import { CheckinConfirmation } from './CheckinConfirmation';
import type { DeviceSummary } from '@/types/devices';

interface DeviceListProps {
  devices: DeviceSummary[];
  onRefresh: () => void;
}

const STATUS_ORDER: Record<string, number> = {
  needs_retrieval: 0,
  assigned: 1,
  available: 2,
};

function sortDevices(devices: DeviceSummary[]): DeviceSummary[] {
  return [...devices].sort((a, b) => {
    const aRank = STATUS_ORDER[a.status] ?? 3;
    const bRank = STATUS_ORDER[b.status] ?? 3;
    if (aRank !== bRank) return aRank - bRank;
    return a.device_number - b.device_number;
  });
}

export function DeviceList({ devices, onRefresh }: DeviceListProps) {
  const [checkoutDeviceId, setCheckoutDeviceId] = useState<string | null>(null);
  const [checkinDevice, setCheckinDevice] = useState<DeviceSummary | null>(null);

  const handleCheckoutComplete = useCallback(() => {
    setCheckoutDeviceId(null);
    onRefresh();
  }, [onRefresh]);

  const handleCheckinComplete = useCallback(() => {
    setCheckinDevice(null);
    onRefresh();
  }, [onRefresh]);

  const sorted = sortDevices(devices);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {sorted.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onCheckout={setCheckoutDeviceId}
            onCheckin={setCheckinDevice}
          />
        ))}
      </div>

      {checkoutDeviceId && (
        <CheckoutFlow
          preselectedDeviceId={checkoutDeviceId}
          onComplete={handleCheckoutComplete}
          onClose={() => setCheckoutDeviceId(null)}
        />
      )}

      {checkinDevice && (
        <CheckinConfirmation
          deviceId={checkinDevice.id}
          deviceNumber={checkinDevice.device_number}
          vesselName={checkinDevice.active_assignment?.vessel?.name ?? 'Unknown vessel'}
          onComplete={handleCheckinComplete}
          onClose={() => setCheckinDevice(null)}
        />
      )}
    </>
  );
}
