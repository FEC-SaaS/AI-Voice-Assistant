/**
 * Appointment Reminder Calls Service
 * Uses Vapi to make outbound reminder calls to confirm appointments
 */

import { db } from "./db";
import { createCall, createAssistant, type VapiTool } from "./vapi";

// Generate system prompt for reminder call
function generateReminderPrompt(
  businessName: string,
  appointmentTitle: string,
  appointmentDate: string,
  appointmentTime: string,
  duration: number,
  meetingType: string
): string {
  return `You are a friendly AI assistant calling on behalf of ${businessName} to confirm an upcoming appointment.

APPOINTMENT DETAILS:
- Title: ${appointmentTitle}
- Date: ${appointmentDate}
- Time: ${appointmentTime}
- Duration: ${duration} minutes
- Type: ${meetingType}

YOUR OBJECTIVE:
1. Greet the customer warmly
2. Confirm their upcoming appointment
3. Get their confirmation (yes/no)
4. If they want to reschedule or cancel, note their preference
5. Thank them and end the call professionally

CONVERSATION GUIDELINES:
- Be conversational and friendly, not robotic
- Keep responses brief and to the point
- If the customer seems busy, offer to call back later
- If they confirm, thank them and remind them of the details
- If they need to cancel or reschedule, be understanding and note their request
- Don't pressure them - respect their decision

SAMPLE OPENING:
"Hi! This is a quick reminder call from ${businessName} about your ${appointmentTitle} appointment scheduled for ${appointmentDate} at ${appointmentTime}. I just wanted to confirm you'll be able to make it. Will that time still work for you?"

ENDING THE CALL:
- If confirmed: "Great! We'll see you on ${appointmentDate} at ${appointmentTime}. Have a wonderful day!"
- If cancelling: "No problem, I'll make a note of that. Someone from our team will follow up with you. Take care!"
- If rescheduling: "I understand. I'll have someone reach out to find a better time. Thanks for letting us know!"

After getting their response, use the appropriate tool to record the outcome.`;
}

// Tools for the reminder assistant
function getReminderTools(webhookUrl: string): VapiTool[] {
  return [
    {
      type: "function",
      function: {
        name: "recordAppointmentConfirmation",
        description: "Record that the customer has confirmed they will attend the appointment",
        parameters: {
          type: "object",
          properties: {
            confirmed: {
              type: "string",
              description: "Whether the customer confirmed. Values: 'yes' or 'no'",
              enum: ["yes", "no"],
            },
            notes: {
              type: "string",
              description: "Any additional notes from the conversation",
            },
          },
          required: ["confirmed"],
        },
      },
      async: false,
      server: {
        url: webhookUrl,
      },
    },
    {
      type: "function",
      function: {
        name: "recordRescheduleRequest",
        description: "Record that the customer wants to reschedule the appointment",
        parameters: {
          type: "object",
          properties: {
            preferredDate: {
              type: "string",
              description: "The customer's preferred new date if mentioned",
            },
            preferredTime: {
              type: "string",
              description: "The customer's preferred new time if mentioned",
            },
            reason: {
              type: "string",
              description: "Reason for rescheduling if provided",
            },
          },
        },
      },
      async: false,
      server: {
        url: webhookUrl,
      },
    },
    {
      type: "function",
      function: {
        name: "recordCancellationRequest",
        description: "Record that the customer wants to cancel the appointment",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for cancellation if provided",
            },
          },
        },
      },
      async: false,
      server: {
        url: webhookUrl,
      },
    },
    {
      type: "function",
      function: {
        name: "recordNoAnswer",
        description: "Record that the customer did not answer or the call went to voicemail",
        parameters: {
          type: "object",
          properties: {
            leftVoicemail: {
              type: "string",
              description: "Whether a voicemail was left. Values: 'yes' or 'no'",
              enum: ["yes", "no"],
            },
          },
        },
      },
      async: false,
      server: {
        url: webhookUrl,
      },
    },
  ];
}

