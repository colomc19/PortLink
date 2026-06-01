import type { ParsedTime } from "./types";

/**
 * Formats a raw 3-4 digit military time string into HH:MM.
 * '600' → '06:00', '1300' → '13:00', '830' → '08:30'
 */
function formatMilitaryTime(raw: string): string | null {
  const digits = raw.trim();
  if (!/^\d{3,4}$/.test(digits)) return null;

  let hours: number;
  let minutes: number;

  if (digits.length === 3) {
    hours = parseInt(digits[0], 10);
    minutes = parseInt(digits.slice(1), 10);
  } else {
    hours = parseInt(digits.slice(0, 2), 10);
    minutes = parseInt(digits.slice(2), 10);
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Normalizes a status keyword to a canonical lowercase token.
 * Returns null if the input is not a recognized status keyword.
 */
function normalizeStatus(token: string): string | null {
  const t = token.trim().toLowerCase();
  const statusMap: Record<string, string> = {
    anchor: "anchor",
    anchored: "anchor",
    pilot: "pilot",
    boarded: "boarded",
    docked: "docked",
    sailing: "sailing",
    sailed: "sailed",
    arrived: "arrived",
    arriving: "arriving",
    cancelled: "cancelled",
    canceled: "cancelled",
    delayed: "delayed",
    waiting: "waiting",
    lpm: "lpm",
  };
  return statusMap[t] ?? null;
}

/**
 * Parses a time+status field from a Pilot Report email cell.
 *
 * Handles:
 *   Exact time:          '1300', '0600'
 *   Time + status:       '0500 ANCHOR', '1010 boarded', '0200 PILOT'
 *   Range:               '17-1800', '05-0600'
 *   Range + status:      '17-1800 PILOT'
 *   Compound (--):       '0800 ANCHOR--1800 PILOT'
 *   Compound (space):    '0300 ANCHOR 06-0700 PILOT'
 *   Approximate:         'AM', 'PM', 'LPM'
 *   Status-only:         'boarded', 'docked'
 *   Empty/null:          '' or null → confidence=unknown
 *
 * The parser NEVER silently drops data. If parsing is uncertain, it stores
 * the raw text and returns confidence=unknown so callers can flag for review.
 */
export function parseTimeStatus(input: string | null | undefined): ParsedTime {
  const raw = (input ?? "").trim();

  if (raw === "") {
    return { time: null, timeEnd: null, confidence: "unknown", status: null, raw };
  }

  // Approximate keywords
  const approxMap: Record<string, string> = {
    am: "06:00",
    pm: "12:00",
    lpm: "15:00",
  };
  const lowerRaw = raw.toLowerCase();
  if (approxMap[lowerRaw] !== undefined) {
    const approxStatus = normalizeStatus(lowerRaw);
    return {
      time: approxMap[lowerRaw],
      timeEnd: null,
      confidence: "approximate",
      status: approxStatus,
      raw,
    };
  }

  // Compound pattern: two segments separated by '--' or ' ' where each segment
  // may contain a time/range + optional status.
  // e.g. '0800 ANCHOR--1800 PILOT' or '0300 ANCHOR 06-0700 PILOT'
  const compoundPatterns = [
    // Double-dash separator: '0800 ANCHOR--1800 PILOT'
    /^(\d{3,4}(?:\s+\w+)?)\s*--\s*(\d{1,2}-\d{3,4}(?:\s+\w+)?|\d{3,4}(?:\s+\w+)?)$/i,
    // Space-separated where second segment is a range: '0300 ANCHOR 06-0700 PILOT'
    /^(\d{3,4}(?:\s+\w+)?)\s+(\d{1,2}-\d{3,4}(?:\s+\w+)?)$/i,
  ];

  for (const pattern of compoundPatterns) {
    const match = raw.match(pattern);
    if (match) {
      const firstPart = parseSegment(match[1].trim());
      const secondPart = parseSegment(match[2].trim());

      if (firstPart.time !== null || secondPart.time !== null) {
        const startTime = firstPart.time;
        const endTime = secondPart.timeEnd ?? secondPart.time;
        return {
          time: startTime,
          timeEnd: endTime,
          confidence: "range",
          status: firstPart.status,
          raw,
        };
      }
    }
  }

  // Single segment
  const segment = parseSegment(raw);
  return { ...segment, raw };
}

/**
 * Parses a single time segment (no compound separators).
 * Returns a partial ParsedTime without the raw field.
 */
function parseSegment(input: string): Omit<ParsedTime, "raw"> {
  const trimmed = input.trim();

  // Range pattern: '17-1800', '05-0600', '17-1800 PILOT'
  // Matches: one or two digit start hour, hyphen, 3-4 digit end time, optional status
  const rangeMatch = trimmed.match(/^(\d{1,2})-(\d{3,4})(?:\s+(\w+))?$/i);
  if (rangeMatch) {
    const startHour = rangeMatch[1].padStart(2, "0");
    const endFormatted = formatMilitaryTime(rangeMatch[2]);
    const statusToken = rangeMatch[3] ? normalizeStatus(rangeMatch[3]) : null;

    if (endFormatted !== null) {
      const startTime = `${startHour}:00`;
      return {
        time: startTime,
        timeEnd: endFormatted,
        confidence: "range",
        status: statusToken,
      };
    }
  }

  // Exact time with optional status: '1300', '0600', '0500 ANCHOR', '1010 boarded'
  const exactMatch = trimmed.match(/^(\d{3,4})(?:\s+(\w+))?$/i);
  if (exactMatch) {
    const formatted = formatMilitaryTime(exactMatch[1]);
    if (formatted !== null) {
      const rawStatus = exactMatch[2] ?? null;
      const statusToken = rawStatus ? normalizeStatus(rawStatus) : null;

      return {
        time: formatted,
        timeEnd: null,
        confidence: "exact",
        // If there was a status token but it didn't normalize, store it raw lowercased
        status: rawStatus ? (statusToken ?? rawStatus.toLowerCase()) : null,
      };
    }
  }

  // Status-only word (no digits): 'boarded', 'docked', 'sailing'
  const statusOnly = normalizeStatus(trimmed);
  if (statusOnly !== null) {
    return {
      time: null,
      timeEnd: null,
      confidence: "unknown",
      status: statusOnly,
    };
  }

  // Nothing matched — return unknown with null time so callers flag for review
  return {
    time: null,
    timeEnd: null,
    confidence: "unknown",
    status: null,
  };
}
