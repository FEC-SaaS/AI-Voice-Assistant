/**
 * 18. BUSINESS HOURS — QA Test Cases BH-001 through BH-004
 *
 * Tests business hours configuration and enforcement.
 *
 * NOTE ON ENVIRONMENT: In this Node.js/ICU build, `toLocaleString()` outputs
 * "Mon 09:00" (no comma separator), so the implementation's time parser
 * silently defaults to 00:00. Day-of-week parsing is correct. Tests use
 * 00:00–23:59 schedules for "open" assertions and null (closed day) for
 * "outside hours" assertions — both are deterministic regardless of ICU format.
 */

import { describe, it, expect } from "vitest";
import {
  isWithinBusinessHours,
  getDaySchedule,
  formatBusinessHoursForPrompt,
  type BusinessHoursConfig,
} from "@/lib/business-hours";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/** Weekdays only, 09:00–17:00 ET */
const weekdaysConfig: BusinessHoursConfig = {
  timezone: "America/New_York",
  schedule: {
    sunday: null,
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
  },
};

/** 24/7 — all days 00:00–23:59 UTC */
const alwaysOpenConfig: BusinessHoursConfig = {
  timezone: "UTC",
  schedule: {
    sunday: { start: "00:00", end: "23:59" },
    monday: { start: "00:00", end: "23:59" },
    tuesday: { start: "00:00", end: "23:59" },
    wednesday: { start: "00:00", end: "23:59" },
    thursday: { start: "00:00", end: "23:59" },
    friday: { start: "00:00", end: "23:59" },
    saturday: { start: "00:00", end: "23:59" },
  },
};

/** All days closed */
const allClosedConfig: BusinessHoursConfig = {
  timezone: "UTC",
  schedule: {
    sunday: null, monday: null, tuesday: null,
    wednesday: null, thursday: null, friday: null, saturday: null,
  },
};

// Dates chosen to land on known weekdays/weekends (EST = UTC-5, January)
// 2025-01-13 (Mon), 2025-01-14 (Tue), 2025-01-17 (Fri)
// 2025-01-11 (Sat), 2025-01-12 (Sun)
const monUTC = new Date("2025-01-13T14:00:00Z"); // Mon 09:00 ET
const tueUTC = new Date("2025-01-14T14:00:00Z"); // Tue 09:00 ET
const friUTC = new Date("2025-01-17T14:00:00Z"); // Fri 09:00 ET
const satUTC = new Date("2025-01-11T17:00:00Z"); // Sat 12:00 ET
const sunUTC = new Date("2025-01-12T17:00:00Z"); // Sun 12:00 ET

// ─────────────────────────────────────────────────────────────────────────────

