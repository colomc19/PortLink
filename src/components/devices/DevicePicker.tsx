'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import type { DeviceSummary } from '@/types/devices';

interface DevicePickerProps {
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}

export function DevicePicker({ selectedDeviceId, onSelect }: DevicePickerProps) {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/devices', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load devices');
      const data = (await res.json()) as DeviceSummary[];
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 w-20 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-crimson flex items-center gap-1">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
        {error}
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-4 gap-2"
      role="listbox"
      aria-label="Select a device"
    >
      {devices.map((device) => {
        const isAvailable = device.status === 'available';
        const isSelected = device.id === selectedDeviceId;
        const vesselName = device.active_assignment?.vessel?.name;

        return (
          <button
            key={device.id}
            role="option"
            aria-selected={isSelected}
            aria-label={
              isAvailable
                ? `Device ${device.device_number}, available`
                : `Device ${device.device_number}, ${device.status}${vesselName ? ` on ${vesselName}` : ''}`
            }
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelect(device.id)}
            className={[
              'relative flex flex-col items-center justify-center gap-1',
              'w-20 h-20 rounded-lg border-2 text-sm font-bold transition-colors duration-100',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-2',
              isAvailable && !isSelected
                ? 'border-[#15803D] bg-[#F0FDF4] text-[#14532D] cursor-pointer hover:bg-[#DCFCE7]'
                : '',
              isAvailable && isSelected
                ? 'border-navy bg-navy text-white cursor-pointer'
                : '',
              !isAvailable
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                : '',
            ].join(' ')}
          >
            {isSelected && isAvailable && (
              <CheckIcon className="absolute top-1 right-1 h-4 w-4" aria-hidden="true" />
            )}
            <span className="text-lg leading-none">{device.device_number}</span>
            {!isAvailable && vesselName && (
              <span className="text-[10px] leading-tight text-center px-1 line-clamp-2">
                {vesselName}
              </span>
            )}
            {!isAvailable && !vesselName && (
              <span className="text-[10px]">{device.status.replace('_', ' ')}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
