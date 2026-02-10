/**
 * SMS Service for Appointment Management
 * Handles appointment reminders, confirmations, and follow-ups via Twilio SMS
 */

import { sendSms, type SendSmsResult } from "./twilio";
import { db } from "./db";

// ============================================
// SMS Templates
// ============================================

interface SmsTemplateData {
  businessName: string;
  customerName: string;
  appointmentTitle: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  confirmUrl?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
}

// Format date for SMS (shorter format for character limit)
function formatSmsDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format time for SMS
function formatSmsTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Template: Appointment Confirmation
export function getConfirmationSmsTemplate(data: SmsTemplateData): string {
  return `${data.businessName}: Hi ${data.customerName}! Your appointment "${data.appointmentTitle}" is confirmed for ${data.appointmentDate} at ${data.appointmentTime} (${data.duration} min). Reply YES to confirm or HELP for options.`;
}

// Template: Appointment Reminder (24 hours before)
export function getReminderSmsTemplate(data: SmsTemplateData): string {
  return `${data.businessName}: Reminder! Your appointment "${data.appointmentTitle}" is tomorrow, ${data.appointmentDate} at ${data.appointmentTime}. Reply YES to confirm, CANCEL to cancel, or HELP for more options.`;
}

// Template: Same-day Reminder (few hours before)
export function getSameDayReminderSmsTemplate(data: SmsTemplateData): string {
  return `${data.businessName}: Your appointment "${data.appointmentTitle}" is today at ${data.appointmentTime}. See you soon! Reply HELP if you need assistance.`;
}

// Template: Appointment Rescheduled
export function getRescheduledSmsTemplate(data: SmsTemplateData, previousDate: string): string {
  return `${data.businessName}: Your appointment has been rescheduled from ${previousDate} to ${data.appointmentDate} at ${data.appointmentTime}. Reply YES to confirm the new time.`;
}

// Template: Appointment Cancelled
export function getCancellationSmsTemplate(data: SmsTemplateData): string {
  return `${data.businessName}: Your appointment "${data.appointmentTitle}" scheduled for ${data.appointmentDate} has been cancelled. Contact us to reschedule.`;
}

// Template: Post-Call Follow-up
export function getPostCallFollowUpSmsTemplate(
  businessName: string,
  customerName: string,
  customMessage?: string
): string {
  if (customMessage) {
    return `${businessName}: ${customMessage}`;
  }
  return `${businessName}: Thanks for speaking with us today, ${customerName}! If you have any questions, feel free to reply to this message.`;
}

// ============================================
// SMS Sending Functions
// ============================================

interface SendAppointmentSmsOptions {
  appointmentId: string;
  type: "confirmation" | "reminder" | "same_day_reminder" | "rescheduled" | "cancelled";
  previousDate?: Date; // For rescheduled
}

interface SendAppointmentSmsResult extends SendSmsResult {
  appointmentId: string;
  smsType: string;
}

/**
 * Get organization's SMS config: phone number + Twilio credentials.
 * Only Twilio-managed or Twilio-imported numbers can send SMS via Twilio.
 * Vapi/Vonage numbers belong to Vapi's telephony provider and cannot be used as From.
 *
 * IMPORTANT: The credentials returned MUST match the account that owns the phone number.
 * Numbers purchased via buyNumber are owned by the org's Twilio subaccount, so we must
 * use the subaccount credentials — not the master account — to send SMS from those numbers.
 * Error 21660 ("Mismatch between From number and account") occurs when the wrong
 * account's credentials are used.
 */
