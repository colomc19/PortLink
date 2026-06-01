/**
 * Shared device types for device inventory components and API responses.
 * These are shaped API response types — not raw database rows.
 */

export interface DeviceVesselInfo {
  id: string;
  name: string;
  terminal: string | null;
  sailing_date: string | null;
  sailing_time: string | null;
  sailing_time_display: string | null;
  status: string;
}

export interface DeviceActiveAssignment {
  id: string;
  checked_out_at: string;
  vessel: DeviceVesselInfo | null;
}

export interface DeviceSummary {
  id: string;
  device_number: number;
  label: string;
  status: string; // 'available' | 'assigned' | 'needs_retrieval'
  notes: string | null;
  assigned_at: string | null;
  current_vessel_id: string | null;
  updated_at: string;
  active_assignment: DeviceActiveAssignment | null;
}

export interface DeviceAssignmentHistory {
  id: string;
  status: string;
  checked_out_at: string;
  checked_in_at: string | null;
  checked_out_by: string | null;
  checked_in_by: string | null;
  vessel_id: string;
  vessels: DeviceVesselInfo | null;
}

export interface DeviceDetail extends Omit<DeviceSummary, 'active_assignment'> {
  created_at: string;
  assignment_history: DeviceAssignmentHistory[];
}
