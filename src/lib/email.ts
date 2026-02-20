import { Resend } from "resend";
import { generateActionUrls } from "./appointment-tokens";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Default FROM_EMAIL - this is overridden by organization settings when available
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "CallTone <onboarding@resend.dev>";

// Email branding configuration from organization settings
export interface EmailBrandingConfig {
  businessName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  primaryColor?: string;
  logoUrl?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  branding?: EmailBrandingConfig;
}

export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, branding } = options;

  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email] RESEND_API_KEY is not configured");
    return { success: false, error: "Email service not configured" };
  }

  // Determine FROM_EMAIL based on branding config
  // DEFAULT_FROM_EMAIL can be: "Name <email>", "email@domain", or just "domain.com"
  let fromEmail = DEFAULT_FROM_EMAIL;

  // Extract the raw email address from DEFAULT_FROM_EMAIL (handles all formats)
  const extractEmail = (val: string): string => {
    const angleMatch = val.match(/<(.+)>/);
    if (angleMatch) return angleMatch[1]!;
    // If it contains @, it's already an email
    if (val.includes("@")) return val.trim();
    // If it looks like a domain, prepend noreply@
    if (val.includes(".")) return `noreply@${val.trim()}`;
    return "onboarding@resend.dev";
  };

  if (branding?.fromEmail && branding?.businessName) {
    fromEmail = `${branding.businessName} <${branding.fromEmail}>`;
  } else if (branding?.businessName) {
    // Use business name with default email address
    const defaultEmail = extractEmail(DEFAULT_FROM_EMAIL);
    fromEmail = `${branding.businessName} <${defaultEmail}>`;
  } else if (!DEFAULT_FROM_EMAIL.includes("<")) {
    // Env var is a plain email or domain — wrap it with a display name
    const defaultEmail = extractEmail(DEFAULT_FROM_EMAIL);
    fromEmail = `CallTone <${defaultEmail}>`;
  }

  console.log(`[Email] Sending email to ${to} with subject: ${subject}`);
  console.log(`[Email] From: ${fromEmail}`);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
      ...(branding?.replyToEmail && { replyTo: branding.replyToEmail }),
    });

    if (result.error) {
      console.error("[Email] Resend API error:", result.error);
      return { success: false, error: result.error };
    }

    console.log(`[Email] Successfully sent email, ID: ${result.data?.id}`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error("[Email] Send error:", error);
    return { success: false, error };
  }
}

