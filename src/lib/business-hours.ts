/**
 * Business Hours Utility
 * Checks department/staff availability based on configurable business hours schedules.
 *
 * BusinessHours JSON format:
 * {
 *   timezone: "America/New_York",
 *   schedule: {
 *     "monday":    { start: "09:00", end: "17:00" },
 *     "tuesday":   { start: "09:00", end: "17:00" },
 *     "wednesday": { start: "09:00", end: "17:00" },
 *     "thursday":  { start: "09:00", end: "17:00" },
 *     "friday":    { start: "09:00", end: "17:00" },
 *     "saturday":  null,
 *     "sunday":    null
 *   }
 * }
 */

export interface DaySchedule {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface BusinessHoursConfig {
  timezone?: string;
  schedule?: Record<string, DaySchedule | null>;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DISPLAY_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Get the schedule for a specific day of the week (0=Sunday, 6=Saturday)
 */
export function getDaySchedule(config: BusinessHoursConfig, dayOfWeek: number): DaySchedule | null {
  if (!config.schedule) return null;
  const dayName = DAY_NAMES[dayOfWeek];
  if (!dayName) return null;
  return config.schedule[dayName] ?? null;
}

/**
 * Parse a time string "HH:mm" into total minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

/**
 * Get the current time in a given timezone as { dayOfWeek, hours, minutes }
 */
function getNowInTimezone(timezone: string, now?: Date): { dayOfWeek: number; hours: number; minutes: number } {
  const d = now ?? new Date();
  try {
    const formatted = d.toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    // Parse e.g. "Mon, 14:30"
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayStr = formatted.substring(0, 3);
    const timePart = formatted.split(", ")[1] ?? "0:0";
    const timeParts = timePart.split(":").map(Number);
    return {
      dayOfWeek: dayMap[dayStr] ?? d.getDay(),
      hours: timeParts[0] ?? 0,
      minutes: timeParts[1] ?? 0,
    };
  } catch {
    // Fallback if timezone is invalid
    return {
      dayOfWeek: d.getDay(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }
}

/**
 * Check if the current time is within business hours
 */
export function isWithinBusinessHours(config: BusinessHoursConfig, timezone?: string, now?: Date): boolean {
  const tz = timezone || config.timezone || "America/New_York";
  const current = getNowInTimezone(tz, now);
  const schedule = getDaySchedule(config, current.dayOfWeek);

  if (!schedule) return false;

  const currentMinutes = current.hours * 60 + current.minutes;
  const startMinutes = parseTimeToMinutes(schedule.start);
  const endMinutes = parseTimeToMinutes(schedule.end);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the next time the business will be open
 * Returns null if no schedule is configured
 */
export function getNextOpenTime(config: BusinessHoursConfig, timezone?: string): string | null {
  const tz = timezone || config.timezone || "America/New_York";
  if (!config.schedule) return null;

  const now = new Date();
  const current = getNowInTimezone(tz, now);

  // Check up to 7 days ahead
  for (let offset = 0; offset <= 7; offset++) {
    const checkDay = (current.dayOfWeek + offset) % 7;
    const schedule = getDaySchedule(config, checkDay);

    if (!schedule) continue;

    // If it's today and we're before the start time, return today's start
    if (offset === 0) {
      const currentMinutes = current.hours * 60 + current.minutes;
      const startMinutes = parseTimeToMinutes(schedule.start);
      if (currentMinutes < startMinutes) {
        return `today at ${formatTime12h(schedule.start)}`;
      }
      // If we're still within hours, we're currently open
      const endMinutes = parseTimeToMinutes(schedule.end);
      if (currentMinutes < endMinutes) {
        return null; // Currently open
      }
      continue;
    }

    const dayName = DISPLAY_DAY_NAMES[checkDay];
    return `${dayName} at ${formatTime12h(schedule.start)}`;
  }

  return null;
}

/**
 * Format a 24h time string to 12h display
 */
function formatTime12h(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format business hours for inclusion in AI system prompt
 */
export function formatBusinessHoursForPrompt(config: BusinessHoursConfig): string {
  if (!config.schedule) return "Business hours not configured.";

  const lines: string[] = [];
  const tz = config.timezone || "America/New_York";

  for (let day = 0; day < 7; day++) {
    const schedule = getDaySchedule(config, day);
    const dayName = DISPLAY_DAY_NAMES[day];
    if (schedule) {
      lines.push(`  ${dayName}: ${formatTime12h(schedule.start)} - ${formatTime12h(schedule.end)}`);
    } else {
      lines.push(`  ${dayName}: Closed`);
    }
  }

  return `Business Hours (${tz}):\n${lines.join("\n")}`;
}

/**
 * Get a default business hours config (Mon-Fri 9-5)
 */
export function getDefaultBusinessHours(): BusinessHoursConfig {
  return {
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
}
