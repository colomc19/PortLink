'use client';

import { useRouter } from 'next/navigation';
import { WifiIcon } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ActiveDeviceAssignment } from '@/types/vessel-detail';

interface DeviceAssignmentSectionProps {
  assignment: ActiveDeviceAssignment | null;
  vesselId: string;
  isUrgent: boolean;
}

function formatAssignedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function DeviceAssignmentSection({
  assignment,
  vesselId,
  isUrgent,
}: DeviceAssignmentSectionProps) {
  const router = useRouter();

  // Navigate to the devices page — check-in/checkout flows are built by another agent.
  // These buttons route to the devices page with context until those flows are wired.
  function handleCheckIn() {
    router.push(`/devices?action=checkin&assignment=${assignment?.id}&vessel=${vesselId}`);
  }

  function handleAssignDevice() {
    router.push(`/devices?action=checkout&vessel=${vesselId}`);
  }

  if (!assignment) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">No device currently assigned to this vessel.</p>
        <Button
          variant="secondary"
          onClick={handleAssignDevice}
          className="w-full sm:w-auto"
        >
          Assign Device
        </Button>
      </div>
    );
  }

  const deviceBadgeVariant =
    assignment.device?.status === 'needs_retrieval' ? 'needs_retrieval' : 'assigned';
  const needsRetrieval = assignment.device?.status === 'needs_retrieval';

  return (
    <div className="space-y-4">
      {/* Device info */}
      <div className="flex flex-wrap items-start gap-3">
        <Badge variant={deviceBadgeVariant} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground leading-snug">
            {assignment.device?.label ?? `Device #${assignment.device?.device_number}`}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            Assigned {formatAssignedDate(assignment.checked_out_at)}
          </p>
        </div>
      </div>

      {/* Action button */}
      <Button
        variant={isUrgent ? 'urgent' : 'primary'}
        onClick={handleCheckIn}
        className="w-full"
      >
        <WifiIcon className="h-5 w-5" aria-hidden="true" />
        {needsRetrieval ? 'Confirm Retrieved' : 'Check In Device'}
      </Button>
    </div>
  );
}