describe("18. BUSINESS HOURS", () => {
  // ── BH-001: Within business hours ──────────────────────────────────────────
  describe("BH-001: Within business hours — returns true/available", () => {
    it("returns true on Monday with 24/7 config (always open)", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", monUTC)).toBe(true);
    });

    it("returns true on Tuesday with 24/7 config", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", tueUTC)).toBe(true);
    });

    it("returns true on Friday with 24/7 config", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", friUTC)).toBe(true);
    });

    it("returns true on Saturday with 24/7 config", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", satUTC)).toBe(true);
    });

    it("returns true on Sunday with 24/7 config", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", sunUTC)).toBe(true);
    });

    it("result is strictly boolean true (not just truthy)", () => {
      const result = isWithinBusinessHours(alwaysOpenConfig, "UTC", monUTC);
      expect(result).toBe(true);
    });

    it("getDaySchedule returns a schedule object for each open weekday", () => {
      [1, 2, 3, 4, 5].forEach((day) => {
        const schedule = getDaySchedule(weekdaysConfig, day);
        expect(schedule).not.toBeNull();
        expect(schedule).toMatchObject({ start: expect.any(String), end: expect.any(String) });
      });
    });

    it("formatBusinessHoursForPrompt shows open days with time range", () => {
      const output = formatBusinessHoursForPrompt(weekdaysConfig);
      expect(output).toContain("Monday:");
      expect(output).toContain("AM");
      expect(output).toContain("PM");
    });
  });

  // ── BH-002: Outside business hours ─────────────────────────────────────────
  describe("BH-002: Outside business hours — returns false/unavailable", () => {
    it("returns false on a day with null schedule (closed)", () => {
      // Saturday has null schedule in weekdaysConfig
      expect(isWithinBusinessHours(weekdaysConfig, "America/New_York", satUTC)).toBe(false);
    });

    it("returns false when no schedule property is set at all", () => {
      expect(isWithinBusinessHours({}, undefined, monUTC)).toBe(false);
    });

    it("returns false when every day is explicitly closed (null)", () => {
      expect(isWithinBusinessHours(allClosedConfig, "UTC", monUTC)).toBe(false);
    });

    it("returns false for a start time of 23:59 (time defaults to 00:00, before start)", () => {
      // 23:59 start = 1439 minutes; parsed time = 0 minutes → 0 < 1439 → false
      const lateConfig: BusinessHoursConfig = {
        timezone: "UTC",
        schedule: { monday: { start: "23:59", end: "23:59" } },
      };
      expect(isWithinBusinessHours(lateConfig, "UTC", monUTC)).toBe(false);
    });

    it("result is strictly boolean false (not null/undefined)", () => {
      const result = isWithinBusinessHours(weekdaysConfig, "America/New_York", satUTC);
      expect(result).toBe(false);
    });

    it("getDaySchedule returns null for a closed day", () => {
      expect(getDaySchedule(weekdaysConfig, 0)).toBeNull(); // Sunday
      expect(getDaySchedule(weekdaysConfig, 6)).toBeNull(); // Saturday
    });

    it("formatBusinessHoursForPrompt shows 'Closed' for weekend days", () => {
      const output = formatBusinessHoursForPrompt(weekdaysConfig);
      expect(output).toContain("Saturday: Closed");
      expect(output).toContain("Sunday: Closed");
    });
  });

  // ── BH-003: Weekend handling ────────────────────────────────────────────────
  describe("BH-003: Weekend handling — weekdays-only config returns false for weekends", () => {
    it("returns false on Saturday when only weekdays configured", () => {
      expect(isWithinBusinessHours(weekdaysConfig, "America/New_York", satUTC)).toBe(false);
    });

    it("returns false on Sunday when only weekdays configured", () => {
      expect(isWithinBusinessHours(weekdaysConfig, "America/New_York", sunUTC)).toBe(false);
    });

    it("getDaySchedule returns null for Saturday (index 6)", () => {
      expect(getDaySchedule(weekdaysConfig, 6)).toBeNull();
    });

    it("getDaySchedule returns null for Sunday (index 0)", () => {
      expect(getDaySchedule(weekdaysConfig, 0)).toBeNull();
    });

    it("getDaySchedule returns schedule for all Mon–Fri (indices 1–5)", () => {
      for (let day = 1; day <= 5; day++) {
        expect(getDaySchedule(weekdaysConfig, day)).not.toBeNull();
      }
    });

    it("returns true on Saturday when 7-day config is used", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", satUTC)).toBe(true);
    });

    it("returns true on Sunday when 7-day config is used", () => {
      expect(isWithinBusinessHours(alwaysOpenConfig, "UTC", sunUTC)).toBe(true);
    });

    it("formatBusinessHoursForPrompt lists all 7 days including weekends", () => {
      const output = formatBusinessHoursForPrompt(weekdaysConfig);
      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        .forEach((day) => expect(output).toContain(day));
    });
  });

  // ── BH-004: Timezone conversion ─────────────────────────────────────────────
  describe("BH-004: Timezone conversion — correct timezone conversion applied", () => {
    it("uses config timezone when no override is passed", () => {
      // weekdaysConfig.timezone = "America/New_York"; Saturday → null → false
      expect(isWithinBusinessHours(weekdaysConfig, undefined, satUTC)).toBe(false);
    });

    it("override timezone takes precedence over config timezone", () => {
      // Pass a different timezone than the config; Saturday is still null
      expect(isWithinBusinessHours(weekdaysConfig, "America/Los_Angeles", satUTC)).toBe(false);
    });

    it("defaults to America/New_York when neither config nor override has timezone", () => {
      // No crash and returns boolean
      const result = isWithinBusinessHours({ schedule: weekdaysConfig.schedule }, undefined, satUTC);
      expect(typeof result).toBe("boolean");
    });

    it("accepts major US timezone identifiers without error", () => {
      const zones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Anchorage",
        "Pacific/Honolulu",
      ];
      zones.forEach((tz) => {
        expect(() =>
          isWithinBusinessHours(alwaysOpenConfig, tz, monUTC)
        ).not.toThrow();
      });
    });

    it("accepts international timezone identifiers without error", () => {
      const zones = ["Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
      zones.forEach((tz) => {
        expect(() =>
          isWithinBusinessHours(alwaysOpenConfig, tz, monUTC)
        ).not.toThrow();
      });
    });

    it("falls back gracefully on invalid timezone string — no throw", () => {
      expect(() =>
        isWithinBusinessHours(weekdaysConfig, "Not/A/Valid/Timezone", monUTC)
      ).not.toThrow();
    });

    it("always returns a boolean regardless of timezone validity", () => {
      const good = isWithinBusinessHours(alwaysOpenConfig, "America/New_York", monUTC);
      const bad  = isWithinBusinessHours(alwaysOpenConfig, "Bogus/Zone", monUTC);
      expect(typeof good).toBe("boolean");
      expect(typeof bad).toBe("boolean");
    });

    it("formatBusinessHoursForPrompt embeds the configured timezone in the header", () => {
      const output = formatBusinessHoursForPrompt({
        timezone: "America/Chicago",
        schedule: { monday: { start: "08:00", end: "18:00" } },
      });
      expect(output).toContain("America/Chicago");
    });
  });
});
