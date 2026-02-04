import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Dynamic imports to avoid build-time database connection
const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

const getAnalyzeCall = async () => {
  const { analyzeCall } = await import("@/server/services/call-analysis.service");
  return analyzeCall;
};

const getEmailService = async () => {
  const { sendAppointmentConfirmation } = await import("@/lib/email");
  return { sendAppointmentConfirmation };
};

// Vapi webhook event types
interface VapiWebhookEvent {
  type: string;
  call?: {
    id: string;
    assistantId?: string;
    phoneNumberId?: string;
    status?: string;
    startedAt?: string;
    endedAt?: string;
    transcript?: string;
    recordingUrl?: string;
    customer?: {
      number: string;
    };
    metadata?: Record<string, string>;
  };
  // For tool/function calls
  message?: {
    type: string;
    toolCalls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
}

// Tool call result interface
interface ToolCallResult {
  toolCallId: string;
  result: string;
}

// Helper to format time for display
function formatTimeForDisplay(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Helper to generate time slots (similar to appointments router)
function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  duration: number,
  bufferAfter: number,
  existingAppointments: Array<{ scheduledAt: Date; endAt: Date }>
): string[] {
  const slots: string[] = [];
  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startH = startParts[0] ?? 9;
  const startM = startParts[1] ?? 0;
  const endH = endParts[0] ?? 17;
  const endM = endParts[1] ?? 0;

  const slotStart = new Date(date);
  slotStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(apt.endAt);
      aptEnd.setMinutes(aptEnd.getMinutes() + bufferAfter);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (!hasConflict && slotEnd <= dayEnd) {
      const timeStr = `${slotStart.getHours().toString().padStart(2, "0")}:${slotStart.getMinutes().toString().padStart(2, "0")}`;
      slots.push(timeStr);
    }

    slotStart.setMinutes(slotStart.getMinutes() + duration + bufferAfter);
  }

  return slots;
}