// Email templates
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to CallTone",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to CallTone, ${name}!</h1>
        <p>We're excited to have you on board. CallTone helps you deploy AI-powered voice agents for your business.</p>
        <p>Here's how to get started:</p>
        <ol>
          <li>Create your first AI agent</li>
          <li>Provision a phone number</li>
          <li>Make a test call</li>
        </ol>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, reply to this email or check out our documentation.
        </p>
      </div>
    `,
  });
}

export async function sendCallSummaryEmail(
  email: string,
  agentName: string,
  summary: string,
  callDetails: {
    duration: number;
    sentiment: string;
    date: string;
  }
) {
  return sendEmail({
    to: email,
    subject: `Call Summary: ${agentName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Call Summary</h2>
        <p><strong>Agent:</strong> ${agentName}</p>
        <p><strong>Date:</strong> ${callDetails.date}</p>
        <p><strong>Duration:</strong> ${Math.floor(callDetails.duration / 60)}:${(callDetails.duration % 60).toString().padStart(2, "0")}</p>
        <p><strong>Sentiment:</strong> ${callDetails.sentiment}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <h3>Summary</h3>
        <p>${summary}</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calls"
             style="color: #0070f3;">
            View full transcript →
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendDailyReportEmail(
  email: string,
  stats: {
    totalCalls: number;
    totalMinutes: number;
    avgSentiment: string;
    date: string;
  }
) {
  return sendEmail({
    to: email,
    subject: `Daily Report: ${stats.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Daily Report - ${stats.date}</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 10px;"><strong>Total Calls</strong></td>
              <td style="padding: 10px; text-align: right;">${stats.totalCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Total Minutes</strong></td>
              <td style="padding: 10px; text-align: right;">${stats.totalMinutes}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Average Sentiment</strong></td>
              <td style="padding: 10px; text-align: right;">${stats.avgSentiment}</td>
            </tr>
          </table>
        </div>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics"
             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Full Analytics
          </a>
        </p>
      </div>
    `,
  });
}

export async function sendTrialEndingEmail(email: string, name: string, daysRemaining: number) {
  return sendEmail({
    to: email,
    subject: `Your CallTone trial ends in ${daysRemaining} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${name},</h2>
        <p>Your free trial of CallTone ends in <strong>${daysRemaining} days</strong>.</p>
        <p>To continue using your AI voice agents without interruption, upgrade to a paid plan today.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing"
             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Upgrade Now
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Have questions? Reply to this email and we'll be happy to help.
        </p>
      </div>
    `,
  });
}

// Appointment email templates

interface AppointmentDetails {
  title: string;
  scheduledAt: Date;
  duration: number;
  meetingType: string;
  meetingLink?: string | null;
  location?: string | null;
  phoneNumber?: string | null;
  appointmentId?: string; // For generating action links
}

function formatAppointmentDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAppointmentTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getMeetingTypeIcon(type: string): string {
  switch (type) {
    case "video":
      return "📹";
    case "phone":
      return "📞";
    case "in_person":
      return "🏢";
    default:
      return "📅";
  }
}

function getMeetingTypeLabel(type: string): string {
  switch (type) {
    case "video":
      return "Video Call";
    case "phone":
      return "Phone Call";
    case "in_person":
      return "In-Person Meeting";
    default:
      return "Meeting";
  }
}

function getMeetingDetails(details: AppointmentDetails): string {
  let html = "";

  if (details.meetingType === "video" && details.meetingLink) {
    html = `
      <p><strong>Join Video Call:</strong></p>
      <p>
        <a href="${details.meetingLink}"
           style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Join Meeting
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">
        Or copy this link: <a href="${details.meetingLink}">${details.meetingLink}</a>
      </p>
    `;
  } else if (details.meetingType === "phone" && details.phoneNumber) {
    html = `
      <p><strong>Call Number:</strong> ${details.phoneNumber}</p>
      <p style="font-size: 12px; color: #666;">
        We will call you at this number at the scheduled time.
      </p>
    `;
  } else if (details.meetingType === "in_person" && details.location) {
    html = `
      <p><strong>Location:</strong> ${details.location}</p>
    `;
  }

  return html;
}

export async function sendAppointmentConfirmation(
  email: string,
  name: string,
  details: AppointmentDetails,
  branding?: EmailBrandingConfig
) {
  const meetingIcon = getMeetingTypeIcon(details.meetingType);
  const meetingLabel = getMeetingTypeLabel(details.meetingType);
  const meetingDetails = getMeetingDetails(details);
  const primaryColor = branding?.primaryColor || "#22c55e";
  const businessName = branding?.businessName || "CallTone";

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai";
    const { confirmUrl, rescheduleUrl, cancelUrl } = generateActionUrls(
      details.appointmentId,
      email,
      baseUrl
    );

    actionButtonsHtml = `
      <div style="margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">Manage your appointment:</p>
        <div style="display: inline-block;">
          <a href="${confirmUrl}"
             style="background: #22c55e; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✓ Confirm Attendance
          </a>
          <a href="${rescheduleUrl}"
             style="background: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            📅 Reschedule
          </a>
          <a href="${cancelUrl}"
             style="background: #ef4444; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✕ Cancel
          </a>
        </div>
      </div>
    `;
  }

  return sendEmail({
    to: email,
    subject: `Appointment Confirmed: ${details.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${primaryColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${businessName}" style="max-height: 40px; margin-bottom: 10px;" />` : ""}
          <h1 style="margin: 0; font-size: 24px;">✓ Appointment Confirmed</h1>
        </div>

        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi ${name},</p>
          <p>Your appointment has been scheduled. Here are the details:</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: #1a1a1a;">${meetingIcon} ${details.title}</h2>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatAppointmentDate(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Time:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatAppointmentTime(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Duration:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${details.duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Type:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${meetingLabel}</td>
              </tr>
            </table>
          </div>

          ${meetingDetails}

          ${actionButtonsHtml}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #666; font-size: 14px; text-align: center;">
            From ${businessName}
          </p>
        </div>
      </div>
    `,
    branding,
  });
}

export async function sendAppointmentReminder(
  email: string,
  name: string,
  details: AppointmentDetails,
  hoursUntil: number,
  branding?: EmailBrandingConfig
) {
  const meetingIcon = getMeetingTypeIcon(details.meetingType);
  const meetingLabel = getMeetingTypeLabel(details.meetingType);
  const meetingDetails = getMeetingDetails(details);
  const businessName = branding?.businessName || "CallTone";

  const reminderText = hoursUntil >= 24
    ? `in ${Math.floor(hoursUntil / 24)} day${Math.floor(hoursUntil / 24) > 1 ? "s" : ""}`
    : `in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}`;

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai";
    const { confirmUrl, rescheduleUrl, cancelUrl } = generateActionUrls(
      details.appointmentId,
      email,
      baseUrl
    );

    actionButtonsHtml = `
      <div style="margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">Manage your appointment:</p>
        <div style="display: inline-block;">
          <a href="${confirmUrl}"
             style="background: #22c55e; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✓ Confirm Attendance
          </a>
          <a href="${rescheduleUrl}"
             style="background: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            📅 Reschedule
          </a>
          <a href="${cancelUrl}"
             style="background: #ef4444; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✕ Cancel
          </a>
        </div>
      </div>
    `;
  }

  return sendEmail({
    to: email,
    subject: `Reminder: ${details.title} ${reminderText}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${businessName}" style="max-height: 40px; margin-bottom: 10px;" />` : ""}
          <h1 style="margin: 0; font-size: 24px;">⏰ Appointment Reminder</h1>
        </div>

        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi ${name},</p>
          <p>This is a friendly reminder that your appointment is coming up <strong>${reminderText}</strong>.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: #1a1a1a;">${meetingIcon} ${details.title}</h2>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatAppointmentDate(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Time:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatAppointmentTime(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Duration:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${details.duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Type:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${meetingLabel}</td>
              </tr>
            </table>
          </div>

          ${meetingDetails}

          ${actionButtonsHtml}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #666; font-size: 14px; text-align: center;">
            From ${businessName}
          </p>
        </div>
      </div>
    `,
    branding,
  });
}

export async function sendAppointmentCancellation(
  email: string,
  name: string,
  details: {
    title: string;
    scheduledAt: Date;
    reason?: string;
  },
  branding?: EmailBrandingConfig
) {
  const businessName = branding?.businessName || "CallTone";

  return sendEmail({
    to: email,
    subject: `Appointment Cancelled: ${details.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${businessName}" style="max-height: 40px; margin-bottom: 10px;" />` : ""}
          <h1 style="margin: 0; font-size: 24px;">Appointment Cancelled</h1>
        </div>

        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi ${name},</p>
          <p>Your appointment has been cancelled.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: #1a1a1a; text-decoration: line-through;">${details.title}</h2>
            <p style="margin: 0; color: #666;">
              Originally scheduled for ${formatAppointmentDate(details.scheduledAt)} at ${formatAppointmentTime(details.scheduledAt)}
            </p>
            ${details.reason ? `<p style="margin: 15px 0 0 0;"><strong>Reason:</strong> ${details.reason}</p>` : ""}
          </div>

          <p>Would you like to reschedule? Please contact us and we'll find a new time that works for you.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #666; font-size: 14px; text-align: center;">
            From ${businessName}
          </p>
        </div>
      </div>
    `,
    branding,
  });
}

// ==========================================
// Receptionist Message Notification
// ==========================================

interface ReceptionistMessageNotificationData {
  callerName: string;
  callerPhone?: string;
  callerCompany?: string;
  body: string;
  urgency: string;
  departmentName?: string;
  staffName?: string;
  messageId: string;
}

export async function sendReceptionistMessageNotification(
  email: string,
  data: ReceptionistMessageNotificationData,
  branding?: EmailBrandingConfig
) {
  const primaryColor = branding?.primaryColor || "#3b82f6";
  const businessName = branding?.businessName || "CallTone";
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai"}/dashboard/receptionist/messages`;

  const urgencyColors: Record<string, string> = {
    low: "#6b7280",
    normal: "#3b82f6",
    high: "#f59e0b",
    urgent: "#ef4444",
  };
  const urgencyColor = urgencyColors[data.urgency] || urgencyColors.normal;

  return sendEmail({
    to: email,
    subject: `New message from ${data.callerName}${data.urgency === "urgent" ? " [URGENT]" : data.urgency === "high" ? " [HIGH]" : ""}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${primaryColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${businessName}" style="max-height: 40px; margin-bottom: 10px;" />` : ""}
          <h1 style="margin: 0; font-size: 24px;">New Message</h1>
        </div>

        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: ${urgencyColor}; color: white; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">
            ${data.urgency} Priority
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 6px 0; color: #666; width: 120px;">From:</td>
                <td style="padding: 6px 0; font-weight: bold;">${data.callerName}</td>
              </tr>
              ${data.callerPhone ? `<tr><td style="padding: 6px 0; color: #666;">Phone:</td><td style="padding: 6px 0;">${data.callerPhone}</td></tr>` : ""}
              ${data.callerCompany ? `<tr><td style="padding: 6px 0; color: #666;">Company:</td><td style="padding: 6px 0;">${data.callerCompany}</td></tr>` : ""}
              ${data.departmentName ? `<tr><td style="padding: 6px 0; color: #666;">Department:</td><td style="padding: 6px 0;">${data.departmentName}</td></tr>` : ""}
              ${data.staffName ? `<tr><td style="padding: 6px 0; color: #666;">For:</td><td style="padding: 6px 0;">${data.staffName}</td></tr>` : ""}
            </table>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Message:</h3>
            <p style="margin: 0; padding: 15px; background: #fafafa; border-left: 4px solid ${urgencyColor}; border-radius: 4px; color: #333; line-height: 1.5;">
              ${data.body}
            </p>
          </div>

          <div style="margin: 25px 0; text-align: center;">
            <a href="${dashboardUrl}"
               style="background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              View in Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />

          <p style="color: #666; font-size: 12px; text-align: center;">
            This message was taken by your AI receptionist at ${businessName}
          </p>
        </div>
      </div>
    `,
    branding,
  });
}

/**
 * Send hot lead notification email to organization owner/admins
 */
export async function sendHotLeadNotification(options: {
  to: string;
  contactName: string;
  contactPhone: string;
  leadScore: number;
  sentiment: string;
  summary: string;
  buyingSignals: string[];
  nextBestAction?: string;
  callId: string;
  branding?: EmailBrandingConfig;
}) {
  const {
    to, contactName, contactPhone, leadScore, sentiment,
    summary, buyingSignals, nextBestAction, callId, branding,
  } = options;

  const businessName = branding?.businessName || "CallTone";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const signalsList = buyingSignals.length > 0
    ? buyingSignals.map((s) => `<li style="padding: 4px 0; color: #166534;">${s}</li>`).join("")
    : "<li style='color: #666;'>No specific signals detected</li>";

  return sendEmail({
    to,
    subject: `Hot Lead Alert: ${contactName} (Score: ${leadScore}/100)`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 30px;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Hot Lead Detected</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">Lead score: ${leadScore}/100</p>
          </div>
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px; color: #1a1a1a;">${contactName}</h2>
            <table style="width: 100%;"><tr><td style="padding: 6px 0; color: #666;">Phone:</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${contactPhone}</td></tr><tr><td style="padding: 6px 0; color: #666;">Sentiment:</td><td style="padding: 6px 0; text-align: right; font-weight: bold; text-transform: capitalize;">${sentiment}</td></tr><tr><td style="padding: 6px 0; color: #666;">Lead Score:</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #ea580c;">${leadScore}/100</td></tr></table>
          </div>
          <div style="margin-bottom: 20px;"><h3 style="margin: 0 0 8px; color: #1a1a1a;">Call Summary</h3><p style="color: #444; line-height: 1.6;">${summary}</p></div>
          <div style="margin-bottom: 20px;"><h3 style="margin: 0 0 8px; color: #166534;">Buying Signals</h3><ul style="padding-left: 20px; margin: 0;">${signalsList}</ul></div>
          ${nextBestAction ? `<div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;"><h3 style="margin: 0 0 8px; color: #1e40af;">Recommended Next Action</h3><p style="color: #1e40af; margin: 0; font-weight: 500;">${nextBestAction}</p></div>` : ""}
          <div style="text-align: center; margin-top: 24px;"><a href="${appUrl}/dashboard/calls/${callId}" style="display: inline-block; background: #f97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Call Details</a></div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; font-size: 14px; text-align: center;">${businessName} — Conversation Intelligence Alert</p>
        </div>
      </div>
    `,
    branding,
  });
}

// ==========================================
// Trial Email Sequence (Day 1, 7, 11, 13, 14)
// ==========================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai";
const BILLING_URL = `${APP_URL}/dashboard/settings/billing`;
const DASHBOARD_URL = `${APP_URL}/dashboard`;

function trialEmailWrapper(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0070f3, #0050b3); padding: 28px 32px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">CallTone AI</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        ${content}
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          You're receiving this because you signed up for a CallTone AI trial.<br/>
          <a href="${BILLING_URL}" style="color: #6b7280;">Manage your subscription</a>
        </p>
      </div>
    </div>
  `;
}

function ctaButton(text: string, url: string, color = "#0070f3"): string {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${url}" style="background: ${color}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
        ${text}
      </a>
    </div>
  `;
}

/** Day 1 — Welcome + Setup Guide */
export async function sendTrialDay1Email(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to CallTone — let's make your first call today",
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px;">Welcome, ${name}!</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Your 14-day free trial has started. You have <strong>100 minutes</strong> to explore everything CallTone can do for your business.</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-weight: 600; color: #111827;">Get started in 3 steps:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #374151;">
              <span style="background: #0070f3; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-block; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 10px;">1</span>
              Create your first AI voice agent
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #374151;">
              <span style="background: #0070f3; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-block; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 10px;">2</span>
              Connect a phone number
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #374151;">
              <span style="background: #0070f3; color: white; border-radius: 50%; width: 22px; height: 22px; display: inline-block; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 10px;">3</span>
              Launch a campaign and make your first AI call
            </td>
          </tr>
        </table>
      </div>

      ${ctaButton("Go to Dashboard →", DASHBOARD_URL)}

      <p style="color: #6b7280; font-size: 14px; text-align: center;">Questions? Just reply to this email — we respond fast.</p>
    `),
  });
}

