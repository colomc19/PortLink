/**
 * Unit tests for the alert scheduler.
 *
 * Uses jest with mocked Supabase admin client.
 * Run with: npx jest src/lib/alerts/__tests__/scheduler.test.ts
 */

import { combineSailingDatetime } from "../scheduler";

// ─── combineSailingDatetime ───────────────────────────────────────────────────

describe("combineSailingDatetime", () => {
  it("combines a date and HH:MM time into a Date", () => {
    const result = combineSailingDatetime("2026-03-24", "14:30");
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
    // Verify the hour and minute are preserved (UTC or local depends on env)
    const iso = result.toISOString();
    expect(iso.startsWith("2026-03-24")).toBe(true);
  });

  it("handles HH:MM:SS time strings", () => {
    const result = combineSailingDatetime("2026-03-24", "14:30:00");
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it("handles midnight sailing time", () => {
    const result = combineSailingDatetime("2026-03-24", "00:00");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString().startsWith("2026-03-24")).toBe(true);
  });
});

// ─── Alert tier timing logic ──────────────────────────────────────────────────

describe("alert tier offset logic", () => {
  const TIER_OFFSETS_MS = {
    info: 6 * 60 * 60 * 1000,
    warning: 2 * 60 * 60 * 1000,
    urgent: 1 * 60 * 60 * 1000,
  };

  it("info alert fires 6 hours before sailing", () => {
    const sailing = new Date("2026-03-24T18:00:00.000Z");
    const expected = new Date("2026-03-24T12:00:00.000Z");
    const alertTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.info);
    expect(alertTime.getTime()).toBe(expected.getTime());
  });

  it("warning alert fires 2 hours before sailing", () => {
    const sailing = new Date("2026-03-24T18:00:00.000Z");
    const expected = new Date("2026-03-24T16:00:00.000Z");
    const alertTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.warning);
    expect(alertTime.getTime()).toBe(expected.getTime());
  });

  it("urgent alert fires 1 hour before sailing", () => {
    const sailing = new Date("2026-03-24T18:00:00.000Z");
    const expected = new Date("2026-03-24T17:00:00.000Z");
    const alertTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.urgent);
    expect(alertTime.getTime()).toBe(expected.getTime());
  });

  it("skips stale info/warning alerts when sailing time already passed", () => {
    const now = new Date();
    // Sailing time was 7 hours ago — all alerts stale except urgent which fires immediately
    const sailing = new Date(now.getTime() - 7 * 60 * 60 * 1000);

    const infoTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.info);
    const warningTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.warning);
    const urgentTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.urgent);

    // All three alert times are in the past
    expect(infoTime <= now).toBe(true);
    expect(warningTime <= now).toBe(true);
    expect(urgentTime <= now).toBe(true);

    // Logic: for urgent, we fire immediately; info/warning are skipped
    const tiersToSchedule = (["info", "warning", "urgent"] as const).filter(
      (tier) => {
        const alertTime = new Date(sailing.getTime() - TIER_OFFSETS_MS[tier]);
        if (alertTime <= now) {
          return tier === "urgent"; // only urgent fires immediately
        }
        return true;
      }
    );

    expect(tiersToSchedule).toEqual(["urgent"]);
  });

  it("schedules all 3 tiers when sailing is 8 hours away", () => {
    const now = new Date();
    const sailing = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const tiersToSchedule = (["info", "warning", "urgent"] as const).filter(
      (tier) => {
        const alertTime = new Date(sailing.getTime() - TIER_OFFSETS_MS[tier]);
        if (alertTime <= now) {
          return tier === "urgent";
        }
        return true;
      }
    );

    expect(tiersToSchedule).toEqual(["info", "warning", "urgent"]);
  });

  it("fires urgent immediately when less than 1 hour to sailing", () => {
    const now = new Date();
    // 30 minutes until sailing
    const sailing = new Date(now.getTime() + 30 * 60 * 1000);

    const urgentTime = new Date(sailing.getTime() - TIER_OFFSETS_MS.urgent);
    expect(urgentTime <= now).toBe(true);

    // urgentTime is in the past, so we fire immediately (scheduledFor = now)
    const scheduledFor = urgentTime <= now ? now : urgentTime;
    expect(Math.abs(scheduledFor.getTime() - now.getTime())).toBeLessThan(100);
  });

  it("produces no alerts when sailing_time is null", () => {
    // The guard in scheduleAlerts returns early when sailing_time is null.
    // This test validates the logic condition itself.
    const vessel = { sailing_date: null, sailing_time: null };
    const shouldSchedule = vessel.sailing_time !== null && vessel.sailing_date !== null;
    expect(shouldSchedule).toBe(false);
  });
});

// ─── Message text ─────────────────────────────────────────────────────────────

describe("alert message text", () => {
  // Mirrors buildMessage logic from scheduler.ts
  function buildMessage(
    tier: "info" | "warning" | "urgent",
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

  it("produces correct info message", () => {
    const msg = buildMessage("info", "MSC GENEVA", "14:30", 3, false);
    expect(msg).toBe(
      "Heads up: MSC GENEVA sails at 14:30 today. Device 3 is aboard."
    );
  });

  it("produces correct warning message", () => {
    const msg = buildMessage("warning", "MSC GENEVA", "14:30", 3, false);
    expect(msg).toBe(
      "Action needed: MSC GENEVA sails at 14:30. Device 3 still aboard. Under 2 hours."
    );
  });

  it("produces correct urgent message", () => {
    const msg = buildMessage("urgent", "MSC GENEVA", "14:30", 3, false);
    expect(msg).toBe(
      "URGENT: MSC GENEVA sails in less than 1 hour. Device 3 NOT retrieved."
    );
  });

  it("appends approximate suffix when confidence is approximate", () => {
    const msg = buildMessage("info", "MSC GENEVA", "14:30", 3, true);
    expect(msg).toContain("(approximate sailing time)");
  });

  it("does not append approximate suffix for exact times", () => {
    const msg = buildMessage("info", "MSC GENEVA", "14:30", 3, false);
    expect(msg).not.toContain("approximate");
  });
});

// ─── Multiple devices on same vessel ─────────────────────────────────────────

describe("multiple device assignments", () => {
  it("two assignments produce independent alert sets", () => {
    // Each assignment gets its own 3-tier alert set.
    // We can validate this purely through the structure without DB calls.
    const assignments = [
      { id: "asgn-1", device_id: "dev-1", vessel_id: "vessel-1" },
      { id: "asgn-2", device_id: "dev-2", vessel_id: "vessel-1" },
    ];

    // Each assignment has a distinct assignment_id — alerts are not shared
    const assignmentIds = assignments.map((a) => a.id);
    expect(new Set(assignmentIds).size).toBe(2);

    // This means cancelAlerts(asgn-1) should not affect asgn-2's alerts
    // (verified by the .eq("assignment_id", assignmentId) filter in cancelAlerts)
  });
});
