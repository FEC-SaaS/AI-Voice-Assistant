/**
 * Email Webhook Handler
 * Receives inbound emails from Resend and processes customer replies
 *
 * To set up:
 * 1. In Resend dashboard, go to Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/email
 * 3. Select "email.received" event
 * 4. Copy the signing secret and set RESEND_WEBHOOK_SECRET env variable
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processInboundEmail, logEmailActivity } from "@/lib/email-reply-processor";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";

// Verify Resend webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Resend webhook event types
interface ResendEmailEvent {
  type: "email.sent" | "email.delivered" | "email.bounced" | "email.complained" | "email.received";
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    // For inbound emails
    headers?: Record<string, string>;
    attachments?: Array<{ filename: string; content: string; content_type: string }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("resend-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error("[Email Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ResendEmailEvent = JSON.parse(body);
    console.log(`[Email Webhook] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "email.received": {
        // Process inbound email
        const toAddress = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
        const inboundEmail = {
          from: event.data.from || "",
          to: toAddress || "",
          subject: event.data.subject || "",
          text: event.data.text,
          html: event.data.html,
          inReplyTo: event.data.headers?.["in-reply-to"],
          references: event.data.headers?.["references"],
        };

        const result = await processInboundEmail(inboundEmail);
        console.log("[Email Webhook] Process result:", result);

        // Notify business if needed
        if (result.shouldNotifyBusiness && result.appointmentId) {
          await notifyBusinessOfEmailReply(result.appointmentId, inboundEmail, result);
        }

        return NextResponse.json({ success: true, result });
      }

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

/**
 * Notify business owner about an email reply
 */
async function notifyBusinessOfEmailReply(
  appointmentId: string,
  email: { from: string; subject: string; text?: string },
  result: { action?: string; message?: string }
): Promise<void> {
  try {
    // Get appointment with organization details
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
      },
    });

    if (!appointment) return;

    // Get organization's reply-to email or admin emails
    const settings = appointment.organization.settings as Record<string, unknown> | null;
    const replyToEmail = settings?.emailReplyTo as string | null;

    // For now, log the notification - could send actual email to business
    console.log(`[Email Webhook] Notifying business about email reply:`, {
      appointmentId,
      organizationId: appointment.organizationId,
      action: result.action,
      from: email.from,
      subject: email.subject,
    });

    // Log activity
    await logEmailActivity(
      appointment.organizationId,
      appointmentId,
      `email_reply_${result.action || "received"}`,
      {
        from: email.from,
        subject: email.subject,
        textPreview: email.text?.substring(0, 200),
        action: result.action,
        message: result.message,
      }
    );

    // If there's a business reply-to email, send notification
    if (replyToEmail && result.action && result.action !== "no_action") {
      const actionLabel = {
        confirmed: "Appointment Confirmed",
        cancel_requested: "Cancellation Requested",
        question: "Customer Question",
      }[result.action] || "Email Received";

      await sendEmail({
        to: replyToEmail,
        subject: `[${actionLabel}] Reply from ${email.from}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Customer Email Reply</h2>
            <p><strong>Status:</strong> ${actionLabel}</p>
            <p><strong>From:</strong> ${email.from}</p>
            <p><strong>Subject:</strong> ${email.subject}</p>
            <p><strong>Appointment:</strong> ${appointment.title}</p>
            ${result.message ? `<p><strong>Action Taken:</strong> ${result.message}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Customer Message:</strong></p>
            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #ddd; margin: 10px 0;">
              ${email.text || "(No text content)"}
            </blockquote>
            <p style="color: #666; font-size: 12px;">
              This notification was generated automatically by VoxForge AI.
            </p>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error("[Email Webhook] Failed to notify business:", error);
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: "Email webhook endpoint active" });
}