/** Day 7 — Usage Milestone */
export async function sendTrialDay7Email(
  email: string,
  name: string,
  stats: { minutesUsed: number; callsHandled: number; minutesLimit: number }
) {
  const minutesLeft = Math.max(0, stats.minutesLimit - stats.minutesUsed);
  const pct = Math.round((stats.minutesUsed / stats.minutesLimit) * 100);

  return sendEmail({
    to: email,
    subject: "Your CallTone trial — halfway there",
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px;">You're halfway through your trial, ${name}</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Here's what your AI voice agent has done so far:</p>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #eff6ff; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #0070f3;">${stats.minutesUsed}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Minutes Used</p>
        </div>
        <div style="flex: 1; background: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #16a34a;">${stats.callsHandled}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Calls Handled</p>
        </div>
        <div style="flex: 1; background: #fefce8; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ca8a04;">${minutesLeft}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Minutes Left</p>
        </div>
      </div>

      <div style="background: #f9fafb; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
        <div style="background: #0070f3; height: 6px; width: ${pct}%; border-radius: 6px;"></div>
      </div>

      <p style="color: #374151; margin: 0 0 24px;">You've used <strong>${pct}% of your trial minutes</strong>. Upgrade now to keep your AI agent running without interruption.</p>

      ${ctaButton("Choose a Plan", BILLING_URL)}
    `),
  });
}

/** Day 11 — Trial Ending Warning */
export async function sendTrialDay11Email(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Your CallTone trial ends in 3 days",
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px;">Your trial ends in 3 days, ${name}</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Here's what you'll lose access to when your trial expires:</p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
          <li>Your AI voice agent and all configurations</li>
          <li>Active campaigns and contact lists</li>
          <li>Call recordings and transcripts</li>
          <li>Analytics and lead scoring</li>
          <li>Your dedicated phone number</li>
        </ul>
      </div>

      <p style="color: #374151; margin: 0 0 24px;">Upgrade before your trial ends to keep everything intact — no re-setup required.</p>

      ${ctaButton("Upgrade Now — Keep Everything", BILLING_URL, "#dc2626")}

      <p style="color: #9ca3af; font-size: 13px; text-align: center;">Plans start at $49/month. Cancel anytime.</p>
    `),
  });
}

