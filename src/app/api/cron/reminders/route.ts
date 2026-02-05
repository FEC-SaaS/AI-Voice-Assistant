/**
 * Reminder Calls Cron Job
 * Triggered by a scheduler to send reminder calls for upcoming appointments
 *
 * Setup options:
 * 1. Vercel Cron: Add to vercel.json:
 *    { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }] }
 *
 * 2. External cron (e.g., cron-job.org):
 *    - URL: https://yourdomain.com/api/cron/reminders
 *    - Method: POST
 *    - Header: Authorization: Bearer YOUR_CRON_SECRET
 *    - Schedule: Every hour
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAppointmentsNeedingReminders,
  initiateReminderCall,
} from "@/lib/reminder-calls";
import { sendAppointmentReminder } from "@/lib/email";
import { sendAppointmentSms } from "@/lib/sms";
import { db } from "@/lib/db";

// Verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  return token === cronSecret;
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    callsInitiated: 0,
    emailsSent: 0,
    smsSent: 0,
    errors: [] as string[],
  };

  try {
    console.log("[Reminder Cron] Starting reminder job...");

    // Get appointments needing reminders (default 24 hours before)
    const appointments = await getAppointmentsNeedingReminders(24);
    console.log(`[Reminder Cron] Found ${appointments.length} appointments needing reminders`);

    for (const appointment of appointments) {
      try {
        // Get full appointment details for email
        const fullAppointment = await db.appointment.findUnique({
          where: { id: appointment.id },
          include: {
            organization: {
              select: { name: true, settings: true },
            },
          },
        });

        if (!fullAppointment) continue;

        const settings = fullAppointment.organization.settings as Record<string, unknown> | null;
        const branding = {
          businessName: (settings?.emailBusinessName as string) || fullAppointment.organization.name,
          fromEmail: settings?.emailFromAddress as string | undefined,
          replyToEmail: settings?.emailReplyTo as string | undefined,
          primaryColor: settings?.emailPrimaryColor as string | undefined,
          logoUrl: settings?.emailLogoUrl as string | undefined,
        };

        // Send email reminder if attendee has email
        if (fullAppointment.attendeeEmail) {
          try {
            await sendAppointmentReminder(
              fullAppointment.attendeeEmail,
              fullAppointment.attendeeName || "there",
              {
                title: fullAppointment.title,
                scheduledAt: fullAppointment.scheduledAt,
                duration: fullAppointment.duration,
                meetingType: fullAppointment.meetingType,
                meetingLink: fullAppointment.meetingLink,
                location: fullAppointment.location,
                phoneNumber: fullAppointment.phoneNumber,
                appointmentId: fullAppointment.id,
              },
              24, // hours until
              branding
            );
            results.emailsSent++;
            console.log(`[Reminder Cron] Email sent for appointment ${appointment.id}`);
          } catch (error) {
            const errorMsg = `Email failed for ${appointment.id}: ${error instanceof Error ? error.message : "Unknown"}`;
            results.errors.push(errorMsg);
            console.error(`[Reminder Cron] ${errorMsg}`);
          }
        }

        // Send SMS reminder if attendee has phone number (default reminder method)
        const smsReminderEnabled = settings?.smsRemindersEnabled !== false;

        if (appointment.attendeePhone && smsReminderEnabled && !fullAppointment.smsReminderSentAt) {
          try {
            const smsResult = await sendAppointmentSms({
              appointmentId: appointment.id,
              type: "reminder",
            });
            if (smsResult.success) {
              results.smsSent++;
              console.log(`[Reminder Cron] SMS sent for appointment ${appointment.id}`);
              // Mark SMS reminder as sent
              await db.appointment.update({
                where: { id: appointment.id },
                data: { smsReminderSentAt: new Date() },
              });
            } else {
              const errorMsg = `SMS failed for ${appointment.id}: ${smsResult.error}`;
              results.errors.push(errorMsg);
              console.error(`[Reminder Cron] ${errorMsg}`);
            }
          } catch (error) {
            const errorMsg = `SMS error for ${appointment.id}: ${error instanceof Error ? error.message : "Unknown"}`;
            results.errors.push(errorMsg);
            console.error(`[Reminder Cron] ${errorMsg}`);
          }
        }

        // Optionally initiate phone reminder for high-value appointments
        // Only if phone reminders are explicitly enabled and SMS wasn't sent
        const phoneReminderEnabled = settings?.phoneRemindersEnabled === true; // Disabled by default

        if (appointment.attendeePhone && phoneReminderEnabled && !results.smsSent) {
          try {
            const callResult = await initiateReminderCall(appointment.id);
            if (callResult.success) {
              results.callsInitiated++;
              console.log(`[Reminder Cron] Call initiated for appointment ${appointment.id}`);
            } else {
              const errorMsg = `Call failed for ${appointment.id}: ${callResult.error}`;
              results.errors.push(errorMsg);
              console.error(`[Reminder Cron] ${errorMsg}`);
            }
          } catch (error) {
            const errorMsg = `Call error for ${appointment.id}: ${error instanceof Error ? error.message : "Unknown"}`;
            results.errors.push(errorMsg);
            console.error(`[Reminder Cron] ${errorMsg}`);
          }
        }

        // Mark email reminder as sent
        if (fullAppointment.attendeeEmail) {
          await db.appointment.update({
            where: { id: appointment.id },
            data: { reminderSentAt: new Date() },
          });
        }
      } catch (error) {
        const errorMsg = `Failed to process appointment ${appointment.id}: ${error instanceof Error ? error.message : "Unknown"}`;
        results.errors.push(errorMsg);
        console.error(`[Reminder Cron] ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Reminder Cron] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      appointmentsProcessed: appointments.length,
      ...results,
    });
  } catch (error) {
    console.error("[Reminder Cron] Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        ...results,
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing/manual trigger with proper auth
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { status: "Reminder cron endpoint", message: "Use POST with authorization to trigger" },
      { status: 200 }
    );
  }

  // Redirect to POST handler
  return POST(request);
}
