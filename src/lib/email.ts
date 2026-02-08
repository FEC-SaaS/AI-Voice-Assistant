import { Resend } from "resend";
import { generateActionUrls } from "./appointment-tokens";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Default FROM_EMAIL - this is overridden by organization settings when available
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "CallTone AI <onboarding@resend.dev>";

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
    fromEmail = `CallTone AI <${defaultEmail}>`;
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
    subject: "Welcome to CallTone AI",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to CallTone AI, ${name}!</h1>
        <p>We're excited to have you on board. CallTone AI helps you deploy AI-powered voice agents for your business.</p>
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
    subject: `Your CallTone AI trial ends in ${daysRemaining} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${name},</h2>
        <p>Your free trial of CallTone AI ends in <strong>${daysRemaining} days</strong>.</p>
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
  const businessName = branding?.businessName || "CallTone AI";

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://calltone.ai";
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

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #0369a1; font-size: 13px;">
              You can also reply to this email to manage your appointment. Just write what you'd like to do in your own words — for example, confirm, reschedule, cancel, or ask a question — and we'll take care of it.
            </p>
          </div>

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
  const businessName = branding?.businessName || "CallTone AI";

  const reminderText = hoursUntil >= 24
    ? `in ${Math.floor(hoursUntil / 24)} day${Math.floor(hoursUntil / 24) > 1 ? "s" : ""}`
    : `in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}`;

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://calltone.ai";
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

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #0369a1; font-size: 13px;">
              You can also reply to this email to manage your appointment. Just write what you'd like to do in your own words — for example, confirm, reschedule, cancel, or ask a question — and we'll take care of it.
            </p>
          </div>

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
  const businessName = branding?.businessName || "CallTone AI";

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
  const businessName = branding?.businessName || "CallTone AI";
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://calltone.ai"}/dashboard/receptionist/messages`;

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
  const businessName = branding?.businessName || "CallTone AI";

  // Generate action URLs if appointmentId is provided
  let actionButtonsHtml = "";
  if (details.appointmentId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://calltone.ai";
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

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #0369a1; font-size: 13px;">
              You can also reply to this email to manage your appointment. Just write what you'd like to do in your own words — for example, confirm the new time, reschedule again, cancel, or ask a question — and we'll take care of it.
            </p>
          </div>

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