/** Day 13 — Conversion Offer (20% off first month) */
export async function sendTrialDay13Email(
  email: string,
  name: string,
  couponCode: string
) {
  return sendEmail({
    to: email,
    subject: "Last chance: 20% off your first month of CallTone",
    html: trialEmailWrapper(`
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Limited Offer</p>
        <h2 style="margin: 0; color: white; font-size: 28px; font-weight: 800;">20% Off Your First Month</h2>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9);">Use code at checkout — expires tomorrow</p>
        <div style="background: rgba(255,255,255,0.2); border-radius: 6px; padding: 12px 24px; display: inline-block; margin-top: 16px;">
          <p style="margin: 0; color: white; font-size: 22px; font-weight: 800; letter-spacing: 3px;">${couponCode}</p>
        </div>
      </div>

      <p style="color: #374151; margin: 0 0 16px;">Hi ${name}, your trial ends tomorrow. As a thank-you for trying CallTone, we're offering <strong>20% off your first paid month</strong> — just use the code above at checkout.</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: 600; color: #111827; margin-bottom: 8px;">Starter plan after discount:</p>
        <p style="margin: 0; color: #374151;"><span style="text-decoration: line-through; color: #9ca3af;">$49/month</span> → <strong style="color: #16a34a; font-size: 20px;">$39.20/month</strong></p>
      </div>

      ${ctaButton("Claim 20% Off Now", BILLING_URL, "#f97316")}

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">Offer expires at end of Day 14. One-time use only.</p>
    `),
  });
}

