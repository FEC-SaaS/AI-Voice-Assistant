// Integration service - OAuth flows, webhook delivery, Vapi tool config builders
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import crypto from "crypto";

const log = createLogger("IntegrationService");

// ============================================
// Types
// ============================================

export type IntegrationType =
  | "ghl"
  | "google_calendar"
  | "google_sheets"
  | "make"
  | "slack"
  | "zapier"
  | "hubspot"
  | "salesforce"
  | "mcp";

export interface IntegrationInfo {
  id: IntegrationType;
  name: string;
  description: string;
  icon: string;
  category: "crm" | "automation" | "communication" | "calendar";
  authType: "oauth" | "webhook_url" | "api_key";
  docsUrl?: string;
}

export const INTEGRATION_CATALOG: IntegrationInfo[] = [
  {
    id: "ghl",
    name: "GoHighLevel",
    description: "Book appointments, manage contacts, and check calendar availability directly in GHL during calls",
    icon: "ghl",
    category: "crm",
    authType: "oauth",
    docsUrl: "https://docs.vapi.ai/tools/go-high-level",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Schedule events and check availability in Google Calendar during voice calls",
    icon: "google_calendar",
    category: "calendar",
    authType: "oauth",
    docsUrl: "https://docs.vapi.ai/tools/google-calendar",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Automatically log call data and lead information to Google Sheets",
    icon: "google_sheets",
    category: "automation",
    authType: "oauth",
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Trigger automated Make scenarios during voice calls — connect to 1,000+ apps",
    icon: "make",
    category: "automation",
    authType: "webhook_url",
    docsUrl: "https://docs.vapi.ai/tools/make",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get real-time call notifications and send messages to Slack channels",
    icon: "slack",
    category: "communication",
    authType: "oauth",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 8,000+ apps with automated Zaps triggered by call events",
    icon: "zapier",
    category: "automation",
    authType: "webhook_url",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, log call activities, and manage deals in HubSpot CRM",
    icon: "hubspot",
    category: "crm",
    authType: "oauth",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync leads, log call activities, and manage opportunities in Salesforce",
    icon: "salesforce",
    category: "crm",
    authType: "oauth",
  },
  {
    id: "mcp",
    name: "MCP Server",
    description: "Connect any MCP-compatible service for dynamic tool discovery during calls",
    icon: "mcp",
    category: "automation",
    authType: "webhook_url",
    docsUrl: "https://docs.vapi.ai/tools/mcp",
  },
];

// Plans that allow integrations
const INTEGRATION_PLANS = ["professional", "business", "enterprise"];

// ============================================
// Plan Gating
// ============================================

export function canUseIntegrations(planId: string): boolean {
  return INTEGRATION_PLANS.includes(planId);
}

// ============================================
// OAuth URL Generators
// ============================================

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getOAuthUrl(provider: IntegrationType, orgId: string): string | null {
  const state = Buffer.from(JSON.stringify({ orgId, provider })).toString("base64url");
  const redirectUri = `${getBaseUrl()}/api/integrations/callback`;

  switch (provider) {
    case "ghl": {
      const clientId = process.env.GHL_CLIENT_ID;
      if (!clientId) return null;
      return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=contacts.readonly contacts.write calendars.readonly calendars.write calendars/events.readonly calendars/events.write&state=${state}`;
    }

    case "google_calendar":
    case "google_sheets": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      const scopes =
        provider === "google_calendar"
          ? "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
          : "https://www.googleapis.com/auth/spreadsheets";
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${state}`;
    }

    case "slack": {
      const clientId = process.env.SLACK_CLIENT_ID;
      if (!clientId) return null;
      return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,incoming-webhook&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }

    case "hubspot": {
      const clientId = process.env.HUBSPOT_CLIENT_ID;
      if (!clientId) return null;
      return `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write&state=${state}`;
    }

    case "salesforce": {
      const clientId = process.env.SALESFORCE_CLIENT_ID;
      if (!clientId) return null;
      const loginUrl = process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
      return `${loginUrl}/services/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    }

    default:
      return null;
  }
}

// ============================================
// OAuth Token Exchange
// ============================================

export async function exchangeOAuthCode(
  provider: IntegrationType,
  code: string,
  orgId: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; config?: Record<string, unknown> }> {
  const redirectUri = `${getBaseUrl()}/api/integrations/callback`;

  switch (provider) {
    case "ghl": {
      const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.GHL_CLIENT_ID!,
          client_secret: process.env.GHL_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || "GHL OAuth failed");
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        config: { locationId: data.locationId, companyId: data.companyId },
      };
    }

    case "google_calendar":
    case "google_sheets": {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || "Google OAuth failed");
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    }

    case "slack": {
      const res = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Slack OAuth failed");
      return {
        accessToken: data.access_token,
        config: {
          teamId: data.team?.id,
          teamName: data.team?.name,
          incomingWebhookUrl: data.incoming_webhook?.url,
          incomingWebhookChannel: data.incoming_webhook?.channel,
        },
      };
    }

    case "hubspot": {
      const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.HUBSPOT_CLIENT_ID!,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "HubSpot OAuth failed");
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    }

    case "salesforce": {
      const loginUrl = process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
      const res = await fetch(`${loginUrl}/services/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.SALESFORCE_CLIENT_ID!,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error_description || "Salesforce OAuth failed");
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        config: { instanceUrl: data.instance_url },
      };
    }

    default:
      throw new Error(`OAuth not supported for provider: ${provider}`);
  }
}

