import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { analyzeCall } from "@/server/services/call-analysis.service";

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

    // Verify webhook signature
    const isValid = await verifySignature(req, rawBody);
    if (!isValid) {
      console.error("[Vapi Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as VapiWebhookEvent;
    const { type, call } = body;

    console.log(`[Vapi Webhook] Received event: ${type}`, { callId: call?.id });

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
          analyzeCall(updatedCall.id).catch((error) => {
            console.error("[Vapi Webhook] Call analysis failed:", error);
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
            analyzeCall(updatedCall.id).catch((error) => {
              console.error("[Vapi Webhook] Call analysis failed:", error);
            });
          }
        }
        break;
      }

      case "function.called":
      case "function-called": {
        // Handle function calls from the agent (e.g., booking, transfers)
        console.log("[Vapi Webhook] Function called:", call);
        // Implement custom function handling here
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

// Reject non-POST requests
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
