/**
 * Twilio SMS Webhook Handler
 * Receives incoming SMS messages and processes replies
 *
 * To set up:
 * 1. In Twilio Console, configure your phone number's SMS webhook
 * 2. Set URL to: https://yourdomain.com/api/webhooks/twilio/sms
 * 3. Method: POST
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processIncomingSms } from "@/lib/sms";
import { sendSms } from "@/lib/twilio";

// Twilio sends data as form-urlencoded
interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

/**
 * Verify Twilio webhook signature
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string
): boolean {
  if (!signature) return false;

  // Sort params and create validation string
  const sortedKeys = Object.keys(params).sort();
  let validationString = url;
  for (const key of sortedKeys) {
    validationString += key + params[key];
  }

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(validationString)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const webhookData: TwilioSmsWebhook = {
      MessageSid: params.MessageSid || "",
      AccountSid: params.AccountSid || "",
      From: params.From || "",
      To: params.To || "",
      Body: params.Body || "",
      NumMedia: params.NumMedia,
      FromCity: params.FromCity,
      FromState: params.FromState,
      FromZip: params.FromZip,
      FromCountry: params.FromCountry,
    };

    // Verify signature if auth token is configured
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const signature = request.headers.get("x-twilio-signature");
      const url = request.url;

      // In production, verify the signature
      // Note: For development, you may want to skip this
      if (process.env.NODE_ENV === "production") {
        const isValid = verifyTwilioSignature(url, params, signature, authToken);
        if (!isValid) {
          console.error("[Twilio SMS Webhook] Invalid signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }
    }

    console.log(`[Twilio SMS Webhook] Received SMS from ${webhookData.From}: "${webhookData.Body}"`);

    // Process the incoming SMS
    const result = await processIncomingSms(
      webhookData.From,
      webhookData.To,
      webhookData.Body
    );

    console.log(`[Twilio SMS Webhook] Action: ${result.action}`);

    // Send auto-reply if there's a response
    if (result.response) {
      await sendSms({
        to: webhookData.From,
        from: webhookData.To,
        body: result.response,
      });
      console.log(`[Twilio SMS Webhook] Sent reply: "${result.response}"`);
    }

    // Return TwiML response (empty is fine, we're sending via API)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("[Twilio SMS Webhook] Error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200, // Return 200 to prevent Twilio retries
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}

// Twilio may send GET for verification
export async function GET() {
  return NextResponse.json({ status: "Twilio SMS webhook endpoint active" });
}