// ============================================
// Save Integration Connection
// ============================================

export async function saveIntegrationConnection(
  orgId: string,
  provider: IntegrationType,
  data: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    webhookUrl?: string;
    config?: Record<string, unknown>;
  }
) {
  const tokenExpiresAt = data.expiresIn
    ? new Date(Date.now() + data.expiresIn * 1000)
    : null;

  return db.integration.upsert({
    where: { organizationId_type: { organizationId: orgId, type: provider } },
    create: {
      organizationId: orgId,
      type: provider,
      status: "connected",
      accessToken: data.accessToken || null,
      refreshToken: data.refreshToken || null,
      tokenExpiresAt,
      webhookUrl: data.webhookUrl || null,
      config: data.config || {},
      lastSyncedAt: new Date(),
    },
    update: {
      status: "connected",
      accessToken: data.accessToken || undefined,
      refreshToken: data.refreshToken || undefined,
      tokenExpiresAt: tokenExpiresAt || undefined,
      webhookUrl: data.webhookUrl || undefined,
      config: data.config || undefined,
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
}

// ============================================
// Disconnect Integration
// ============================================

export async function disconnectIntegration(orgId: string, provider: IntegrationType) {
  return db.integration.update({
    where: { organizationId_type: { organizationId: orgId, type: provider } },
    data: {
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      webhookUrl: null,
      errorMessage: null,
    },
  });
}

// ============================================
// Get Org Integrations
// ============================================

export async function getOrgIntegrations(orgId: string) {
  return db.integration.findMany({
    where: { organizationId: orgId },
  });
}

export async function getIntegration(orgId: string, type: IntegrationType) {
  return db.integration.findUnique({
    where: { organizationId_type: { organizationId: orgId, type } },
  });
}

// ============================================
// Token Refresh (for OAuth providers)
// ============================================

export async function refreshTokenIfNeeded(orgId: string, type: IntegrationType) {
  const integration = await getIntegration(orgId, type);
  if (!integration || integration.status !== "connected") return null;
  if (!integration.tokenExpiresAt || !integration.refreshToken) return integration;

  // Refresh if token expires within 5 minutes
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (integration.tokenExpiresAt > fiveMinFromNow) return integration;

  log.info(`Refreshing token for ${type} in org ${orgId}`);

  try {
    let tokenUrl: string;
    let body: Record<string, string>;

    switch (type) {
      case "ghl":
        tokenUrl = "https://services.leadconnectorhq.com/oauth/token";
        body = {
          grant_type: "refresh_token",
          refresh_token: integration.refreshToken,
          client_id: process.env.GHL_CLIENT_ID!,
          client_secret: process.env.GHL_CLIENT_SECRET!,
        };
        break;
      case "google_calendar":
      case "google_sheets":
        tokenUrl = "https://oauth2.googleapis.com/token";
        body = {
          grant_type: "refresh_token",
          refresh_token: integration.refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        };
        break;
      case "hubspot":
        tokenUrl = "https://api.hubapi.com/oauth/v1/token";
        body = {
          grant_type: "refresh_token",
          refresh_token: integration.refreshToken,
          client_id: process.env.HUBSPOT_CLIENT_ID!,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        };
        break;
      case "salesforce": {
        const loginUrl = process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
        tokenUrl = `${loginUrl}/services/oauth2/token`;
        body = {
          grant_type: "refresh_token",
          refresh_token: integration.refreshToken,
          client_id: process.env.SALESFORCE_CLIENT_ID!,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        };
        break;
      }
      default:
        return integration;
    }

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    const data = await res.json();

    if (!res.ok) {
      await db.integration.update({
        where: { id: integration.id },
        data: { status: "error", errorMessage: "Token refresh failed" },
      });
      return null;
    }

    return db.integration.update({
      where: { id: integration.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || integration.refreshToken,
        tokenExpiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : integration.tokenExpiresAt,
        errorMessage: null,
      },
    });
  } catch (error) {
    log.error("Token refresh failed", error);
    return null;
  }
}

// ============================================
// Webhook Delivery
// ============================================

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliverWebhook(
  endpointId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const endpoint = await db.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint || !endpoint.isActive) return;
  if (!endpoint.events.includes(event)) return;

  const payloadStr = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadStr, endpoint.secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Event": event,
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = res.status;
    responseText = await res.text().catch(() => null);
    success = res.ok;
  } catch (error) {
    responseText = error instanceof Error ? error.message : "Delivery failed";
  }

  // Log the delivery attempt
  await db.webhookLog.create({
    data: {
      webhookEndpointId: endpointId,
      event,
      payload,
      statusCode,
      response: responseText,
      success,
    },
  });

  return { success, statusCode };
}

/**
 * Deliver a webhook event to ALL active endpoints for an organization
 */
export async function deliverWebhookToOrg(
  orgId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { organizationId: orgId, isActive: true },
  });

  const results = await Promise.allSettled(
    endpoints.map((ep) => deliverWebhook(ep.id, event, payload))
  );

  log.info(`Delivered webhook ${event} to ${results.length} endpoints for org ${orgId}`);
  return results;
}

