import { describe, it, expect } from "vitest";
import { parseTimeStatus } from "../time-parser";

describe("parseTimeStatus", () => {
  // ── Exact times ────────────────────────────────────────────────────────────

  it("parses 1300 as exact 13:00", () => {
    const result = parseTimeStatus("1300");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("13:00");
    expect(result.timeEnd).toBeNull();
    expect(result.status).toBeNull();
    expect(result.raw).toBe("1300");
  });

  it("parses 0600 as exact 06:00", () => {
    const result = parseTimeStatus("0600");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("06:00");
    expect(result.timeEnd).toBeNull();
    expect(result.status).toBeNull();
  });

  // ── Exact times with status ────────────────────────────────────────────────

  it("parses '0500 ANCHOR' as exact 05:00 with status=anchor", () => {
    const result = parseTimeStatus("0500 ANCHOR");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("05:00");
    expect(result.status).toBe("anchor");
  });

  it("parses '1010 boarded' as exact 10:10 with status=boarded", () => {
    const result = parseTimeStatus("1010 boarded");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("10:10");
    expect(result.status).toBe("boarded");
  });

  it("parses '0200 PILOT' as exact 02:00 with status=pilot", () => {
    const result = parseTimeStatus("0200 PILOT");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("02:00");
    expect(result.status).toBe("pilot");
  });

  // ── Ranges ────────────────────────────────────────────────────────────────

  it("parses '17-1800' as range 17:00-18:00", () => {
    const result = parseTimeStatus("17-1800");
    expect(result.confidence).toBe("range");
    expect(result.time).toBe("17:00");
    expect(result.timeEnd).toBe("18:00");
    expect(result.status).toBeNull();
  });

  it("parses '05-0600' as range 05:00-06:00", () => {
    const result = parseTimeStatus("05-0600");
    expect(result.confidence).toBe("range");
    expect(result.time).toBe("05:00");
    expect(result.timeEnd).toBe("06:00");
    expect(result.status).toBeNull();
  });

  it("parses '17-1800 PILOT' as range 17:00-18:00 with status=pilot", () => {
    const result = parseTimeStatus("17-1800 PILOT");
    expect(result.confidence).toBe("range");
    expect(result.time).toBe("17:00");
    expect(result.timeEnd).toBe("18:00");
    expect(result.status).toBe("pilot");
  });

  // ── Compound with double-dash ──────────────────────────────────────────────

  it("parses '0800 ANCHOR--1800 PILOT' as range 08:00-18:00 with status=anchor", () => {
    const result = parseTimeStatus("0800 ANCHOR--1800 PILOT");
    expect(result.confidence).toBe("range");
    expect(result.time).toBe("08:00");
    expect(result.timeEnd).toBe("18:00");
    expect(result.status).toBe("anchor");
  });

  // ── Approximate keywords ──────────────────────────────────────────────────

  it("parses 'AM' as approximate 06:00", () => {
    const result = parseTimeStatus("AM");
    expect(result.confidence).toBe("approximate");
    expect(result.time).toBe("06:00");
  });

  it("parses 'PM' as approximate 12:00", () => {
    const result = parseTimeStatus("PM");
    expect(result.confidence).toBe("approximate");
    expect(result.time).toBe("12:00");
  });

  it("parses 'LPM' as approximate 15:00", () => {
    const result = parseTimeStatus("LPM");
    expect(result.confidence).toBe("approximate");
    expect(result.time).toBe("15:00");
  });

  // ── Status-only ───────────────────────────────────────────────────────────

  it("parses 'boarded' as unknown confidence with status=boarded", () => {
    const result = parseTimeStatus("boarded");
    expect(result.confidence).toBe("unknown");
    expect(result.time).toBeNull();
    expect(result.status).toBe("boarded");
  });

  // ── Empty/null ────────────────────────────────────────────────────────────

  it("parses empty string as unknown confidence with null time", () => {
    const result = parseTimeStatus("");
    expect(result.confidence).toBe("unknown");
    expect(result.time).toBeNull();
    expect(result.status).toBeNull();
  });

  it("parses null as unknown confidence with null time", () => {
    const result = parseTimeStatus(null);
    expect(result.confidence).toBe("unknown");
    expect(result.time).toBeNull();
  });

  // ── Compound with space separator ─────────────────────────────────────────

  it("parses '0300 ANCHOR 06-0700 PILOT' as range 03:00-07:00 with status=anchor", () => {
    const result = parseTimeStatus("0300 ANCHOR 06-0700 PILOT");
    expect(result.confidence).toBe("range");
    expect(result.time).toBe("03:00");
    expect(result.timeEnd).toBe("07:00");
    expect(result.status).toBe("anchor");
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("preserves raw input on all results", () => {
    const inputs = ["1300", "0500 ANCHOR", "17-1800 PILOT", "boarded", ""];
    for (const input of inputs) {
      const result = parseTimeStatus(input);
      expect(result.raw).toBe(input);
    }
  });

  it("parses case-insensitive status keywords", () => {
    const lc = parseTimeStatus("0600 anchor");
    const uc = parseTimeStatus("0600 ANCHOR");
    expect(lc.status).toBe("anchor");
    expect(uc.status).toBe("anchor");
  });

  it("handles leading and trailing whitespace", () => {
    const result = parseTimeStatus("  1300  ");
    expect(result.confidence).toBe("exact");
    expect(result.time).toBe("13:00");
  });
});
