/**
 * Vapi Reminder Tools Webhook
 * Handles tool calls from the reminder assistant during outbound calls
 */

import { NextRequest, NextResponse } from "next/server";
import { processReminderCallOutcome } from "@/lib/reminder-calls";

interface VapiToolCallRequest {
  message: {
    type: "tool-calls";
    toolCalls: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  call?: {
    id: string;
    metadata?: Record<string, string>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: VapiToolCallRequest = await request.json();
    const appointmentId = request.nextUrl.searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    console.log(`[Reminder Tools] Received tool call for appointment: ${appointmentId}`);

    // Process each tool call
    const results = await Promise.all(
      body.message.toolCalls.map(async (toolCall) => {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");

        console.log(`[Reminder Tools] Processing: ${functionName}`, args);

        switch (functionName) {
          case "recordAppointmentConfirmation":
            if (args.confirmed === "yes") {
              await processReminderCallOutcome(appointmentId, "confirmed", {
                notes: args.notes,
              });
              return {
                toolCallId: toolCall.id,
                result: "Appointment confirmed successfully. Thank the customer and end the call.",
              };
            } else {
              return {
                toolCallId: toolCall.id,
                result: "Noted that the customer cannot confirm. Ask if they'd like to reschedule or cancel.",
              };
            }

          case "recordRescheduleRequest":
            await processReminderCallOutcome(appointmentId, "reschedule_requested", {
              preferredDate: args.preferredDate,
              preferredTime: args.preferredTime,
              reason: args.reason,
            });
            return {
              toolCallId: toolCall.id,
              result: "Reschedule request recorded. Let the customer know someone will follow up to find a better time.",
            };

          case "recordCancellationRequest":
            await processReminderCallOutcome(appointmentId, "cancelled", {
              reason: args.reason,
            });
            return {
              toolCallId: toolCall.id,
              result: "Cancellation request recorded. Express understanding and let them know someone will follow up.",
            };

          case "recordNoAnswer":
            await processReminderCallOutcome(appointmentId, "no_answer", {
              leftVoicemail: args.leftVoicemail,
            });
            return {
              toolCallId: toolCall.id,
              result: "No answer recorded.",
            };

          default:
            console.warn(`[Reminder Tools] Unknown function: ${functionName}`);
            return {
              toolCallId: toolCall.id,
              result: "Unknown function",
            };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Reminder Tools] Error:", error);
    return NextResponse.json(
      { error: "Failed to process tool call" },
      { status: 500 }
    );
  }
}