// ============================================
// Slack Notification Sender
// ============================================

export async function sendSlackNotification(
  orgId: string,
  message: {
    text: string;
    blocks?: unknown[];
  }
) {
  const integration = await getIntegration(orgId, "slack");
  if (!integration || integration.status !== "connected") return;

  const config = integration.config as Record<string, unknown>;
  const webhookUrl = config.incomingWebhookUrl as string | undefined;

  if (!webhookUrl) {
    log.warn(`Slack integration for org ${orgId} has no incoming webhook URL`);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      log.error(`Slack notification failed: ${res.status}`);
    }
  } catch (error) {
    log.error("Slack notification error", error);
  }
}

// ============================================
// HubSpot API Helpers
// ============================================

export async function hubspotCreateContact(
  orgId: string,
  contact: { email?: string; phone?: string; firstName?: string; lastName?: string; company?: string }
) {
  const integration = await refreshTokenIfNeeded(orgId, "hubspot");
  if (!integration?.accessToken) return null;

  const properties: Record<string, string> = {};
  if (contact.email) properties.email = contact.email;
  if (contact.phone) properties.phone = contact.phone;
  if (contact.firstName) properties.firstname = contact.firstName;
  if (contact.lastName) properties.lastname = contact.lastName;
  if (contact.company) properties.company = contact.company;

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  return res.json();
}

export async function hubspotLogCallActivity(
  orgId: string,
  callData: {
    toNumber?: string;
    fromNumber?: string;
    direction: string;
    durationSeconds?: number;
    summary?: string;
    status?: string;
  }
) {
  const integration = await refreshTokenIfNeeded(orgId, "hubspot");
  if (!integration?.accessToken) return null;

  const properties: Record<string, string> = {
    hs_call_title: `AI Voice Call - ${callData.direction}`,
    hs_call_direction: callData.direction === "inbound" ? "INBOUND" : "OUTBOUND",
    hs_call_status: callData.status === "completed" ? "COMPLETED" : "NO_ANSWER",
    hs_call_body: callData.summary || "",
    hs_call_to_number: callData.toNumber || "",
    hs_call_from_number: callData.fromNumber || "",
  };

  if (callData.durationSeconds) {
    properties.hs_call_duration = String(callData.durationSeconds * 1000); // HubSpot uses ms
  }

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  return res.json();
}

// ============================================
// Salesforce API Helpers
// ============================================

export async function salesforceCreateLead(
  orgId: string,
  lead: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string }
) {
  const integration = await refreshTokenIfNeeded(orgId, "salesforce");
  if (!integration?.accessToken) return null;

  const config = integration.config as Record<string, unknown>;
  const instanceUrl = config.instanceUrl as string;
  if (!instanceUrl) return null;

  const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      FirstName: lead.firstName,
      LastName: lead.lastName || "Unknown",
      Email: lead.email,
      Phone: lead.phone,
      Company: lead.company || "Unknown",
      LeadSource: "AI Voice Agent",
    }),
  });

  return res.json();
}

export async function salesforceLogTask(
  orgId: string,
  task: { subject: string; description?: string; status?: string }
) {
  const integration = await refreshTokenIfNeeded(orgId, "salesforce");
  if (!integration?.accessToken) return null;

  const config = integration.config as Record<string, unknown>;
  const instanceUrl = config.instanceUrl as string;
  if (!instanceUrl) return null;

  const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/Task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Subject: task.subject,
      Description: task.description,
      Status: task.status || "Completed",
      Type: "Call",
    }),
  });

  return res.json();
}

