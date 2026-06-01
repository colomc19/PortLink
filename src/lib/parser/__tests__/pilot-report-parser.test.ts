import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parsePilotReportHtml, extractReportDate } from "../pilot-report-parser";

const fixturesDir = join(__dirname, "fixtures");

function loadFixture(filename: string): string {
  return readFileSync(join(fixturesDir, filename), "utf-8");
}

// ─── extractReportDate ─────────────────────────────────────────────────────

describe("extractReportDate", () => {
  it("extracts date from long format with day name", () => {
    expect(extractReportDate("Monday, March 24, 2026")).toBe("2026-03-24");
  });

  it("extracts date from medium format without day name", () => {
    expect(extractReportDate("March 24, 2026")).toBe("2026-03-24");
  });

  it("extracts date from numeric format with year", () => {
    expect(extractReportDate("03/24/2026")).toBe("2026-03-24");
  });

  it("returns null when no date found", () => {
    expect(extractReportDate("No date here")).toBeNull();
  });

  it("handles date embedded in longer text", () => {
    const text =
      "Mobile Bar Pilots Daily Schedule\nDate: Monday, March 24, 2026\nOn Duty: Pilot John";
    expect(extractReportDate(text)).toBe("2026-03-24");
  });
});

// ─── HTML table format ─────────────────────────────────────────────────────