// Format date for speech
function formatDateForSpeech(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Format time for speech
function formatTimeForSpeech(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export interface ReminderCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

/**
 * Initiate a reminder call for an appointment
 */
export async function initiateReminderCall(
  appointmentId: string
): Promise<ReminderCallResult> {
  try {
    // Get appointment details
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            vapiAssistantId: true,
            phoneNumbers: {
              where: { isActive: true },
              select: { vapiPhoneId: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found" };
    }

    if (!appointment.attendeePhone) {
      return { success: false, error: "No phone number for attendee" };
    }

    // Get organization settings
    const settings = appointment.organization.settings as Record<string, unknown> | null;
    const businessName = (settings?.emailBusinessName as string) || appointment.organization.name;

    // Get phone number ID to use for outbound call
    // First try the agent's phone, then look for org default
    let phoneNumberId = appointment.agent?.phoneNumbers?.[0]?.vapiPhoneId || null;

    if (!phoneNumberId) {
      // Try to find any phone number for this organization
      const phoneNumber = await db.phoneNumber.findFirst({
        where: { organizationId: appointment.organizationId, isActive: true },
        select: { vapiPhoneId: true },
      });
      phoneNumberId = phoneNumber?.vapiPhoneId || null;
    }

    if (!phoneNumberId) {
      return { success: false, error: "No phone number available for outbound calls" };
    }

    // Generate reminder prompt
    const systemPrompt = generateReminderPrompt(
      businessName,
      appointment.title,
      formatDateForSpeech(appointment.scheduledAt),
      formatTimeForSpeech(appointment.scheduledAt),
      appointment.duration,
      appointment.meetingType
    );

    // Webhook URL for tool calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai";
    const webhookUrl = `${baseUrl}/api/vapi/reminder-tools?appointmentId=${appointmentId}`;

    // Create a temporary assistant for this reminder call
    const assistant = await createAssistant({
      name: `Reminder - ${appointment.title}`,
      systemPrompt,
      firstMessage: `Hi! This is a quick reminder call from ${businessName} about your ${appointment.title} appointment. Do you have a moment?`,
      voiceProvider: "vapi",
      voiceId: "Elliot", // Use a friendly voice
      tools: getReminderTools(webhookUrl),
      serverUrl: webhookUrl,
    });

    // Make the outbound call
    const call = await createCall({
      assistantId: assistant.id,
      phoneNumberId,
      customerNumber: appointment.attendeePhone,
      metadata: {
        appointmentId: appointment.id,
        organizationId: appointment.organizationId,
        type: "reminder",
      },
    });

    // Update appointment with reminder call info
    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        reminderSentAt: new Date(),
        notes: appointment.notes
          ? `${appointment.notes}\n[AUTO] Reminder call initiated at ${new Date().toISOString()}`
          : `[AUTO] Reminder call initiated at ${new Date().toISOString()}`,
      },
    });

    console.log(`[Reminder Call] Initiated call ${call.id} for appointment ${appointmentId}`);

    return {
      success: true,
      callId: call.id,
    };
  } catch (error) {
    console.error("[Reminder Call] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get appointments that need reminder calls
 * Called by a scheduled job/cron
 */
export async function getAppointmentsNeedingReminders(
  hoursBeforeAppointment: number = 24
): Promise<Array<{
  id: string;
  title: string;
  scheduledAt: Date;
  attendeePhone: string | null;
  organizationId: string;
}>> {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + hoursBeforeAppointment * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(reminderWindow.getTime() + 60 * 60 * 1000); // 1 hour window

  // Find appointments that:
  // 1. Are scheduled within the reminder window
  // 2. Haven't had a reminder sent
  // 3. Have a phone number
  // 4. Are in scheduled/confirmed status
  const appointments = await db.appointment.findMany({
    where: {
      scheduledAt: {
        gte: reminderWindow,
        lt: reminderWindowEnd,
      },
      reminderSentAt: null,
      attendeePhone: { not: null },
      status: { in: ["scheduled", "confirmed"] },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      attendeePhone: true,
      organizationId: true,
    },
  });

  return appointments;
}

/**
 * Process reminder call outcome
 */
export async function processReminderCallOutcome(
  appointmentId: string,
  outcome: "confirmed" | "reschedule_requested" | "cancelled" | "no_answer",
  details?: Record<string, string>
): Promise<void> {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) return;

  const timestamp = new Date().toISOString();
  let notePrefix = "";
  const updateData: Record<string, unknown> = {};

  switch (outcome) {
    case "confirmed":
      updateData.status = "confirmed";
      updateData.confirmedAt = new Date();
      notePrefix = `[CALL] Customer confirmed attendance`;
      break;

    case "reschedule_requested":
      notePrefix = `[CALL] Customer requested reschedule`;
      if (details?.preferredDate) {
        notePrefix += ` - Preferred: ${details.preferredDate}`;
      }
      if (details?.preferredTime) {
        notePrefix += ` at ${details.preferredTime}`;
      }
      if (details?.reason) {
        notePrefix += ` - Reason: ${details.reason}`;
      }
      break;

    case "cancelled":
      notePrefix = `[CALL] Customer requested cancellation`;
      if (details?.reason) {
        notePrefix += ` - Reason: ${details.reason}`;
      }
      // Don't auto-cancel - just flag for review
      break;

    case "no_answer":
      notePrefix = `[CALL] No answer`;
      if (details?.leftVoicemail === "yes") {
        notePrefix += ` - Voicemail left`;
      }
      break;
  }

  updateData.notes = appointment.notes
    ? `${appointment.notes}\n${notePrefix} at ${timestamp}`
    : `${notePrefix} at ${timestamp}`;

  await db.appointment.update({
    where: { id: appointmentId },
    data: updateData,
  });

  console.log(`[Reminder Call] Processed outcome for ${appointmentId}: ${outcome}`);
}
