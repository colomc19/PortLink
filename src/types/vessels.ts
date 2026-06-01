/**
 * Shared vessel types for the dashboard and vessel components.
 * These are the shaped API response types — not raw database rows.
 */

export interface DeviceAssignmentInfo {
  deviceId: string;
  deviceNumber: number;
  deviceLabel: string;
  deviceStatus: string;
  assignedAt: string;
}

export interface VesselSummary {
  id: string;
  name: string;
  status: string;
  terminal: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_time_display: string | null;
  sailing_date: string | null;
  sailing_time: string | null;
  sailing_time_display: string | null;
  sailing_time_confidence: string;
  agent: string | null;
  source: string;
  is_new: boolean;
  needs_review: boolean;
  review_reason: string | null;
  has_manual_override: boolean;
  device: DeviceAssignmentInfo | null;
}

export interface VesselGroups {
  inPort: VesselSummary[];
  arriving: VesselSummary[];
  sailing: VesselSummary[];
}