async function getOrganizationSmsConfig(organizationId: string): Promise<{
  fromNumber: string;
  accountSid?: string;
  authToken?: string;
} | null> {
  // Get org's Twilio credentials (if stored)
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { twilioSubaccountSid: true, twilioAuthToken: true },
  });

  // First try to find a Twilio-compatible number (can actually send SMS)
  const twilioNumber = await db.phoneNumber.findFirst({
    where: {
      organizationId,
      isActive: true,
      provider: { in: ["twilio-managed", "twilio-imported"] },
    },
    select: { number: true, provider: true },
    orderBy: { createdAt: "asc" },
  });

  if (twilioNumber) {
    // For twilio-managed numbers (bought through our app), they belong to the
    // org's subaccount. We MUST use subaccount credentials to avoid error 21660.
    if (twilioNumber.provider === "twilio-managed") {
      if (!org?.twilioSubaccountSid || !org?.twilioAuthToken) {
        console.error(
          `[SMS] Twilio-managed number found for org ${organizationId} but no subaccount credentials stored. SMS will fail with error 21660.`
        );
        return null;
      }
      return {
        fromNumber: twilioNumber.number,
        accountSid: org.twilioSubaccountSid,
        authToken: org.twilioAuthToken,
      };
    }

    // For twilio-imported numbers, use subaccount creds if available,
    // otherwise fall back to master (the number may belong to the master account)
    return {
      fromNumber: twilioNumber.number,
      accountSid: org?.twilioSubaccountSid || undefined,
      authToken: org?.twilioAuthToken || undefined,
    };
  }

  // Fallback: any active number (may fail if it's a Vapi number)
  const anyNumber = await db.phoneNumber.findFirst({
    where: { organizationId, isActive: true },
    select: { number: true, provider: true },
    orderBy: { createdAt: "asc" },
  });

  if (anyNumber) {
    console.warn(
      `[SMS] No Twilio number found for org ${organizationId}. Using ${anyNumber.provider} number ${anyNumber.number} — SMS may fail.`
    );
    return {
      fromNumber: anyNumber.number,
      accountSid: org?.twilioSubaccountSid || undefined,
      authToken: org?.twilioAuthToken || undefined,
    };
  }

  return null;
}

/**
 * Get organization branding/settings
 */
async function getOrganizationSettings(organizationId: string): Promise<{
  businessName: string;
  smsEnabled: boolean;
}> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, settings: true },
  });

  if (!org) {
    return { businessName: "CallTone", smsEnabled: false };
  }

  const settings = org.settings as Record<string, unknown> | null;
  return {
    businessName: (settings?.emailBusinessName as string) || org.name,
    smsEnabled: settings?.smsEnabled !== false, // Default to enabled
  };
}

/**
 * Send appointment-related SMS
 */
export async function sendAppointmentSms(
  options: SendAppointmentSmsOptions
): Promise<SendAppointmentSmsResult> {
  const { appointmentId, type, previousDate } = options;

  try {
    // Get appointment details
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        organizationId: true,
        title: true,
        scheduledAt: true,
        duration: true,
        attendeeName: true,
        attendeePhone: true,
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
        appointmentId,
        smsType: type,
      };
    }

    if (!appointment.attendeePhone) {
      return {
        success: false,
        error: "No phone number for attendee",
        appointmentId,
        smsType: type,
      };
    }

    // Get organization settings
    const orgSettings = await getOrganizationSettings(appointment.organizationId);

    if (!orgSettings.smsEnabled) {
      return {
        success: false,
        error: "SMS is disabled for this organization",
        appointmentId,
        smsType: type,
      };
    }

    // Get organization's SMS config (number + Twilio credentials)
    const smsConfig = await getOrganizationSmsConfig(appointment.organizationId);

    if (!smsConfig) {
      return {
        success: false,
        error: "No SMS-capable phone number configured",
        appointmentId,
        smsType: type,
      };
    }
    const fromNumber = smsConfig.fromNumber;

    // Build template data
    const templateData: SmsTemplateData = {
      businessName: orgSettings.businessName,
      customerName: appointment.attendeeName || "there",
      appointmentTitle: appointment.title,
      appointmentDate: formatSmsDate(appointment.scheduledAt),
      appointmentTime: formatSmsTime(appointment.scheduledAt),
      duration: appointment.duration,
    };

    // Get the appropriate message template
    let messageBody: string;
    switch (type) {
      case "confirmation":
        messageBody = getConfirmationSmsTemplate(templateData);
        break;
      case "reminder":
        messageBody = getReminderSmsTemplate(templateData);
        break;
      case "same_day_reminder":
        messageBody = getSameDayReminderSmsTemplate(templateData);
        break;
      case "rescheduled":
        const prevDateStr = previousDate ? formatSmsDate(previousDate) : "the previous date";
        messageBody = getRescheduledSmsTemplate(templateData, prevDateStr);
        break;
      case "cancelled":
        messageBody = getCancellationSmsTemplate(templateData);
        break;
      default:
        messageBody = getConfirmationSmsTemplate(templateData);
    }

    // Send the SMS (use org-level Twilio credentials if available)
    const result = await sendSms({
      to: appointment.attendeePhone,
      from: fromNumber,
      body: messageBody,
      accountSid: smsConfig.accountSid,
      authToken: smsConfig.authToken,
    });

    if (result.success) {
      console.log(`[SMS] Sent ${type} SMS for appointment ${appointmentId}`);
    }

    return {
      ...result,
      appointmentId,
      smsType: type,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SMS] Error sending ${type} SMS:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
      appointmentId,
      smsType: type,
    };
  }
}

