/**
 * Time display utilities for vessel schedules.
 *
 * Rules:
 * - Always 24-hour time (e.g. "1300", not "1:00 PM")
 * - Use "today" / "tomorrow" when applicable
 * - Show confidence note for estimated times
 * - Null sailing time → "No sailing time yet"
 */

/**
 * Returns a human-friendly label for a date relative to today.
 * e.g. "today", "tomorrow", "Mar 26"
 */
export function relativeDate(dateStr: string | null, today: string): string {
  if (!dateStr) return "";

  const tomorrow = offsetDate(today, 1);

  if (dateStr === today) return "today";
  if (dateStr === tomorrow) return "tomorrow";

  // Format as "Mon DD" using UTC to avoid timezone drift
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Returns today's date as YYYY-MM-DD in local time.
 * Useful for server-side rendering where we want local date context.
 */
export function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a 24-hour time string "HH:MM" or "HH:MM:SS" to display form "HHMM".
 */
export function formatTime24(timeStr: string | null): string {
  if (!timeStr) return "";
  // Input may be "13:00" or "13:00:00"
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  return parts[0].padStart(2, "0") + parts[1].padStart(2, "0");
}

/**
 * Builds the sailing time display string for a vessel.
 *
 * Examples:
 *   "Sails today at 2300"
 *   "Sails tomorrow at 0600"
 *   "Sails Mar 26 at 1400"
 *   "AM (estimated before noon)"
 *   "No sailing time yet"
 */
export function formatSailingDisplay(
  sailingDate: string | null,
  sailingTime: string | null,
  sailingTimeDisplay: string | null,
  sailingTimeConfidence: string,
  today: string
): string {
  // If there's a display override from the parser use it when confidence is low
  if (sailingTimeConfidence === "approximate" && sailingTimeDisplay) {
    return sailingTimeDisplay;
  }

  if (!sailingDate && !sailingTime) {
    return "No sailing time yet";
  }

  const parts: string[] = [];

  if (sailingDate) {
    const label = relativeDate(sailingDate, today);
    const timeLabel = sailingTime ? formatTime24(sailingTime) : null;

    if (timeLabel) {
      parts.push(`Sails ${label} at ${timeLabel}`);
    } else if (sailingTimeDisplay) {
      parts.push(`Sails ${label} — ${sailingTimeDisplay}`);
    } else {
      parts.push(`Sails ${label}`);
    }
  } else if (sailingTime) {
    parts.push(`Sails at ${formatTime24(sailingTime)}`);
  }

  if (sailingTimeConfidence === "approximate") {
    parts.push("(estimated)");
  }

  return parts.join(" ");
}

/**
 * Builds the arrival time display string for a vessel.
 */
export function formatArrivalDisplay(
  arrivalDate: string | null,
  arrivalTime: string | null,
  arrivalTimeDisplay: string | null,
  today: string
): string {
  if (!arrivalDate && !arrivalTime) {
    return arrivalTimeDisplay ?? "";
  }

  if (arrivalDate) {
    const label = relativeDate(arrivalDate, today);
    const timeLabel = arrivalTime ? formatTime24(arrivalTime) : null;

    if (timeLabel) {
      return `Arrives ${label} at ${timeLabel}`;
    } else if (arrivalTimeDisplay) {
      return `Arrives ${label} — ${arrivalTimeDisplay}`;
    } else {
      return `Arrives ${label}`;
    }
  }

  if (arrivalTime) {
    return `Arrives at ${formatTime24(arrivalTime)}`;
  }

  return arrivalTimeDisplay ?? "";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function offsetDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