// ============================================
// Vapi Tool Configs for Integrations
// ============================================

/**
 * Build Vapi-native integration tool configs for an agent based on org's connected integrations
 */
export async function getVapiIntegrationTools(orgId: string): Promise<unknown[]> {
  const integrations = await db.integration.findMany({
    where: { organizationId: orgId, status: "connected" },
  });

  const tools: unknown[] = [];

  for (const integration of integrations) {
    const config = integration.config as Record<string, unknown>;

    switch (integration.type) {
      case "ghl": {
        // GoHighLevel native Vapi tools
        tools.push(
          {
            type: "ghl",
            metadata: { ghlConfig: { locationId: config.locationId } },
            function: {
              name: "ghl_get_contact",
              description: "Look up an existing contact in GoHighLevel by email or phone",
              parameters: {
                type: "object",
                properties: {
                  email: { type: "string", description: "Contact email" },
                  phone: { type: "string", description: "Contact phone number" },
                },
              },
            },
          },
          {
            type: "ghl",
            metadata: { ghlConfig: { locationId: config.locationId } },
            function: {
              name: "ghl_create_contact",
              description: "Create a new contact in GoHighLevel",
              parameters: {
                type: "object",
                properties: {
                  firstName: { type: "string", description: "First name" },
                  lastName: { type: "string", description: "Last name" },
                  email: { type: "string", description: "Email address" },
                  phone: { type: "string", description: "Phone number" },
                },
                required: ["firstName", "phone"],
              },
            },
          },
          {
            type: "ghl",
            metadata: { ghlConfig: { locationId: config.locationId } },
            function: {
              name: "ghl_check_availability",
              description: "Check available appointment slots in GoHighLevel calendar",
              parameters: {
                type: "object",
                properties: {
                  calendarId: { type: "string", description: "The GHL calendar ID" },
                  startDate: { type: "string", description: "Start date (ISO 8601)" },
                  endDate: { type: "string", description: "End date (ISO 8601)" },
                  timezone: { type: "string", description: "Timezone (e.g. America/New_York)" },
                },
                required: ["calendarId", "startDate", "endDate"],
              },
            },
          },
          {
            type: "ghl",
            metadata: { ghlConfig: { locationId: config.locationId } },
            function: {
              name: "ghl_create_event",
              description: "Book an appointment in GoHighLevel calendar",
              parameters: {
                type: "object",
                properties: {
                  calendarId: { type: "string", description: "The GHL calendar ID" },
                  contactId: { type: "string", description: "The GHL contact ID" },
                  title: { type: "string", description: "Event title" },
                  startTime: { type: "string", description: "Start time (ISO 8601)" },
                  endTime: { type: "string", description: "End time (ISO 8601)" },
                },
                required: ["calendarId", "contactId", "title", "startTime", "endTime"],
              },
            },
          }
        );
        break;
      }

      case "google_calendar": {
        tools.push(
          {
            type: "google_calendar",
            function: {
              name: "google_calendar_check_availability",
              description: "Check availability on Google Calendar for a given time range",
              parameters: {
                type: "object",
                properties: {
                  startDateTime: { type: "string", description: "Start datetime (ISO 8601)" },
                  endDateTime: { type: "string", description: "End datetime (ISO 8601)" },
                  timezone: { type: "string", description: "Timezone (e.g. America/New_York)" },
                  calendarId: { type: "string", description: "Calendar ID (default: primary)" },
                },
                required: ["startDateTime", "endDateTime"],
              },
            },
          },
          {
            type: "google_calendar",
            function: {
              name: "google_calendar_create_event",
              description: "Create an event on Google Calendar",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Event title" },
                  startDateTime: { type: "string", description: "Start datetime (ISO 8601)" },
                  endDateTime: { type: "string", description: "End datetime (ISO 8601)" },
                  attendees: { type: "string", description: "Comma-separated email addresses" },
                  timezone: { type: "string", description: "Timezone" },
                  calendarId: { type: "string", description: "Calendar ID (default: primary)" },
                },
                required: ["title", "startDateTime", "endDateTime"],
              },
            },
          }
        );
        break;
      }

      case "make": {
        if (integration.webhookUrl) {
          tools.push({
            type: "make",
            metadata: { scenarioUrl: integration.webhookUrl },
            function: {
              name: "trigger_make_scenario",
              description: "Trigger a Make automation scenario with call data",
              parameters: {
                type: "object",
                properties: {
                  data: { type: "string", description: "JSON data to send to Make scenario" },
                },
              },
            },
          });
        }
        break;
      }

      case "mcp": {
        if (integration.webhookUrl) {
          tools.push({
            type: "mcp",
            server: {
              url: integration.webhookUrl,
            },
          });
        }
        break;
      }
    }
  }

  return tools;
}
