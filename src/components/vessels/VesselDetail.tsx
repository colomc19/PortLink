'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PencilSquareIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusTimeline } from '@/components/vessels/StatusTimeline';
import { RawSourceSection } from '@/components/vessels/RawSourceSection';
import { DeviceAssignmentSection } from '@/components/vessels/DeviceAssignmentSection';
import { VesselEditForm } from '@/components/vessels/VesselEditForm';
import { ParseReviewForm } from '@/components/vessels/ParseReviewForm';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  formatArrivalDisplay,
  formatSailingDisplay,
  todayString,
} from '@/lib/format-time';
import type { VesselDetail as VesselDetailType } from '@/types/vessel-detail';

interface VesselDetailProps {
  vessel: VesselDetailType;
}

function getStatusBadgeVariant(vessel: VesselDetailType): BadgeVariant {
  if (vessel.status === 'sailing' && vessel.active_assignment !== null) {
    return 'sailing_urgent';
  }
  if (vessel.needs_review) return 'needs_review';
  if (vessel.source === 'manual') return 'manual';

  switch (vessel.status) {
    case 'in_port':
    case 'at_anchor':
      return 'in_port';
    case 'arriving':
      return 'arriving';
    case 'sailing':
      return 'sailing';
    case 'sailed':
      return 'sailed';
    default:
      return 'in_port';
  }
}

const SOURCE_DISPLAY: Record<string, string> = {
  pilot_report: 'Pilot Report',
  manual: 'Manual Entry',
  scraper: 'Harbor Master',
  system: 'System',
};

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-36 shrink-0 text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function VesselDetail({ vessel: initialVessel }: VesselDetailProps) {
  const router = useRouter();
  const { isAdmin } = useProfileContext();

  const [vessel, setVessel] = useState<VesselDetailType>(initialVessel);
  const [editMode, setEditMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const today = todayString();
  const isUrgent =
    vessel.status === 'sailing' && vessel.active_assignment !== null;
  const statusVariant = getStatusBadgeVariant(vessel);

  const arrivalDisplay = formatArrivalDisplay(
    vessel.arrival_date,
    vessel.arrival_time,
    vessel.arrival_time_display,
    today
  );
  const sailingDisplay = formatSailingDisplay(
    vessel.sailing_date,
    vessel.sailing_time,
    vessel.sailing_time_display,
    vessel.sailing_time_confidence,
    today
  );

  function handleEditSave(updated: VesselDetailType) {
    setVessel((prev) => ({ ...prev, ...updated }));
    setEditMode(false);
  }

  function handleReviewSave(updated: VesselDetailType) {
    setVessel((prev) => ({ ...prev, ...updated, needs_review: false, review_reason: null }));
    setReviewMode(false);
  }

  async function handleClearOverride() {
    const res = await fetch(`/api/vessels/${vessel.id}/clear-override`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setVessel((prev) => ({ ...prev, ...updated }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-bay-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy rounded"
      >
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </button>

      {/* Header card */}
      <div
        className={[
          'rounded-xl border border-[#E2E8F0] p-5 space-y-3',
          isUrgent ? 'bg-[#FEF2F2]' : 'bg-white',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {vessel.name}
            </h1>

            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant={statusVariant} />
              {vessel.source === 'manual' && statusVariant !== 'manual' && (
                <Badge variant="manual" />
              )}
              {vessel.needs_review && statusVariant !== 'needs_review' && (
                <Badge variant="needs_review" />
              )}
              {vessel.has_manual_override && vessel.source !== 'manual' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FFF7ED] text-[#92400E] uppercase tracking-wider border border-[#FDE68A]">
                  EDITED
                </span>
              )}
              {vessel.is_new && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#0D9488] text-white uppercase tracking-wider">
                  NEW
                </span>
              )}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && !editMode && !reviewMode && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {vessel.needs_review && (
                <Button
                  variant="secondary"
                  onClick={() => setReviewMode(true)}
                  className="text-sm"
                >
                  <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
                  Review
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setEditMode(true)}
                className="text-sm"
              >
                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            </div>
          )}

          {(editMode || reviewMode) && (
            <Button
              variant="ghost"
              onClick={() => { setEditMode(false); setReviewMode(false); }}
              className="text-sm"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          )}
        </div>

        {/* Review reason */}
        {vessel.needs_review && vessel.review_reason && !reviewMode && (
          <div className="flex items-start gap-2 rounded bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2">
            <ExclamationTriangleIcon
              className="h-4 w-4 text-amber shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-[#78350F]">{vessel.review_reason}</p>
          </div>
        )}
      </div>

      {/* Edit form (admin only) */}
      {editMode && isAdmin && (
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-4">Edit Vessel</h2>
          <VesselEditForm
            vessel={vessel}
            onSave={handleEditSave}
            onCancel={() => setEditMode(false)}
          />
        </Card>
      )}

      {/* Parse review form (admin only, when needs_review) */}
      {reviewMode && isAdmin && vessel.needs_review && (
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-4">
            Resolve Parse Issue
          </h2>
          <ParseReviewForm
            vessel={vessel}
            onSaved={handleReviewSave}
            onSkip={() => setReviewMode(false)}
          />
        </Card>
      )}

      {/* Info section */}
      {!editMode && !reviewMode && (
        <>
          <Card>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Vessel Information
            </h2>
            <div className="space-y-2">
              <InfoRow label="Terminal" value={vessel.terminal} />
              <InfoRow label="Arrival" value={arrivalDisplay || null} />
              <InfoRow label="Sailing" value={sailingDisplay || null} />
              <InfoRow label="Agent" value={vessel.agent} />
              <InfoRow
                label="Source"
                value={SOURCE_DISPLAY[vessel.source] ?? vessel.source}
              />
              {vessel.notes && (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="w-36 shrink-0 text-sm font-semibold text-slate-600">
                    Notes
                  </span>
                  <span className="text-sm text-foreground whitespace-pre-wrap">
                    {vessel.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Clear override (admin) */}
            {isAdmin && vessel.has_manual_override && vessel.source !== 'manual' && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleClearOverride}
                  className="text-sm text-bay-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy rounded"
                >
                  Clear manual overrides
                </button>
              </div>
            )}
          </Card>

          {/* Device assignment section */}
          <Card>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Device Assignment
            </h2>
            <DeviceAssignmentSection
              assignment={vessel.active_assignment}
              vesselId={vessel.id}
              isUrgent={isUrgent}
            />
          </Card>

          {/* Status history */}
          <Card>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Status History
            </h2>
            <StatusTimeline
              history={vessel.status_history}
              currentStatus={vessel.status}
            />
          </Card>

          {/* Raw source */}
          {vessel.pilot_report_rows.length > 0 && (
            <RawSourceSection rows={vessel.pilot_report_rows} />
          )}
        </>
      )}
    </div>
  );
}