/** Day 14 — Final Day Reminder */
export async function sendTrialDay14Email(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Today is your last day — upgrade CallTone now",
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px;">Today is the last day of your trial, ${name}</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Your free trial expires today. Upgrade now to keep your AI voice agent active without any interruption.</p>

      ${ctaButton("Upgrade Now →", BILLING_URL, "#16a34a")}

      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 16px;">Plans start at $49/month · No setup fees · Cancel anytime</p>
    `),
  });
}

// ==========================================
// Usage Alert Emails
// ==========================================

interface UsageAlertOptions {
  percent: number;
  minutesUsed: number;
  minutesLimit: number;
  planName: string;
  overageRateDollars: number;
}

export async function sendUsageAlertEmail(
  email: string,
  name: string,
  opts: UsageAlertOptions
) {
  const is100 = opts.percent >= 100;
  const color = is100 ? "#dc2626" : "#f59e0b";
  const subject = is100
    ? `You've hit your ${opts.planName} minute limit — overage charges now apply`
    : `Usage alert: ${opts.percent}% of your ${opts.planName} minutes used`;

  return sendEmail({
    to: email,
    subject,
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">${is100 ? "Minute limit reached" : `${opts.percent}% of minutes used`}</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, your <strong>${opts.planName}</strong> plan has ${is100 ? "reached its" : "used " + opts.percent + "% of its"} included minute allocation.</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Minutes Used:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${color};">${opts.minutesUsed.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Plan Limit:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700;">${opts.minutesLimit.toLocaleString()}</td>
          </tr>
          ${is100 ? `<tr><td style="padding: 8px 0; color: #6b7280;">Overage Rate:</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #dc2626;">$${opts.overageRateDollars.toFixed(2)}/min</td></tr>` : ""}
        </table>
      </div>

      ${is100
        ? `<p style="color: #374151; margin: 0 0 24px;">Additional calls will continue but overage charges of <strong>$${opts.overageRateDollars.toFixed(2)}/minute</strong> now apply. Upgrade to a higher plan to avoid overage.</p>`
        : `<p style="color: #374151; margin: 0 0 24px;">You have <strong>${(opts.minutesLimit - opts.minutesUsed).toLocaleString()} minutes remaining</strong> this billing cycle. Consider upgrading before you hit your limit.</p>`
      }

      ${ctaButton("View Usage & Upgrade", BILLING_URL, color)}
    `),
  });
}

interface OverageThresholdOptions {
  overageMinutes: number;
  overageCostDollars: number;
  overageRateDollars: number;
  planName: string;
}

export async function sendOverageThresholdEmail(
  email: string,
  name: string,
  opts: OverageThresholdOptions
) {
  return sendEmail({
    to: email,
    subject: `Overage update: ${opts.overageMinutes} minutes over your ${opts.planName} limit`,
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">Overage Usage Update</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, here's your running overage total for this billing cycle:</p>

      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Overage Minutes:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #ea580c;">${opts.overageMinutes.toLocaleString()} min</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Rate:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700;">$${opts.overageRateDollars.toFixed(2)}/min</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Running Total:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #ea580c; font-size: 18px;">$${opts.overageCostDollars.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <p style="color: #374151; margin: 0 0 24px;">This amount will be added as a line item on your next invoice. Upgrade your plan to reduce your per-minute overage rate.</p>

      ${ctaButton("View Billing & Upgrade", BILLING_URL, "#ea580c")}
    `),
  });
}