// Process tool calls
async function processToolCall(
  toolName: string,
  args: Record<string, string>,
  organizationId: string,
  agentId: string | undefined,
  customerPhone: string | undefined
): Promise<string> {
  console.log("[Vapi Tool] Processing tool call:", {
    toolName,
    args,
    organizationId,
    agentId,
    customerPhone,
  });

  const db = await getDb();

  try {
    switch (toolName) {
    case "check_availability": {
      const { date, duration: durationStr } = args;
      const duration = parseInt(durationStr || "30", 10);

      if (!date) {
        return "I need a date to check availability. Please provide a date.";
      }

      // Parse the date
      const checkDate = new Date(date);
      if (isNaN(checkDate.getTime())) {
        return "I couldn't understand that date. Please provide it in YYYY-MM-DD format.";
      }

      // Get calendar settings
      const settings = await db.calendarSettings.findUnique({
        where: { organizationId },
      });

      const availableDays = (settings?.availableDays as number[]) || [1, 2, 3, 4, 5];
      const startTime = settings?.startTime || "09:00";
      const endTime = settings?.endTime || "17:00";
      const bufferAfter = settings?.bufferAfter || 15;

      // Check if day is available
      const dayOfWeek = checkDate.getDay();
      if (!availableDays.includes(dayOfWeek)) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return `Sorry, we don't have availability on ${dayNames[dayOfWeek]}s. We're available on ${availableDays.map(d => dayNames[d]).join(", ")}.`;
      }

      // Check min notice time
      const now = new Date();
      const minNoticeHours = settings?.minNoticeTime || 24;
      const minNoticeDate = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

      if (checkDate < new Date(now.toDateString())) {
        return "I can't check availability for past dates. Please provide a future date.";
      }

      // Get existing appointments
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);

      const existingAppointments = await db.appointment.findMany({
        where: {
          organizationId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: { scheduledAt: true, endAt: true },
      });

      const slots = generateTimeSlots(
        checkDate,
        startTime,
        endTime,
        duration,
        bufferAfter,
        existingAppointments
      );

      // Filter slots that meet min notice
      const availableSlots = slots.filter((slot) => {
        const timeParts = slot.split(":").map(Number);
        const h = timeParts[0] ?? 0;
        const m = timeParts[1] ?? 0;
        const slotDate = new Date(checkDate);
        slotDate.setHours(h, m, 0, 0);
        return slotDate >= minNoticeDate;
      });

      if (availableSlots.length === 0) {
        return `I'm sorry, there are no available time slots on ${checkDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}. Would you like to check another date?`;
      }

      // Format slots for speaking
      const formattedSlots = availableSlots.slice(0, 6).map(formatTimeForDisplay);
      const dateStr = checkDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      if (formattedSlots.length === 1) {
        return `I have one available time slot on ${dateStr}: ${formattedSlots[0]}. Would that work for you?`;
      }

      return `I have ${availableSlots.length} available time slots on ${dateStr}. Here are some options: ${formattedSlots.join(", ")}. Which time works best for you?`;
    }

    case "schedule_appointment": {
      const {
        date,
        time,
        duration: durationStr,
        customer_name,
        customer_email,
        customer_phone,
        meeting_type,
        notes,
      } = args;

      if (!date || !time || !customer_name) {
        return "I need the date, time, and your name to schedule the appointment.";
      }

      const duration = parseInt(durationStr || "30", 10);

      // Parse date and time
      const dateParts = date.split("-").map(Number);
      const timeParts = time.split(":").map(Number);
      const year = dateParts[0] ?? 2024;
      const month = dateParts[1] ?? 1;
      const day = dateParts[2] ?? 1;
      const hours = timeParts[0] ?? 0;
      const minutes = timeParts[1] ?? 0;

      const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (isNaN(scheduledAt.getTime())) {
        return "I couldn't understand the date or time. Please try again.";
      }

      const endAt = new Date(scheduledAt.getTime() + duration * 60000);

      // Check for conflicts one more time
      const conflict = await db.appointment.findFirst({
        where: {
          organizationId,
          status: { in: ["scheduled", "confirmed"] },
          OR: [
            { scheduledAt: { lte: scheduledAt }, endAt: { gt: scheduledAt } },
            { scheduledAt: { lt: endAt }, endAt: { gte: endAt } },
          ],
        },
      });

      if (conflict) {
        return "I'm sorry, that time slot is no longer available. Would you like me to check for other available times?";
      }

      // Create the appointment
      const appointment = await db.appointment.create({
        data: {
          organizationId,
          agentId,
          title: `Appointment with ${customer_name}`,
          scheduledAt,
          endAt,
          duration,
          timeZone: "America/New_York",
          meetingType: meeting_type || "phone",
          attendeeName: customer_name,
          attendeeEmail: customer_email,
          attendeePhone: customer_phone || customerPhone,
          notes,
          status: "scheduled",
        },
      });

      // Send confirmation email if we have an email
      if (customer_email) {
        try {
          const { sendAppointmentConfirmation } = await getEmailService();
          await sendAppointmentConfirmation(customer_email, customer_name, {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
          });
        } catch (error) {
          console.error("[Vapi Tool] Failed to send confirmation email:", error);
        }
      }

      const dateStr = scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const timeStr = formatTimeForDisplay(time);

      let response = `I've scheduled your appointment for ${dateStr} at ${timeStr}.`;
      if (customer_email) {
        response += ` A confirmation email has been sent to ${customer_email}.`;
      }
      response += " Is there anything else I can help you with?";

      return response;
    }

    case "cancel_appointment": {
      const { customer_email, customer_phone, reason } = args;

      // Find the appointment
      const whereClause: Record<string, unknown> = {
        organizationId,
        status: { in: ["scheduled", "confirmed"] },
        scheduledAt: { gte: new Date() },
      };

      if (customer_email) {
        whereClause.attendeeEmail = customer_email;
      } else if (customer_phone || customerPhone) {
        whereClause.attendeePhone = customer_phone || customerPhone;
      } else {
        return "I need your email or phone number to find your appointment.";
      }

      const appointment = await db.appointment.findFirst({
        where: whereClause,
        orderBy: { scheduledAt: "asc" },
      });

      if (!appointment) {
        return "I couldn't find an upcoming appointment with that information. Could you please verify your email or phone number?";
      }

      // Cancel the appointment
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      const dateStr = appointment.scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      return `I've cancelled your appointment that was scheduled for ${dateStr}. Would you like to schedule a new appointment?`;
    }

    default:
      console.log("[Vapi Tool] Unknown tool:", toolName);
      return `I'm not sure how to handle that request. Is there something else I can help you with?`;
    }
  } catch (error) {
    console.error("[Vapi Tool] Error processing tool call:", error);
    return "I'm having trouble processing your request right now. Please try again.";
  }
}