/**
 * Send post-call follow-up SMS
 */
export async function sendPostCallFollowUpSms(
  callId: string,
  customMessage?: string
): Promise<SendSmsResult> {
  try {
    // Get call details
    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!call) {
      return { success: false, error: "Call not found" };
    }

    // For outbound calls, customer is toNumber; for inbound, it's fromNumber
    const customerPhone = call.direction === "outbound"
      ? call.toNumber
      : call.fromNumber;

    if (!customerPhone) {
      return { success: false, error: "No customer phone number" };
    }

    // Get organization settings
    const orgSettings = await getOrganizationSettings(call.organizationId);

    if (!orgSettings.smsEnabled) {
      return { success: false, error: "SMS is disabled" };
    }

    // Get SMS config (number + credentials)
    const smsConfig = await getOrganizationSmsConfig(call.organizationId);

    if (!smsConfig) {
      return { success: false, error: "No SMS number configured" };
    }

    // Build customer name
    const customerName = call.contact
      ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim() || "there"
      : "there";

    // Get message
    const messageBody = getPostCallFollowUpSmsTemplate(
      orgSettings.businessName,
      customerName,
      customMessage
    );

    // Send SMS (use org-level Twilio credentials if available)
    return await sendSms({
      to: customerPhone,
      from: smsConfig.fromNumber,
      body: messageBody,
      accountSid: smsConfig.accountSid,
      authToken: smsConfig.authToken,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS] Post-call follow-up error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process incoming SMS reply
 * This is called from the Twilio webhook when someone replies to an SMS
 */
export async function processIncomingSms(
  from: string,
  to: string,
  body: string
): Promise<{ action: string; response?: string }> {
  const normalizedBody = body.trim().toUpperCase();

  // Find the organization by the "to" number
  const phoneNumber = await db.phoneNumber.findFirst({
    where: { number: to },
    select: { organizationId: true },
  });

  if (!phoneNumber) {
    console.log(`[SMS] No organization found for number ${to}`);
    return { action: "no_org" };
  }

  // Find upcoming appointment for this phone number
  const appointment = await db.appointment.findFirst({
    where: {
      organizationId: phoneNumber.organizationId,
      attendeePhone: from,
      status: { in: ["scheduled", "confirmed"] },
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Process the reply
  if (normalizedBody === "YES" || normalizedBody === "CONFIRM" || normalizedBody === "Y") {
    if (appointment) {
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          notes: appointment.notes
            ? `${appointment.notes}\n[SMS] Confirmed via SMS reply at ${new Date().toISOString()}`
            : `[SMS] Confirmed via SMS reply at ${new Date().toISOString()}`,
        },
      });
      return {
        action: "confirmed",
        response: "Great! Your appointment is confirmed. We look forward to seeing you!",
      };
    }
    return { action: "no_appointment" };
  }

  if (normalizedBody === "CANCEL" || normalizedBody === "NO" || normalizedBody === "N") {
    if (appointment) {
      // Don't auto-cancel, just flag it
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          notes: appointment.notes
            ? `${appointment.notes}\n[SMS] Cancellation requested via SMS at ${new Date().toISOString()}`
            : `[SMS] Cancellation requested via SMS at ${new Date().toISOString()}`,
        },
      });
      return {
        action: "cancel_requested",
        response: "We've received your cancellation request. Someone will follow up with you shortly.",
      };
    }
    return { action: "no_appointment" };
  }

  if (normalizedBody === "HELP" || normalizedBody === "INFO" || normalizedBody === "?") {
    return {
      action: "help",
      response: "Reply YES to confirm your appointment, CANCEL to request cancellation, or CALL to request a callback.",
    };
  }

  if (normalizedBody === "CALL" || normalizedBody === "CALLBACK") {
    // Flag for callback
    if (appointment) {
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          notes: appointment.notes
            ? `${appointment.notes}\n[SMS] Callback requested via SMS at ${new Date().toISOString()}`
            : `[SMS] Callback requested via SMS at ${new Date().toISOString()}`,
        },
      });
    }
    return {
      action: "callback_requested",
      response: "We'll give you a call back shortly. Thank you!",
    };
  }

  if (normalizedBody === "STOP" || normalizedBody === "UNSUBSCRIBE") {
    // Handle opt-out (important for compliance)
    // In a real implementation, you'd add this number to a suppression list
    return {
      action: "opt_out",
      response: "You have been unsubscribed from SMS messages. Reply START to resubscribe.",
    };
  }

  // Unknown command - treat as a general message
  return {
    action: "unknown",
    response: "Thanks for your message. Reply HELP for options or YES to confirm your appointment.",
  };
}

