/**
 * Types for the vessel detail API response (GET /api/vessels/[id]).
 * Extends VesselSummary with full history, pilot report rows, and device assignment detail.
 */

import type { Tables } from "@/types/database";

export interface StatusHistoryEntry {
  id: string;
  status: string;
  changed_at: string;
  source: string;
  source_id: string | null;
  changed_by: string | null;
  details: Record<string, unknown> | null;
}

export interface PilotReportRowSummary {
  id: string;
  pilot_report_id: string;
  section: string;
  raw_vessel_name: string;
  raw_date: string | null;
  raw_time_status: string | null;
  raw_terminal: string | null;
  raw_agent: string | null;
  raw_notes: string | null;
  parsed_date: string | null;
  parsed_time: string | null;
  parsed_status: string | null;
  needs_review: boolean;
  review_reason: string | null;
  time_confidence: string;
  created_at: string;
}

export interface ActiveDeviceAssignment {
  id: string;
  device_id: string;
  vessel_id: string;
  status: string;
  checked_out_at: string;
  checked_out_by: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  device: {
    id: string;
    device_number: number;
    label: string;
    status: string;
    notes: string | null;
  };
}

export interface VesselDetail extends Tables<"vessels"> {
  status_history: StatusHistoryEntry[];
  pilot_report_rows: PilotReportRowSummary[];
  active_assignment: ActiveDeviceAssignment | null;
}

/** Body for PATCH /api/vessels/[id] */
export interface VesselPatchBody {
  name?: string;
  status?: string;
  terminal?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  sailing_date?: string | null;
  sailing_time?: string | null;
  agent?: string | null;
  notes?: string | null;
}

/** Body for POST /api/vessels */
export interface VesselCreateBody {
  name: string;
  date?: string | null;
  time?: string | null;
  status: string;
  terminal?: string | null;
  agent?: string | null;
  notes?: string | null;
}
