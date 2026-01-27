import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "VoxForge AI <hello@voxforge.ai>";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text } = options;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// Email templates
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to VoxForge AI",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to VoxForge AI, ${name}!</h1>
        <p>We're excited to have you on board. VoxForge AI helps you deploy AI-powered voice agents for your business.</p>
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
    subject: `Your VoxForge AI trial ends in ${daysRemaining} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${name},</h2>
        <p>Your free trial of VoxForge AI ends in <strong>${daysRemaining} days</strong>.</p>
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
