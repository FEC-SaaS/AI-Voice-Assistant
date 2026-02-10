import { NextRequest, NextResponse } from "next/server";

// Dynamic imports to avoid build-time issues
const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

const getEmailFunctions = async () => {
  const { sendAppointmentReminder } = await import("@/lib/email");
  return { sendAppointmentReminder };
};

/**
 * Appointment Reminders Cron Job
 *
 * This endpoint sends reminder emails for upcoming appointments:
 * - Checks for appointments that need reminders based on organization settings
 * - Sends email reminders to attendees
 * - Marks appointments as reminder sent to avoid duplicates
 *
 * Run frequency: Every 15 minutes (recommended)
 * Vercel Cron: 0,15,30,45 * * * *
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting appointment reminders check");

    const db = await getDb();
    const { sendAppointmentReminder } = await getEmailFunctions();

    const now = new Date();
    let remindersSent = 0;
    let errors = 0;

    // Get all calendar settings to know reminder preferences
    const calendarSettings = await db.calendarSettings.findMany({
      where: {
        sendReminder: true,
      },
      select: {
        organizationId: true,
        reminderHoursBefore: true,
      },
    });

    // Process each organization's reminders
    for (const settings of calendarSettings) {
      const reminderHours = settings.reminderHoursBefore || 24;

      // Calculate the time window for sending reminders
      // We want appointments that are reminderHours away from now (with a 15-min buffer)
      const reminderWindowStart = new Date(now.getTime() + (reminderHours - 0.25) * 60 * 60 * 1000);
      const reminderWindowEnd = new Date(now.getTime() + (reminderHours + 0.25) * 60 * 60 * 1000);

      // Find appointments that need reminders
      const appointmentsNeedingReminder = await db.appointment.findMany({
        where: {
          organizationId: settings.organizationId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: {
            gte: reminderWindowStart,
            lte: reminderWindowEnd,
          },
          reminderSentAt: null, // Haven't sent reminder yet
          attendeeEmail: { not: null }, // Has email to send to
        },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          duration: true,
          meetingType: true,
          meetingLink: true,
          location: true,
          phoneNumber: true,
          attendeeName: true,
          attendeeEmail: true,
        },
      });

      console.log(
        `[Cron] Found ${appointmentsNeedingReminder.length} appointments needing reminders for org ${settings.organizationId}`
      );

      // Send reminders
      for (const appointment of appointmentsNeedingReminder) {
        if (!appointment.attendeeEmail) continue;

        try {
          await sendAppointmentReminder(
            appointment.attendeeEmail,
            appointment.attendeeName || "there",
            {
              title: appointment.title,
              scheduledAt: appointment.scheduledAt,
              duration: appointment.duration,
              meetingType: appointment.meetingType,
              meetingLink: appointment.meetingLink,
              location: appointment.location,
              phoneNumber: appointment.phoneNumber,
            },
            reminderHours
          );

          // Mark reminder as sent
          await db.appointment.update({
            where: { id: appointment.id },
            data: { reminderSentAt: now },
          });

          remindersSent++;
          console.log(`[Cron] Sent reminder for appointment ${appointment.id}`);
        } catch (error) {
          console.error(`[Cron] Failed to send reminder for appointment ${appointment.id}:`, error);
          errors++;
        }
      }
    }

    // Also send reminders for organizations without custom settings (use defaults)
    const orgsWithSettings = calendarSettings.map((s) => s.organizationId);

    // Default reminder: 24 hours before
    const defaultReminderHours = 24;
    const defaultWindowStart = new Date(now.getTime() + (defaultReminderHours - 0.25) * 60 * 60 * 1000);
    const defaultWindowEnd = new Date(now.getTime() + (defaultReminderHours + 0.25) * 60 * 60 * 1000);

    const defaultAppointments = await db.appointment.findMany({
      where: {
        organizationId: { notIn: orgsWithSettings },
        status: { in: ["scheduled", "confirmed"] },
        scheduledAt: {
          gte: defaultWindowStart,
          lte: defaultWindowEnd,
        },
        reminderSentAt: null,
        attendeeEmail: { not: null },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        meetingType: true,
        meetingLink: true,
        location: true,
        phoneNumber: true,
        attendeeName: true,
        attendeeEmail: true,
      },
    });

    console.log(`[Cron] Found ${defaultAppointments.length} appointments needing default reminders`);

    for (const appointment of defaultAppointments) {
      if (!appointment.attendeeEmail) continue;

      try {
        await sendAppointmentReminder(
          appointment.attendeeEmail,
          appointment.attendeeName || "there",
          {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
          },
          defaultReminderHours
        );

        await db.appointment.update({
          where: { id: appointment.id },
          data: { reminderSentAt: now },
        });

        remindersSent++;
        console.log(`[Cron] Sent default reminder for appointment ${appointment.id}`);
      } catch (error) {
        console.error(`[Cron] Failed to send default reminder for appointment ${appointment.id}:`, error);
        errors++;
      }
    }

    console.log(`[Cron] Appointment reminders complete: ${remindersSent} sent, ${errors} errors`);

    return NextResponse.json({
      success: true,
      message: "Appointment reminders processed",
      remindersSent,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Appointment reminders error:", error);
    return NextResponse.json(
      {
        error: "Reminder processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Vercel Cron jobs use GET requests
export async function GET(req: NextRequest) {
  return POST(req);
}