describe("parsePilotReportHtml - HTML table format", () => {
  const html = loadFixture("sample-pilot-report-html-table.html");
  const result = parsePilotReportHtml(html);

  it("extracts the report date", () => {
    expect(result.reportDate).toBe("2026-03-24");
  });

  it("returns no fatal errors", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("extracts the correct total number of rows", () => {
    // 5 arrivals + 3 sailings = 8
    expect(result.rows).toHaveLength(8);
  });

  it("correctly identifies arrivals section", () => {
    const arrivals = result.rows.filter((r) => r.section === "arrivals");
    expect(arrivals).toHaveLength(5);
  });

  it("correctly identifies sailings section", () => {
    const sailings = result.rows.filter((r) => r.section === "sailings");
    expect(sailings).toHaveLength(3);
  });

  it("extracts vessel name, terminal, and agent correctly", () => {
    const row = result.rows.find((r) => r.rawVesselName === "IVS PINEHURST");
    expect(row).toBeDefined();
    expect(row!.rawTerminal).toBe("Coal Dock");
    expect(row!.rawAgent).toBe("Page & Jones");
  });

  it("parses exact time with status for IVS PINEHURST", () => {
    const row = result.rows.find((r) => r.rawVesselName === "IVS PINEHURST");
    expect(row!.parsedTime.confidence).toBe("exact");
    expect(row!.parsedTime.time).toBe("06:00");
    expect(row!.parsedTime.status).toBe("anchor");
  });

  it("parses range time for OCEAN MARINER", () => {
    const row = result.rows.find((r) => r.rawVesselName === "OCEAN MARINER");
    expect(row!.parsedTime.confidence).toBe("range");
    expect(row!.parsedTime.time).toBe("17:00");
    expect(row!.parsedTime.timeEnd).toBe("18:00");
    expect(row!.parsedTime.status).toBe("pilot");
  });

  it("parses approximate AM for BULK ZENITH", () => {
    const row = result.rows.find((r) => r.rawVesselName === "BULK ZENITH");
    expect(row!.parsedTime.confidence).toBe("approximate");
    expect(row!.parsedTime.time).toBe("06:00");
  });

  it("parses compound ANCHOR--PILOT for FORTUNAGRACHT", () => {
    const row = result.rows.find((r) => r.rawVesselName === "FORTUNAGRACHT");
    expect(row!.parsedTime.confidence).toBe("range");
    expect(row!.parsedTime.time).toBe("08:00");
    expect(row!.parsedTime.timeEnd).toBe("18:00");
    expect(row!.parsedTime.status).toBe("anchor");
  });

  it("parses dates relative to report date", () => {
    const row = result.rows.find((r) => r.rawVesselName === "IVS PINEHURST");
    expect(row!.parsedDate).toBe("2026-03-24");
  });

  it("parses next-day dates correctly", () => {
    const row = result.rows.find((r) => r.rawVesselName === "BULK ZENITH");
    expect(row!.parsedDate).toBe("2026-03-25");
  });

  it("extracts notes when present", () => {
    const row = result.rows.find((r) => r.rawVesselName === "MSC TRIESTE");
    expect(row!.rawNotes).toBe("Draft 38ft");
  });

  it("sets notes to null when cell is empty", () => {
    const row = result.rows.find((r) => r.rawVesselName === "IVS PINEHURST");
    expect(row!.rawNotes).toBeNull();
  });

  it("does not flag exact-time rows as needsReview", () => {
    const row = result.rows.find((r) => r.rawVesselName === "IVS PINEHURST");
    expect(row!.needsReview).toBe(false);
  });
});

// ─── Preformatted text format ─────────────────────────────────────────────

describe("parsePilotReportHtml - preformatted text format", () => {
  const html = loadFixture("sample-pilot-report-preformatted.html");
  const result = parsePilotReportHtml(html);

  it("extracts the report date", () => {
    expect(result.reportDate).toBe("2026-03-25");
  });

  it("extracts the correct number of rows", () => {
    // 4 arrivals + 2 sailings = 6
    expect(result.rows).toHaveLength(6);
  });

  it("correctly identifies arrivals and sailings sections", () => {
    const arrivals = result.rows.filter((r) => r.section === "arrivals");
    const sailings = result.rows.filter((r) => r.section === "sailings");
    expect(arrivals).toHaveLength(4);
    expect(sailings).toHaveLength(2);
  });

  it("extracts RIVER FORTUNE from arrivals with correct time", () => {
    const row = result.rows.find((r) => r.rawVesselName === "RIVER FORTUNE");
    expect(row).toBeDefined();
    expect(row!.parsedTime.confidence).toBe("exact");
    expect(row!.parsedTime.time).toBe("05:00");
    expect(row!.parsedTime.status).toBe("anchor");
  });

  it("parses range for CORAL STAR", () => {
    const row = result.rows.find((r) => r.rawVesselName === "CORAL STAR");
    expect(row!.parsedTime.confidence).toBe("range");
    expect(row!.parsedTime.time).toBe("05:00");
    expect(row!.parsedTime.timeEnd).toBe("06:00");
  });

  it("parses LPM for SEAWISE GIANT", () => {
    const row = result.rows.find((r) => r.rawVesselName === "SEAWISE GIANT");
    expect(row!.parsedTime.confidence).toBe("approximate");
    expect(row!.parsedTime.time).toBe("15:00");
  });

  it("parses compound space-separated pattern for DELTA CARRIER", () => {
    const row = result.rows.find((r) => r.rawVesselName === "DELTA CARRIER");
    expect(row!.parsedTime.confidence).toBe("range");
    expect(row!.parsedTime.time).toBe("03:00");
    expect(row!.parsedTime.status).toBe("anchor");
  });

  it("extracts status-only 'boarded' for NORFOLK TRADER", () => {
    const row = result.rows.find((r) => r.rawVesselName === "NORFOLK TRADER");
    expect(row!.parsedTime.status).toBe("boarded");
  });
});

// ─── Resilience / edge cases ──────────────────────────────────────────────

describe("parsePilotReportHtml - resilience", () => {
  it("returns errors array but does not throw on empty HTML", () => {
    const result = parsePilotReportHtml("<html><body></body></html>");
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns errors but does not throw on completely malformed input", () => {
    const result = parsePilotReportHtml("not html at all <<<>>>");
    expect(Array.isArray(result.rows)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("extracts report date from subject when not in body", () => {
    const html = "<html><body><p>Some content without a date</p></body></html>";
    const result = parsePilotReportHtml(html, "Pilot Report 03/24/2026");
    expect(result.reportDate).toBe("2026-03-24");
  });
});
