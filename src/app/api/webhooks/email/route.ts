/**
 * Email Webhook Handler
 * Receives webhook events from Resend for bounce and complaint handling
 *
 * To set up:
 * 1. In Resend dashboard, go to Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/email
 * 3. Select "email.bounced" and "email.complained" events
 * 4. Copy the signing secret and set RESEND_WEBHOOK_SECRET env variable
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Verify Resend/Svix webhook signature
 * Resend uses Svix for webhook delivery which has a specific signature format
 */
function verifyWebhookSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
  secret: string
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;

  // All headers are required
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.log("[Email Webhook] Missing Svix headers");
    return false;
  }

  // Check timestamp is not too old (5 minutes tolerance)
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.log("[Email Webhook] Timestamp too old");
    return false;
  }

  // Remove the "whsec_" prefix from the secret
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");

  // Create the signed payload
  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;

  // Compute the expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // Svix signature header contains multiple signatures separated by space
  // Format: "v1,<signature1> v1,<signature2>"
  const signatures = svixSignature.split(" ");

  for (const sig of signatures) {
    const [version, signature] = sig.split(",");
    if (version === "v1" && signature) {
      try {
        if (crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )) {
          return true;
        }
      } catch {
        // Buffer lengths might not match, continue to next signature
        continue;
      }
    }
  }

  console.log("[Email Webhook] Signature mismatch");
  return false;
}

// Resend webhook event types
interface ResendEmailEvent {
  type: "email.sent" | "email.delivered" | "email.bounced" | "email.complained";
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Get Svix headers for signature verification
    const svixHeaders = {
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
    };

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(body, svixHeaders, webhookSecret);
      if (!isValid) {
        console.error("[Email Webhook] Invalid signature");
        console.log("[Email Webhook] Headers:", {
          svixId: svixHeaders.svixId,
          svixTimestamp: svixHeaders.svixTimestamp,
          svixSignature: svixHeaders.svixSignature ? "present" : "missing",
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event: ResendEmailEvent = JSON.parse(body);
    console.log(`[Email Webhook] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "email.bounced": {
        // Handle bounced emails - mark contact email as invalid
        const toEmail = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
        if (toEmail) {
          console.log(`[Email Webhook] Email bounced for: ${toEmail}`);
          // Could update contact's email status here
        }
        return NextResponse.json({ success: true, action: "bounce_logged" });
      }

      case "email.complained": {
        // Handle spam complaints
        const toEmail = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
        if (toEmail) {
          console.log(`[Email Webhook] Spam complaint for: ${toEmail}`);
          // Could add to suppression list here
        }
        return NextResponse.json({ success: true, action: "complaint_logged" });
      }

      default:
        // Log other events but don't process
        console.log(`[Email Webhook] Unhandled event type: ${event.type}`);
        return NextResponse.json({ success: true, action: "ignored" });
    }
  } catch (error) {
    console.error("[Email Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: "Email webhook endpoint active" });
}
