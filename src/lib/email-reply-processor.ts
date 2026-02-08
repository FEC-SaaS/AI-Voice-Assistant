/**
 * Email Reply Processing Service
 * Processes inbound email replies from customers using OpenAI for intent detection.
 * Understands natural language — clients can write full sentences, not just keywords.
 */

import { db } from "./db";
import { openai } from "./openai";

/**
 * Strip HTML tags and decode common entities to extract plain text.
 * Used as fallback when the webhook doesn't provide a text body.
 */
function htmlToPlainText(html: string): string {
  return html
    // Remove style and script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Convert <br> and block-level tags to newlines
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    // Strip remaining HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract only the newest reply from an email thread.
 * Strips quoted text (lines starting with >) and everything after
 * common reply headers like "On ... wrote:" or "From: ...".
 */
function extractLatestReply(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Stop at quoted text markers
    if (/^>/.test(line)) break;
    // Stop at "On <date> <person> wrote:" patterns
    if (/^On .+ wrote:$/i.test(line.trim())) break;
    // Stop at "From: " header (forwarded/quoted block)
    if (/^From:\s/i.test(line.trim())) break;
    // Stop at separator lines like "------" or "______"
    if (/^[-_=]{5,}/.test(line.trim())) break;
    result.push(line);
  }

  return result.join("\n").trim();
}

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

export type EmailIntent = "confirm" | "cancel" | "reschedule" | "question" | "unknown";

export interface ProcessedEmailResult {
  success: boolean;
  action?: "confirmed" | "cancel_requested" | "reschedule_requested" | "question" | "no_action";
  appointmentId?: string;
  message?: string;
  customerMessage?: string;
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
 * Use OpenAI to detect customer intent from their email reply.
 * Returns the intent and the reasoning/summary of what the customer said.
 */
async function detectIntentWithAI(
  emailBody: string,
  subject: string,
  appointmentTitle: string
): Promise<{ intent: EmailIntent; summary: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an appointment management assistant. A customer has replied to an appointment confirmation email. Your job is to determine their intent from their reply.

IMPORTANT CONTEXT:
- The email subject line is from the ORIGINAL confirmation email, NOT from the customer. Do NOT use the subject to determine intent.
- Only use the customer's actual reply text (the "Email body" field) to determine intent.
- If the email body is empty or contains no meaningful text, return intent "unknown".

Classify the customer's intent into exactly one of these categories:
- "confirm" — Customer is confirming they will attend (e.g., "I'll be there", "Sounds good", "Yes, confirmed")
- "cancel" — Customer wants to cancel the appointment (e.g., "I need to cancel", "Something came up, can't make it", "Please cancel")
- "reschedule" — Customer wants to change the time/date (e.g., "Can we move this to Thursday?", "I need to reschedule", "Different time please")
- "question" — Customer is asking a question about the appointment (e.g., "Where is the office?", "What should I bring?", "How long will it take?")
- "unknown" — Cannot determine intent, email body is empty, or the message doesn't relate to any of the above

Return a JSON object with:
- "intent": one of "confirm", "cancel", "reschedule", "question", "unknown"
- "summary": a brief 1-sentence summary of what the customer said (or "No message content" if body is empty)`,
        },
        {
          role: "user",
          content: `Appointment: "${appointmentTitle}"
Email subject: "${subject}"
Email body: "${emailBody || "(empty — no text content in the reply)"}"`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log("[Email Reply AI] No response from OpenAI");
      return { intent: "unknown", summary: "AI classification unavailable" };
    }

    const parsed = JSON.parse(content);
    const intent = ["confirm", "cancel", "reschedule", "question", "unknown"].includes(parsed.intent)
      ? (parsed.intent as EmailIntent)
      : "unknown";

    console.log(`[Email Reply AI] Classification: ${intent} — "${parsed.summary}"`);
    return { intent, summary: parsed.summary || "" };
  } catch (error) {
    console.error("[Email Reply AI] OpenAI error:", error);
    // Fall back to unknown rather than guessing
    return { intent: "unknown", summary: "AI classification failed" };
  }
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

    // Extract text content: prefer plain text, fall back to stripping HTML
    const rawText = email.text || (email.html ? htmlToPlainText(email.html) : "");
    // Extract only the latest reply (strip quoted thread content)
    const emailContent = extractLatestReply(rawText) || rawText;

    console.log(`[Email Reply] Processing email from: ${senderEmail}`);
    console.log(`[Email Reply] Subject: ${email.subject}`);
    console.log(`[Email Reply] Extracted content (${emailContent.length} chars): ${emailContent.substring(0, 300)}`);

    // Find appointment for this sender
    const appointment = await findAppointmentByEmail(senderEmail);

    if (!appointment) {
      console.log(`[Email Reply] No upcoming appointment found for: ${senderEmail}`);
      return {
        success: true,
        action: "no_action",
        message: "No upcoming appointment found for this email address",
        shouldNotifyBusiness: true,
      };
    }

    console.log(`[Email Reply] Found appointment: ${appointment.id} - ${appointment.title}`);

    // Use OpenAI to classify the customer's intent
    const { intent, summary } = await detectIntentWithAI(
      emailContent,
      email.subject,
      appointment.title
    );

    console.log(`[Email Reply] AI detected intent: ${intent}`);

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
          customerMessage: summary,
          shouldNotifyBusiness: true,
        };

      case "cancel":
        // Update appointment status to cancelled
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: summary || emailContent.substring(0, 500) || "Cancelled via email reply",
            notes: `[AUTO] Customer requested cancellation via email on ${new Date().toISOString()}. Message: "${emailContent.substring(0, 500) || summary}"`,
          },
        });
        console.log(`[Email Reply] Appointment ${appointment.id} cancelled via email`);
        return {
          success: true,
          action: "cancel_requested",
          appointmentId: appointment.id,
          message: `Appointment "${appointment.title}" cancelled via email reply`,
          customerMessage: summary,
          shouldNotifyBusiness: true,
        };

      case "reschedule":
        // Mark appointment as needing reschedule — don't auto-cancel, notify business
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "rescheduled",
            notes: `[AUTO] Customer requested reschedule via email on ${new Date().toISOString()}. Message: "${emailContent.substring(0, 500) || summary}"`,
          },
        });
        console.log(`[Email Reply] Appointment ${appointment.id} reschedule requested via email`);
        return {
          success: true,
          action: "reschedule_requested",
          appointmentId: appointment.id,
          message: `Customer requested reschedule for "${appointment.title}" — requires follow-up`,
          customerMessage: summary,
          shouldNotifyBusiness: true,
        };

      case "question":
        return {
          success: true,
          action: "question",
          appointmentId: appointment.id,
          message: `Customer has a question about "${appointment.title}": ${summary}`,
          customerMessage: summary,
          shouldNotifyBusiness: true,
        };

      default:
        return {
          success: true,
          action: "no_action",
          appointmentId: appointment.id,
          message: "Email received but no specific action detected",
          customerMessage: summary,
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
