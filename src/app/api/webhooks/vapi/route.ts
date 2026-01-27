import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VapiWebhookEvent;
    const { type, call } = body;

    console.log(`[Vapi Webhook] Received event: ${type}`);

    if (!call) {
      return NextResponse.json({ received: true });
    }

    // Find the agent by Vapi assistant ID
    const agent = call.assistantId
      ? await db.agent.findFirst({
          where: { vapiAssistantId: call.assistantId },
          select: { id: true, organizationId: true },
        })
      : null;

    switch (type) {
      case "call.started":
      case "call-started": {
        // Create or update call record
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: agent?.organizationId || "",
            agentId: agent?.id,
            direction: "outbound", // TODO: Determine from webhook
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

        // Update call record
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: agent?.organizationId || "",
            agentId: agent?.id,
            direction: "outbound",
            status: call.status || "completed",
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
            startedAt,
            endedAt,
            durationSeconds,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl,
          },
          update: {
            status: call.status || "completed",
            endedAt,
            durationSeconds,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl,
          },
        });

        // TODO: Trigger call analysis job
        break;
      }

      case "transcript.complete":
      case "transcript-complete": {
        // Update transcript
        if (call.transcript) {
          await db.call.update({
            where: { vapiCallId: call.id },
            data: { transcript: call.transcript },
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
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Verify webhook signature (optional but recommended)
// async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
//   const signature = req.headers.get("x-vapi-signature");
//   if (!signature || !process.env.VAPI_WEBHOOK_SECRET) return false;
//   // Implement signature verification
//   return true;
// }