// ============================================
// Receptionist Message SMS Notification
// ============================================

interface ReceptionistSmsData {
  callerName: string;
  callerPhone?: string;
  body: string;
  urgency: string;
}

/**
 * Send SMS notification for a new receptionist message
 */
export async function sendReceptionistMessageSms(
  organizationId: string,
  toPhone: string,
  data: ReceptionistSmsData
): Promise<SendSmsResult> {
  try {
    const orgSettings = await getOrganizationSettings(organizationId);

    if (!orgSettings.smsEnabled) {
      return { success: false, error: "SMS is disabled" };
    }

    const smsConfig = await getOrganizationSmsConfig(organizationId);
    if (!smsConfig) {
      return { success: false, error: "No SMS number configured" };
    }

    const urgencyLabel = data.urgency === "urgent" ? "[URGENT] " : data.urgency === "high" ? "[HIGH] " : "";
    const truncatedBody = data.body.length > 100 ? data.body.substring(0, 97) + "..." : data.body;
    const phoneInfo = data.callerPhone ? ` (${data.callerPhone})` : "";

    const messageBody = `${orgSettings.businessName}: ${urgencyLabel}New msg from ${data.callerName}${phoneInfo}. "${truncatedBody}". View in dashboard.`;

    return await sendSms({
      to: toPhone,
      from: smsConfig.fromNumber,
      body: messageBody,
      accountSid: smsConfig.accountSid,
      authToken: smsConfig.authToken,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS] Receptionist message notification error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get appointments needing SMS reminders
 */
export async function getAppointmentsNeedingSmsReminders(
  hoursBeforeAppointment: number = 24
): Promise<Array<{
  id: string;
  attendeePhone: string | null;
  organizationId: string;
}>> {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + hoursBeforeAppointment * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(reminderWindow.getTime() + 60 * 60 * 1000);

  return await db.appointment.findMany({
    where: {
      scheduledAt: {
        gte: reminderWindow,
        lt: reminderWindowEnd,
      },
      smsReminderSentAt: null,
      attendeePhone: { not: null },
      status: { in: ["scheduled", "confirmed"] },
    },
    select: {
      id: true,
      attendeePhone: true,
      organizationId: true,
    },
  });
}
