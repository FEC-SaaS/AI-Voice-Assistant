import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiKey, apiError, apiSuccess, checkRateLimit } from "@/lib/api-middleware";
import { db } from "@/lib/db";

/**
 * Get organization ID from either API key or Clerk session
 */
async function getOrgId(request: NextRequest): Promise<{ orgId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const apiAuth = await withApiKey(request);
    if ("context" in apiAuth) {
      return { orgId: apiAuth.context.organizationId };
    }
    return { error: apiAuth.error };
  }

  const { orgId } = await auth();
  if (!orgId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Provide API key in Authorization header or use session auth." },
        { status: 401 }
      ),
    };
  }

  return { orgId };
}

/**
 * Generate available time slots for a given date
 */
function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  duration: number,
  bufferAfter: number,
  existingAppointments: { scheduledAt: Date; endAt: Date }[]
): string[] {
  const slots: string[] = [];
  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startHour = startParts[0] ?? 9;
  const startMin = startParts[1] ?? 0;
  const endHour = endParts[0] ?? 17;
  const endMin = endParts[1] ?? 0;

  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Check if slot doesn't overlap with existing appointments
    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(apt.endAt);
      // Add buffer after existing appointment
      aptEnd.setMinutes(aptEnd.getMinutes() + bufferAfter);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (!hasConflict && slotEnd <= dayEnd) {
      slots.push(slotStart.toISOString());
    }

    // Move to next slot
    slotStart.setMinutes(slotStart.getMinutes() + duration + bufferAfter);
  }

  return slots;
}

/**
 * GET /api/v1/appointments/available-slots
 * Get available time slots for booking appointments
 *
 * Query parameters:
 * - date: YYYY-MM-DD (required)
 * - duration: meeting duration in minutes (default: 30)
 * - days: number of days to check (default: 1, max: 7)
 */
export async function GET(request: NextRequest) {
  const authResult = await getOrgId(request);
  if ("error" in authResult) return authResult.error;

  const { orgId } = authResult;

  // Rate limiting
  if (request.headers.get("authorization")) {
    const rateLimit = checkRateLimit(orgId, 100, 60000);
    if (!rateLimit.allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30");
    const days = Math.min(parseInt(searchParams.get("days") || "1"), 7);

    if (!dateParam) {
      return apiError("date parameter is required (YYYY-MM-DD format)", 400);
    }

    // Get calendar settings
    const settings = await db.calendarSettings.findUnique({
      where: { organizationId: orgId },
    });

    // Use defaults if no settings
    const availableDays = settings?.availableDays as number[] || [1, 2, 3, 4, 5];
    const startTime = settings?.startTime || "09:00";
    const endTime = settings?.endTime || "17:00";
    const bufferAfter = settings?.bufferAfter || 15;
    const minNoticeHours = settings?.minNoticeTime || 24;
    const maxAdvanceBooking = settings?.maxAdvanceBooking || 30;

    const now = new Date();
    const minNoticeDate = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
    const maxBookingDate = new Date(now.getTime() + maxAdvanceBooking * 24 * 60 * 60 * 1000);

    const results: { date: string; slots: string[]; available: boolean; message?: string }[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(dateParam);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0] || dateParam;

      // Check if date is too far in the past
      if (date < new Date(now.toDateString())) {
        results.push({
          date: dateStr,
          slots: [],
          available: false,
          message: "Cannot book appointments in the past",
        });
        continue;
      }

      // Check if date is too far in the future
      if (date > maxBookingDate) {
        results.push({
          date: dateStr,
          slots: [],
          available: false,
          message: `Cannot book more than ${maxAdvanceBooking} days in advance`,
        });
        continue;
      }

      // Check if day of week is available
      const dayOfWeek = date.getDay();
      if (!availableDays.includes(dayOfWeek)) {
        results.push({
          date: dateStr,
          slots: [],
          available: false,
          message: "This day is not available for appointments",
        });
        continue;
      }

      // Get existing appointments for the day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const existingAppointments = await db.appointment.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: {
          scheduledAt: true,
          endAt: true,
        },
      });

      // Generate available slots
      const slots = generateTimeSlots(
        date,
        startTime,
        endTime,
        duration,
        bufferAfter,
        existingAppointments
      );

      // Filter out slots that don't meet min notice requirement
      const availableSlots = slots.filter((slot) => new Date(slot) >= minNoticeDate);

      results.push({
        date: dateStr,
        slots: availableSlots,
        available: availableSlots.length > 0,
      });
    }

    return apiSuccess({
      availability: results,
      settings: {
        timezone: settings?.timeZone || "America/New_York",
        available_days: availableDays,
        working_hours: {
          start: startTime,
          end: endTime,
        },
        duration_minutes: duration,
        min_notice_hours: minNoticeHours,
        max_advance_days: maxAdvanceBooking,
      },
    });
  } catch (error) {
    console.error("[API] GET /appointments/available-slots error:", error);
    return apiError("Failed to fetch available slots", 500);
  }
}
