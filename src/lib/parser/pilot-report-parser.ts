import * as cheerio from "cheerio";
import { parseTimeStatus } from "./time-parser";
import type { ParsedRow, ParseResult } from "./types";

// Column indices within a row — detected dynamically from headers
interface ColumnMap {
  vesselName: number;
  date: number;
  timeStatus: number;
  terminal: number;
  agent: number;
  notes: number;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Attempts to extract a YYYY-MM-DD date from common formats found in pilot
 * report emails:
 *   - 'Monday, March 24, 2026'
 *   - 'March 24, 2026'
 *   - '03/24/2026' or '03/24'
 *   - Subject line: 'Pilot Report 03/24'
 */
export function extractReportDate(text: string): string | null {
  // Long date: 'March 24, 2026' or 'Monday, March 24, 2026'
  const longDate = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (longDate) {
    return parseLongDate(longDate[1], longDate[2], longDate[3]);
  }

  // Medium date: 'March 24, 2026'
  const medDate = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (medDate) {
    return parseLongDate(medDate[1], medDate[2], medDate[3]);
  }

  // Numeric with year: '03/24/2026'
  const numDateFull = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numDateFull) {
    const m = numDateFull[1].padStart(2, "0");
    const d = numDateFull[2].padStart(2, "0");
    return `${numDateFull[3]}-${m}-${d}`;
  }

  return null;
}

function parseLongDate(
  monthStr: string,
  dayStr: string,
  yearStr: string
): string | null {
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const month = months[monthStr.toLowerCase()];
  if (!month) return null;
  const day = dayStr.padStart(2, "0");
  return `${yearStr}-${month}-${day}`;
}

/**
 * Parses a date cell value like '03/24' into YYYY-MM-DD using the report year
 * as context. Handles roll-over where report date is in December but row date
 * is January (treat as next year).
 */