/**
 * Verify Vapi webhook signature
 * Vapi uses HMAC-SHA256 signature verification
 */
async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const signature = req.headers.get("x-vapi-signature");
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    console.warn("[Vapi Webhook] VAPI_WEBHOOK_SECRET not configured - skipping signature verification");
    return true;
  }

  if (!signature) {
    console.error("[Vapi Webhook] Missing x-vapi-signature header");
    return false;
  }

  try {
    // Vapi uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    // Compare signatures using timing-safe comparison
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error("[Vapi Webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Calculate cost in cents based on call duration
 * Vapi pricing: approximately $0.05-0.15/min depending on model
 */
function calculateCostCents(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  const costPerMinuteCents = 10; // $0.10 per minute (adjust based on actual Vapi pricing)
  return minutes * costPerMinuteCents;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    console.log("[Vapi Webhook] ========== INCOMING REQUEST ==========");
    console.log("[Vapi Webhook] Headers:", Object.fromEntries(req.headers.entries()));
    console.log("[Vapi Webhook] Body preview:", rawBody.substring(0, 500));

    // Verify webhook signature
    const isValid = await verifySignature(req, rawBody);
    if (!isValid) {
      console.error("[Vapi Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as VapiWebhookEvent;
    const { type, call, message } = body;

    console.log(`[Vapi Webhook] Received event: ${type}`, {
      callId: call?.id,
      messageType: message?.type,
      assistantId: call?.assistantId,
      hasToolCalls: !!(message?.toolCalls || message?.toolCallList),
      toolCallCount: (message?.toolCalls || message?.toolCallList)?.length || 0,
    });

    // Handle tool/function calls (Vapi sends these as assistant-request or tool-calls)
    if (message?.type === "tool-calls" || message?.toolCalls || message?.toolCallList) {
      const toolCalls = message.toolCalls || message.toolCallList || [];

      if (toolCalls.length > 0) {
        const db = await getDb();

        // Get organization from call metadata or assistant
        let organizationId = call?.metadata?.organizationId;
        let agentId = call?.metadata?.agentId;
        const customerPhone = call?.customer?.number;

        if (!organizationId && call?.assistantId) {
          const agent = await db.agent.findFirst({
            where: { vapiAssistantId: call.assistantId },
            select: { id: true, organizationId: true },
          });
          if (agent) {
            organizationId = agent.organizationId;
            agentId = agent.id;
          }
        }

        if (!organizationId) {
          console.error("[Vapi Webhook] Could not determine organization for tool call");
          return NextResponse.json({
            results: toolCalls.map((tc) => ({
              toolCallId: tc.id,
              result: "I'm having trouble processing your request. Please try again.",
            })),
          });
        }

        // Process each tool call
        const results: ToolCallResult[] = [];
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          console.log(`[Vapi Webhook] Processing tool: ${toolCall.function.name}`, args);

          const result = await processToolCall(
            toolCall.function.name,
            args,
            organizationId,
            agentId,
            customerPhone
          );

          results.push({
            toolCallId: toolCall.id,
            result,
          });
        }

        console.log("[Vapi Webhook] Tool call results:", results);
        return NextResponse.json({ results });
      }
    }

    if (!call) {
      return NextResponse.json({ received: true });
    }

    const db = await getDb();

    // Find the agent by Vapi assistant ID
    const agent = call.assistantId
      ? await db.agent.findFirst({
          where: { vapiAssistantId: call.assistantId },
          select: { id: true, organizationId: true },
        })
      : null;

    // Get campaign and contact IDs from metadata
    const campaignId = call.metadata?.campaignId;
    const contactId = call.metadata?.contactId;
    const organizationId = call.metadata?.organizationId || agent?.organizationId;

    if (!organizationId) {
      console.warn("[Vapi Webhook] Could not determine organization for call", { callId: call.id });
    }

    switch (type) {
      case "call.started":
      case "call-started": {
        // Create or update call record when call starts
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: "in-progress",
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
            startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
          },
          update: {
            status: "in-progress",
            startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
          },
        });

        // Update contact status if applicable
        if (contactId) {
          await db.contact.update({
            where: { id: contactId },
            data: { status: "called", lastCalledAt: new Date() },
          }).catch(() => {
            // Contact might not exist
          });
        }

        break;
      }

      case "call.ended":
      case "call-ended": {
        // Calculate duration
        const startedAt = call.startedAt ? new Date(call.startedAt) : null;
        const endedAt = call.endedAt ? new Date(call.endedAt) : new Date();
        const durationSeconds = startedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
          : 0;

        // Calculate cost
        const costCents = calculateCostCents(durationSeconds);

        // Determine final status
        let finalStatus = call.status || "completed";
        if (durationSeconds === 0) {
          finalStatus = "no-answer";
        }

        // Update call record
        const updatedCall = await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: finalStatus,
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
            startedAt,
            endedAt,
            durationSeconds,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl,
            costCents,
          },
          update: {
            status: finalStatus,
            endedAt,
            durationSeconds,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl,
            costCents,
          },
        });

        // Update contact status based on call outcome
        if (contactId) {
          const contactStatus = finalStatus === "completed" ? "completed" : "failed";
          await db.contact.update({
            where: { id: contactId },
            data: {
              status: contactStatus,
              callAttempts: { increment: 1 },
            },
          }).catch(() => {
            // Contact might not exist
          });
        }

        // Trigger async call analysis if we have a transcript
        if (call.transcript && updatedCall.id) {
          // Fire and forget - analyze in background
          getAnalyzeCall().then((analyzeCall) => {
            analyzeCall(updatedCall.id).catch((error) => {
              console.error("[Vapi Webhook] Call analysis failed:", error);
            });
          });
        }

        break;
      }

      case "transcript.complete":
      case "transcript-complete": {
        // Update transcript when complete
        if (call.transcript) {
          const updatedCall = await db.call.update({
            where: { vapiCallId: call.id },
            data: { transcript: call.transcript },
          });

          // Trigger analysis now that we have the full transcript
          if (updatedCall.status === "completed") {
            getAnalyzeCall().then((analyzeCall) => {
              analyzeCall(updatedCall.id).catch((error) => {
                console.error("[Vapi Webhook] Call analysis failed:", error);
              });
            });
          }
        }
        break;
      }

      case "function.called":
      case "function-called": {
        // Legacy function call handling (newer versions use tool-calls message type)
        console.log("[Vapi Webhook] Function called (legacy):", call);
        break;
      }

      case "call.failed":
      case "call-failed": {
        // Handle failed calls
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: "failed",
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
          },
          update: {
            status: "failed",
          },
        });

        // Update contact status
        if (contactId) {
          await db.contact.update({
            where: { id: contactId },
            data: {
              status: "failed",
              callAttempts: { increment: 1 },
            },
          }).catch(() => {
            // Contact might not exist
          });
        }

        break;
      }

      default:
        console.log(`[Vapi Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Vapi Webhook] Error:", error);

    // Return 200 to prevent Vapi from retrying (we logged the error)
    // Change to 500 if you want Vapi to retry
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}

// Health check / status endpoint
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "NOT SET";
  const hasWebhookSecret = !!process.env.VAPI_WEBHOOK_SECRET;
  const hasVapiKey = !!process.env.VAPI_API_KEY;

  return NextResponse.json({
    status: "Vapi webhook endpoint is active",
    configuration: {
      appUrl,
      webhookUrl: `${appUrl}/api/webhooks/vapi`,
      hasWebhookSecret,
      hasVapiKey,
    },
    timestamp: new Date().toISOString(),
  });
}
