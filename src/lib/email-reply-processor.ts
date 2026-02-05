/**
 * Email Reply Processing Service
 * Processes inbound email replies from customers and takes appropriate actions
 */

import { db } from "./db";

// Keywords that indicate customer intent
const CONFIRMATION_KEYWORDS = [
  "confirm", "confirmed", "yes", "i'll be there", "i will be there",
  "see you then", "sounds good", "perfect", "great", "okay", "ok",
  "i can make it", "count me in", "attending"
];

const CANCELLATION_KEYWORDS = [
  "cancel", "cancelled", "can't make it", "cannot make it", "won't be able",
  "unable to attend", "have to cancel", "need to cancel", "reschedule",
  "different time", "change the time", "postpone"
];

const QUESTION_KEYWORDS = [
  "?", "what time", "where", "how long", "address", "location",
  "meeting link", "zoom", "video call", "phone number"
];

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

export interface ProcessedEmailResult {
  success: boolean;
  action?: "confirmed" | "cancel_requested" | "question" | "no_action";
  appointmentId?: string;
  message?: string;
  shouldNotifyBusiness?: boolean;
}

/**
 * Extract email address from various formats
 * e.g., "John Doe <john@example.com>" -> "john@example.com"
 */
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<]+@[^\s>]+)/);
  return match && match[1] ? match[1].toLowerCase() : emailString.toLowerCase();
}

/**
 * Detect customer intent from email content
 */
function detectIntent(text: string): "confirm" | "cancel" | "question" | "unknown" {
  const lowerText = text.toLowerCase();

  // Check for cancellation first (higher priority)
  for (const keyword of CANCELLATION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return "cancel";
    }
  }

  // Check for confirmation
  for (const keyword of CONFIRMATION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return "confirm";
    }
  }

  // Check for questions
  for (const keyword of QUESTION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return "question";
    }
  }

  return "unknown";
}

/**
 * Find appointment by attendee email and recent date
 */
async function findAppointmentByEmail(email: string): Promise<{
  id: string;
  organizationId: string;
  title: string;
  status: string;
  scheduledAt: Date;
  attendeeName: string | null;
} | null> {
  const appointment = await db.appointment.findFirst({
    where: {
      attendeeEmail: email,
      status: { in: ["scheduled", "confirmed"] },
      scheduledAt: { gte: new Date() }, // Future appointments only
    },
    orderBy: { scheduledAt: "asc" }, // Get the nearest upcoming one
    select: {
      id: true,
      organizationId: true,
      title: true,
      status: true,
      scheduledAt: true,
      attendeeName: true,
    },
  });

  return appointment;
}

/**
 * Process an inbound email reply
 */
export async function processInboundEmail(email: InboundEmail): Promise<ProcessedEmailResult> {
  try {
    const senderEmail = extractEmail(email.from);
    const emailContent = email.text || "";

    console.log(`[Email Reply] Processing email from: ${senderEmail}`);
    console.log(`[Email Reply] Subject: ${email.subject}`);

    // Find appointment for this sender
    const appointment = await findAppointmentByEmail(senderEmail);

    if (!appointment) {
      console.log(`[Email Reply] No upcoming appointment found for: ${senderEmail}`);
      return {
        success: true,
        action: "no_action",
        message: "No upcoming appointment found for this email address",
        shouldNotifyBusiness: true, // Let business know about unmatched email
      };
    }

    console.log(`[Email Reply] Found appointment: ${appointment.id} - ${appointment.title}`);

    // Detect intent
    const intent = detectIntent(emailContent);
    console.log(`[Email Reply] Detected intent: ${intent}`);

    switch (intent) {
      case "confirm":
        // Update appointment status to confirmed
        if (appointment.status !== "confirmed") {
          await db.appointment.update({
            where: { id: appointment.id },
            data: {
              status: "confirmed",
              confirmedAt: new Date(),
            },
          });
          console.log(`[Email Reply] Appointment ${appointment.id} confirmed via email`);
        }
        return {
          success: true,
          action: "confirmed",
          appointmentId: appointment.id,
          message: `Appointment "${appointment.title}" confirmed via email reply`,
          shouldNotifyBusiness: true,
        };

      case "cancel":
        // Don't auto-cancel - notify business for manual handling
        // Create a note/flag on the appointment
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            notes: `[AUTO] Customer requested cancellation via email on ${new Date().toISOString()}. Original message: "${emailContent.substring(0, 200)}..."`,
          },
        });
        return {
          success: true,
          action: "cancel_requested",
          appointmentId: appointment.id,
          message: `Customer requested cancellation for "${appointment.title}" - requires manual review`,
          shouldNotifyBusiness: true,
        };

      case "question":
        return {
          success: true,
          action: "question",
          appointmentId: appointment.id,
          message: `Customer has a question about "${appointment.title}"`,
          shouldNotifyBusiness: true,
        };

      default:
        return {
          success: true,
          action: "no_action",
          appointmentId: appointment.id,
          message: "Email received but no specific action detected",
          shouldNotifyBusiness: true,
        };
    }
  } catch (error) {
    console.error("[Email Reply] Processing error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error processing email",
    };
  }
}

/**
 * Log email activity for audit trail
 */
export async function logEmailActivity(
  organizationId: string,
  appointmentId: string | undefined,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  // Store in a simple format - could be expanded to a dedicated table
  console.log(`[Email Activity] Org: ${organizationId}, Appointment: ${appointmentId}, Action: ${action}`, details);
  // Future: Create EmailActivity model in Prisma and store here
}