function parseCellDate(
  raw: string,
  reportDate: string | null
): string | null {
  if (!raw || raw.trim() === "") return null;

  // Full date with year
  const withYear = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (withYear) {
    return `${withYear[3]}-${withYear[1].padStart(2, "0")}-${withYear[2].padStart(2, "0")}`;
  }

  // Month/day without year — infer year from reportDate
  const monthDay = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (monthDay) {
    const month = parseInt(monthDay[1], 10);
    const day = parseInt(monthDay[2], 10);

    let year = new Date().getFullYear();
    if (reportDate) {
      const reportYear = parseInt(reportDate.slice(0, 4), 10);
      const reportMonth = parseInt(reportDate.slice(5, 7), 10);
      year = reportYear;
      // Roll forward if the report is in Dec but the row is in Jan
      if (reportMonth === 12 && month === 1) year += 1;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

// ─── Column detection ─────────────────────────────────────────────────────────

const COLUMN_PATTERNS: Record<keyof ColumnMap, RegExp[]> = {
  vesselName: [/vessel\s*name/i, /vessel/i, /ship/i],
  date: [/^date$/i, /^dt$/i],
  timeStatus: [/time.*status/i, /time/i, /status/i, /eta/i],
  terminal: [/terminal/i, /berth/i, /dock/i],
  agent: [/agent/i],
  notes: [/notes?/i, /remarks?/i, /comment/i],
};

function detectColumns(headers: string[]): ColumnMap {
  const result: Partial<ColumnMap> = {};

  for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      const idx = headers.findIndex((h) => pattern.test(h.trim()));
      if (idx !== -1 && !(key in result)) {
        result[key as keyof ColumnMap] = idx;
        break;
      }
    }
    if (!(key in result)) {
      result[key as keyof ColumnMap] = -1;
    }
  }

  // Fallback: if vesselName not detected, assume column 0
  if (result.vesselName === -1) result.vesselName = 0;

  return result as ColumnMap;
}

function cellAt(cells: string[], index: number): string | null {
  if (index < 0 || index >= cells.length) return null;
  const val = cells[index].trim();
  return val === "" ? null : val;
}

// ─── Row building ─────────────────────────────────────────────────────────────

function buildParsedRow(
  cells: string[],
  colMap: ColumnMap,
  section: "arrivals" | "sailings",
  reportDate: string | null
): ParsedRow | null {
  const rawVesselName = cellAt(cells, colMap.vesselName);
  if (!rawVesselName) return null;

  const rawDate = cellAt(cells, colMap.date);
  const rawTimeStatus = cellAt(cells, colMap.timeStatus);
  const rawTerminal = cellAt(cells, colMap.terminal);
  const rawAgent = cellAt(cells, colMap.agent);
  const rawNotes = cellAt(cells, colMap.notes);

  const parsedDate = parseCellDate(rawDate ?? "", reportDate);
  const parsedTime = parseTimeStatus(rawTimeStatus);

  const needsReview =
    parsedTime.confidence === "unknown" && rawTimeStatus !== null;
  const reviewReason = needsReview
    ? `Could not parse time/status: "${rawTimeStatus}"`
    : null;

  return {
    rawVesselName,
    rawDate,
    rawTimeStatus,
    rawTerminal,
    rawAgent,
    rawNotes,
    section,
    parsedDate,
    parsedTime,
    needsReview,
    reviewReason,
  };
}

// ─── HTML table parser ────────────────────────────────────────────────────────

function parseHtmlTables(
  $: cheerio.CheerioAPI,
  reportDate: string | null,
  errors: string[]
): ParsedRow[] {
  const rows: ParsedRow[] = [];

  // Find all tables in document order and try to associate each with a section
  $("table").each((tableIndex, tableEl) => {
    // Look backwards from the table for the nearest heading/paragraph that
    // names the section.
    let section: "arrivals" | "sailings" | null = null;

    // Traverse preceding siblings and parent's preceding siblings
    const checkText = (text: string) => {
      const upper = text.toUpperCase();
      if (upper.includes("ARRIVAL")) section = "arrivals";
      else if (upper.includes("SAILING") || upper.includes("DEPARTURE"))
        section = "sailings";
    };

    // Check all text nodes before this table in the document
    let prevEl = $(tableEl).prev();
    let attempts = 0;
    while (prevEl.length && attempts < 10) {
      checkText(prevEl.text());
      if (section) break;
      prevEl = prevEl.prev();
      attempts++;
    }

    // Fall back: first table = arrivals, second = sailings
    if (!section) {
      section = tableIndex === 0 ? "arrivals" : "sailings";
    }

    // Extract header row
    const headerCells: string[] = [];
    const firstRow = $(tableEl).find("tr").first();
    firstRow.find("th, td").each((_, cell) => {
      headerCells.push($(cell).text().trim());
    });

    if (headerCells.length === 0) {
      errors.push(`Table ${tableIndex}: no header row found`);
      return;
    }

    const colMap = detectColumns(headerCells);

    // Data rows (skip the header row)
    $(tableEl)
      .find("tr")
      .slice(1)
      .each((_, rowEl) => {
        const cells: string[] = [];
        $(rowEl)
          .find("td")
          .each((_, cell) => {
            cells.push($(cell).text().trim());
          });

        try {
          const parsed = buildParsedRow(cells, colMap, section!, reportDate);
          if (parsed) rows.push(parsed);
        } catch (err) {
          errors.push(
            `Table ${tableIndex} row parse error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      });
  });

  return rows;
}

// ─── Preformatted text parser ─────────────────────────────────────────────────

/**
 * Parses pipe-delimited or space-aligned preformatted text blocks.
 * Handles both '|' delimited rows and fixed-width columns.
 */
function parsePreformattedBlock(
  block: string,
  reportDate: string | null,
  errors: string[]
): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = block.split("\n").map((l) => l.trim());

  let currentSection: "arrivals" | "sailings" | null = null;
  let colMap: ColumnMap | null = null;
  let headerLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Section markers
    const upper = line.toUpperCase();
    if (upper.startsWith("ARRIVAL")) {
      currentSection = "arrivals";
      colMap = null;
      headerLineIndex = -1;
      continue;
    }
    if (upper.startsWith("SAILING") || upper.startsWith("DEPARTURE")) {
      currentSection = "sailings";
      colMap = null;
      headerLineIndex = -1;
      continue;
    }

    // Skip separator lines (===, ---, ===)
    if (/^[=\-\s|]+$/.test(line)) continue;

    // Pipe-delimited line
    if (line.includes("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx) => {
          // Some formats have a leading/trailing empty cell from surrounding pipes
          return true;
        });

      // Filter empty leading/trailing cells
      const nonEmptyCells = cells.filter((c, idx) => {
        if (idx === 0 && c === "") return false;
        if (idx === cells.length - 1 && c === "") return false;
        return true;
      });

      if (nonEmptyCells.length === 0) continue;

      // First pipe row in a section = header
      if (colMap === null) {
        colMap = detectColumns(nonEmptyCells);
        headerLineIndex = i;
        continue;
      }

      // Skip separator rows right after header
      if (i === headerLineIndex + 1 && /^[-|]+$/.test(line.replace(/\s/g, "")))
        continue;

      if (!currentSection) {
        errors.push(`Line ${i}: data row found before section heading`);
        continue;
      }

      try {
        const parsed = buildParsedRow(
          nonEmptyCells,
          colMap,
          currentSection,
          reportDate
        );
        if (parsed) rows.push(parsed);
      } catch (err) {
        errors.push(
          `Line ${i} parse error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return rows;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Parses the HTML body of a Pilot Report email into structured row data.
 *
 * Strategy:
 *   1. Load HTML with cheerio
 *   2. Extract report date from visible text / subject hint in <title>
 *   3. Try HTML table parsing first (most common format)
 *   4. If no rows found, fall back to <pre> block text parsing
 *   5. Never throw — all errors are collected and returned
 */
export function parsePilotReportHtml(html: string, subject?: string): ParseResult {
  const errors: string[] = [];
  let rows: ParsedRow[] = [];
  let reportDate: string | null = null;

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch (err) {
    return {
      reportDate: null,
      rows: [],
      errors: [
        `Failed to load HTML: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  // Extract report date from body text or subject
  const bodyText = $("body").text();
  reportDate = extractReportDate(bodyText);
  if (!reportDate && subject) {
    reportDate = extractReportDate(subject);
  }

  // Strategy 1: HTML tables
  if ($("table").length > 0) {
    rows = parseHtmlTables($, reportDate, errors);
  }

  // Strategy 2: <pre> blocks (fallback or in addition to tables)
  if (rows.length === 0) {
    $("pre").each((_, preEl) => {
      const preText = $(preEl).text();
      const preRows = parsePreformattedBlock(preText, reportDate, errors);
      rows.push(...preRows);
    });
  }

  // Strategy 3: if still no rows, try parsing the entire body as preformatted text
  if (rows.length === 0) {
    const plainText = $("body").text();
    const textRows = parsePreformattedBlock(plainText, reportDate, errors);
    rows.push(...textRows);
    if (textRows.length === 0) {
      errors.push("No parseable content found — check email format");
    }
  }

  return { reportDate, rows, errors };
}
