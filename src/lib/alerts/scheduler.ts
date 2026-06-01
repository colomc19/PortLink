import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertTier = "info" | "warning" | "urgent";

interface VesselForAlerts {
  id: string;
  name: string;
  sailing_date: string | null;
  sailing_time: string | null;
  sailing_time_confidence: string | null;
}

interface AssignmentForAlerts {
  id: string;
  device_id: string;
  vessel_id: string;
}

interface DeviceForAlerts {
  device_number: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_OFFSETS_MS: Record<AlertTier, number> = {
  info: 6 * 60 * 60 * 1000,    // 6 hours
  warning: 2 * 60 * 60 * 1000, // 2 hours
  urgent: 1 * 60 * 60 * 1000,  // 1 hour
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Combines a date string (YYYY-MM-DD) and time string (HH:MM or HH:MM:SS)
 * into a UTC Date, treating the inputs as being in the local (server) timezone.
 * Sailing times in Pilot Reports are local Mobile, AL times (CT).
 */
export function combineSailingDatetime(
  sailingDate: string,
  sailingTime: string
): Date {
  // Assume times are Central Time. On Vercel, the server runs UTC.
  // We combine as-is and treat as "wall clock" time in UTC for scheduling
  // purposes — the exact TZ offset matters less than relative timing.
  // The sailing_time stored in DB is already the parsed "HH:MM" wall clock.
  const combined = `${sailingDate}T${sailingTime.length === 5 ? sailingTime + ":00" : sailingTime}`;
  return new Date(combined);
}

function buildMessage(
  tier: AlertTier,
  vesselName: string,
  sailingTimeDisplay: string,
  deviceNumber: number,
  isApproximate: boolean
): string {
  const approxSuffix = isApproximate ? " (approximate sailing time)" : "";

  switch (tier) {
    case "info":
      return `Heads up: ${vesselName} sails at ${sailingTimeDisplay} today. Device ${deviceNumber} is aboard.${approxSuffix}`;
    case "warning":
      return `Action needed: ${vesselName} sails at ${sailingTimeDisplay}. Device ${deviceNumber} still aboard. Under 2 hours.${approxSuffix}`;
    case "urgent":
      return `URGENT: ${vesselName} sails in less than 1 hour. Device ${deviceNumber} NOT retrieved.${approxSuffix}`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates 3-tier alerts (info/warning/urgent) for a device assignment on a
 * vessel with a known sailing time.
 *
 * - Skips stale info/warning alerts (alert_time already passed).
 * - Creates immediate urgent alert if sailing is < 1 hour away.
 * - Does nothing if the vessel has no sailing_time.
 */
export async function scheduleAlerts(
  vessel: VesselForAlerts,
  assignment: AssignmentForAlerts
): Promise<void> {
  if (!vessel.sailing_time || !vessel.sailing_date) {
    // No sailing time — no alerts to schedule
    return;
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Fetch device number for message text
  const { data: device } = await supabase
    .from("devices")
    .select("device_number")
    .eq("id", assignment.device_id)
    .single<DeviceForAlerts>();

  const deviceNumber = device?.device_number ?? 0;
  const sailingDatetime = combineSailingDatetime(
    vessel.sailing_date,
    vessel.sailing_time
  );
  const isApproximate = vessel.sailing_time_confidence === "approximate";
  const sailingTimeDisplay = vessel.sailing_time.slice(0, 5); // HH:MM

  const tiers: AlertTier[] = ["info", "warning", "urgent"];

  for (const tier of tiers) {
    const alertTime = new Date(sailingDatetime.getTime() - TIER_OFFSETS_MS[tier]);

    let scheduledFor: Date;

    if (alertTime <= now) {
      if (tier === "urgent") {
        // Late discovery: send urgent immediately
        scheduledFor = now;
      } else {
        // Stale info/warning — skip
        continue;
      }
    } else {
      scheduledFor = alertTime;
    }

    const message = buildMessage(
      tier,
      vessel.name,
      sailingTimeDisplay,
      deviceNumber,
      isApproximate
    );

    const { error } = await supabase.from("alerts").insert({
      vessel_id: vessel.id,
      device_id: assignment.device_id,
      assignment_id: assignment.id,
      tier,
      status: "scheduled",
      message,
      sailing_time: vessel.sailing_time,
      scheduled_for: scheduledFor.toISOString(),
    });

    if (error) {
      console.error(
        `[scheduleAlerts] Failed to insert ${tier} alert for vessel ${vessel.id}:`,
        error.message
      );
    }
  }
}

/**
 * Cancels all pending (scheduled) alerts for a device assignment.
 */
export async function cancelAlerts(
  assignmentId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq("assignment_id", assignmentId)
    .eq("status", "scheduled");

  if (error) {
    console.error(
      `[cancelAlerts] Failed to cancel alerts for assignment ${assignmentId}:`,
      error.message
    );
  }
}

/**
 * Recalculates alerts for all active device assignments on a vessel.
 * Cancels all scheduled alerts, then reschedules based on current vessel data.
 */
export async function recalculateAlerts(vesselId: string): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the vessel
  const { data: vessel, error: vesselError } = await supabase
    .from("vessels")
    .select("id, name, sailing_date, sailing_time, sailing_time_confidence")
    .eq("id", vesselId)
    .single<VesselForAlerts>();

  if (vesselError || !vessel) {
    console.error(
      `[recalculateAlerts] Vessel ${vesselId} not found:`,
      vesselError?.message
    );
    return;
  }

  // Find all active assignments for this vessel
  const { data: assignments, error: assignmentError } = await supabase
    .from("device_assignments")
    .select("id, device_id, vessel_id")
    .eq("vessel_id", vesselId)
    .eq("status", "active");

  if (assignmentError) {
    console.error(
      `[recalculateAlerts] Failed to fetch assignments for vessel ${vesselId}:`,
      assignmentError.message
    );
    return;
  }

  if (!assignments || assignments.length === 0) {
    return;
  }

  // For each active assignment: cancel existing alerts, then reschedule
  for (const assignment of assignments) {
    await cancelAlerts(assignment.id, "sailing_time_updated");
    await scheduleAlerts(vessel, assignment);
  }
}