interface OverageCapHitOptions {
  capDollars: number;
  planName: string;
}

export async function sendOverageCapHitEmail(
  email: string,
  name: string,
  opts: OverageCapHitOptions
) {
  return sendEmail({
    to: email,
    subject: `Calls paused — your $${opts.capDollars.toFixed(2)} overage cap was reached`,
    html: trialEmailWrapper(`
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">Overage Cap Reached — Calls Paused</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, your monthly overage spending cap of <strong>$${opts.capDollars.toFixed(2)}</strong> on your <strong>${opts.planName}</strong> plan has been reached.</p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; color: #374151; font-weight: 600;">Outbound calls are now paused to prevent unexpected charges.</p>
        <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Inbound calls continue unaffected. Calls will resume automatically at the start of your next billing cycle, or you can remove the cap in your billing settings.</p>
      </div>

      ${ctaButton("Manage Overage Cap", BILLING_URL, "#dc2626")}
    `),
  });
}

export async function sendAppointmentRescheduled(
  email: string,
  name: string,
  details: AppointmentDetails,
  previousDate: Date,
  branding?: EmailBrandingConfig
) {
  const meetingIcon = getMeetingTypeIcon(details.meetingType);
  const meetingLabel = getMeetingTypeLabel(details.meetingType);
  const meetingDetails = getMeetingDetails(details);
  const businessName = branding?.businessName || "CallTone";

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.calltone.ai";
    const { confirmUrl, rescheduleUrl, cancelUrl } = generateActionUrls(
      details.appointmentId,
      email,
      baseUrl
    );

    actionButtonsHtml = `
      <div style="margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 15px; color: #666; font-size: 14px;">Manage your appointment:</p>
        <div style="display: inline-block;">
          <a href="${confirmUrl}"
             style="background: #22c55e; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✓ Confirm Attendance
          </a>
          <a href="${rescheduleUrl}"
             style="background: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            📅 Reschedule Again
          </a>
          <a href="${cancelUrl}"
             style="background: #ef4444; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px; font-weight: 500;">
            ✕ Cancel
          </a>
        </div>
      </div>
    `;
  }

  return sendEmail({
    to: email,
    subject: `Appointment Rescheduled: ${details.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="${businessName}" style="max-height: 40px; margin-bottom: 10px;" />` : ""}
          <h1 style="margin: 0; font-size: 24px;">📅 Appointment Rescheduled</h1>
        </div>

        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Hi ${name},</p>
          <p>Your appointment has been rescheduled to a new time.</p>

          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #666; text-decoration: line-through;">
              Previously: ${formatAppointmentDate(previousDate)} at ${formatAppointmentTime(previousDate)}
            </p>
          </div>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h2 style="margin: 0 0 15px 0; color: #1a1a1a;">${meetingIcon} ${details.title}</h2>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">New Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">${formatAppointmentDate(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">New Time:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">${formatAppointmentTime(details.scheduledAt)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Duration:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${details.duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Type:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${meetingLabel}</td>
              </tr>
            </table>
          </div>

          ${meetingDetails}

          ${actionButtonsHtml}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #666; font-size: 14px; text-align: center;">
            From ${businessName}
          </p>
        </div>
      </div>
    `,
    branding,
  });
}
