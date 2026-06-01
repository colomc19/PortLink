'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { DeviceSummary } from '@/types/devices';

interface DeviceCardProps {
  device: DeviceSummary;
  onCheckout: (deviceId: string) => void;
  onCheckin: (device: DeviceSummary) => void;
}

// Returns left border color based on device status and sailing proximity
function getBorderColor(device: DeviceSummary): string {
  if (device.status === 'needs_retrieval') return '#B91C1C'; // Crimson
  if (device.status === 'available') return '#15803D';       // Forest Green

  // Assigned — check if sailing soon (within 2 hours)
  if (device.status === 'assigned' && device.active_assignment?.vessel?.sailing_time) {
    const sailingDate = device.active_assignment.vessel.sailing_date;
    const sailingTime = device.active_assignment.vessel.sailing_time;
    if (sailingDate && sailingTime) {
      const sailsAt = new Date(`${sailingDate}T${sailingTime}`);
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      if (sailsAt <= twoHoursFromNow) return '#D97706'; // Amber
    }
  }

  return '#2C5282'; // Bay Blue
}

function formatSailingInfo(device: DeviceSummary): string | null {
  const vessel = device.active_assignment?.vessel;
  if (!vessel) return null;

  const display = vessel.sailing_time_display ?? vessel.sailing_time;
  if (!display) return vessel.name;
  return `${vessel.name} · sails ${display}`;
}

export function DeviceCard({ device, onCheckout, onCheckin }: DeviceCardProps) {
  const borderColor = getBorderColor(device);
  const sailingInfo = formatSailingInfo(device);
  const isUrgent = device.status === 'needs_retrieval';

  return (
    <div
      className={[
        'relative bg-white border border-[#E2E8F0] border-l-4 rounded-lg',
        'p-4 flex flex-col gap-3 shadow-sm hover:shadow transition-shadow duration-150',
        isUrgent ? 'bg-[#FEF2F2]' : '',
      ].join(' ')}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Link
            href={`/devices/${device.id}`}
            className="text-lg font-bold text-foreground hover:text-bay-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy rounded"
          >
            Device {device.device_number}
          </Link>

          {sailingInfo && (
            <p
              className={[
                'text-sm font-medium truncate',
                isUrgent ? 'text-[#7F1D1D]' : 'text-slate-600',
              ].join(' ')}
            >
              {sailingInfo}
            </p>
          )}

          {device.active_assignment?.vessel?.terminal && (
            <p className="text-xs text-slate-400 truncate">
              {device.active_assignment.vessel.terminal}
            </p>
          )}
        </div>

        <Badge
          variant={device.status as 'available' | 'assigned' | 'needs_retrieval'}
          className="shrink-0"
        />
      </div>

      {/* Action button */}
      <div>
        {device.status === 'available' && (
          <Button
            variant="secondary"
            className="w-full h-[44px] text-sm"
            onClick={() => onCheckout(device.id)}
          >
            Assign
          </Button>
        )}

        {device.status === 'assigned' && (
          <Button
            variant="secondary"
            className="w-full h-[44px] text-sm"
            onClick={() => onCheckin(device)}
          >
            Check In
          </Button>
        )}

        {device.status === 'needs_retrieval' && (
          <Button
            variant="urgent"
            className="w-full text-sm"
            onClick={() => onCheckin(device)}
          >
            Confirm Retrieved
          </Button>
        )}
      </div>
    </div>
  );
}
