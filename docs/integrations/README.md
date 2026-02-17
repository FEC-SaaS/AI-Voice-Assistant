# CalltTone Integrations Guide

Connect CalltTone with your favorite business tools to automate workflows, sync data, and extend your voice agents' capabilities during live calls.

---

## Table of Contents

1. [Overview](#overview)
2. [Plan Requirements](#plan-requirements)
3. [GoHighLevel (GHL)](#gohighlevel-ghl)
4. [Google Calendar](#google-calendar)
5. [Google Sheets](#google-sheets)
6. [Make (Integromat)](#make-integromat)
7. [Slack](#slack)
8. [Zapier](#zapier)
9. [HubSpot](#hubspot)
10. [Salesforce](#salesforce)
11. [MCP Server](#mcp-server)
12. [Outbound Webhooks](#outbound-webhooks)
13. [REST API](#rest-api)

---

## Overview

CalltTone integrations fall into three categories:

| Type | How It Works | Examples |
|------|-------------|----------|
| **Voice Agent Tools** | Your voice agent can use these tools *during* a live call (e.g., book an appointment, look up a contact) | GHL, Google Calendar, Make, MCP |
| **Event Notifications** | CalltTone sends real-time notifications when events happen (calls start/end, transcripts ready) | Slack, Webhooks, Zapier |
| **CRM Sync** | Call data and contacts are automatically synced to your CRM after each call | HubSpot, Salesforce |

When you connect an integration, CalltTone automatically adds the relevant capabilities to all your voice agents. No per-agent configuration needed.

---

## Plan Requirements

| Plan | Integrations |
|------|-------------|
| Free Trial | Not available |
| Starter | Not available |
| **Professional** | All integrations |
| **Business** | All integrations |
| Enterprise | All integrations + custom connectors |

> **Developer Mode**: Set `BYPASS_PLAN_CHECK=true` in your `.env` file to test integrations during development regardless of plan tier.

---

## GoHighLevel (GHL)

**Category**: CRM / Calendar
**Auth**: OAuth 2.0
**What it does**: Your voice agents can manage contacts and book appointments directly in your GoHighLevel calendar during live calls.

### Capabilities

| Tool | Description |
|------|-------------|
| **Get Contact** | Look up an existing contact by email or phone to avoid duplicates |
| **Create Contact** | Create a new lead/client with name, email, and phone |
| **Check Availability** | Query your GHL calendar for open appointment slots |
| **Book Appointment** | Schedule an event in your GHL calendar, linked to a contact |

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **GoHighLevel** under CRM
3. Click **Connect**
4. You'll be redirected to GoHighLevel to authorize CalltTone
5. Select the location you want to connect
6. Grant the requested permissions (Contacts, Calendars)
7. You'll be redirected back to CalltTone with a success message

### Environment Variables Required

```env
GHL_CLIENT_ID=your_ghl_app_client_id
GHL_CLIENT_SECRET=your_ghl_app_client_secret
```

### How It Works During Calls

Once connected, your voice agents can:

1. **Caller asks to book**: Agent checks availability in your GHL calendar
2. **Agent finds open slot**: Presents options to the caller
3. **Caller confirms**: Agent creates the contact (if new) and books the appointment
4. **Confirmation**: Both the caller and your team receive confirmation

### Configuration

After connecting, you can set your default `calendarId` in the integration config. Go to your GHL dashboard to find the calendar ID you want agents to use.

---

## Google Calendar

**Category**: Calendar
**Auth**: OAuth 2.0 (Google)
**What it does**: Your voice agents can schedule events and check availability on Google Calendar during live calls.

### Capabilities

| Tool | Description |
|------|-------------|
| **Check Availability** | Verify if a time slot is open on any Google Calendar |
| **Create Event** | Schedule a new event with title, time, attendees, and timezone |

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **Google Calendar** under Calendar
3. Click **Connect**
4. Sign in with your Google account
5. Grant access to Google Calendar
6. You'll be redirected back with a success message

### Environment Variables Required

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Notes

- Works with your primary calendar by default
- Supports timezone-aware scheduling across regions
- All events use ISO 8601 datetime format
- If you already use CalltTone's built-in appointment system, Google Calendar events are created *in addition* to CalltTone appointments

---

## Google Sheets

**Category**: Automation
**Auth**: OAuth 2.0 (Google, shared with Calendar)
**What it does**: Automatically log call data, lead information, and appointment details to a Google Sheet.

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **Google Sheets** under Automation
3. Click **Connect**
4. Grant access to Google Sheets (if you already connected Google Calendar, permissions may already be granted)

### Environment Variables Required

Same as Google Calendar:
```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

---

## Make (Integromat)

**Category**: Automation
**Auth**: Webhook URL
**What it does**: Trigger automated Make scenarios during voice calls. Connect to 1,000+ apps through Make's visual workflow builder.

### Capabilities

Your voice agent can trigger a Make scenario mid-call, passing conversation data to your workflow. This enables:

- Creating records in any app Make supports
- Sending emails/SMS through Make
- Updating databases, CRMs, or project management tools
- Running complex multi-step automations

### Setup

1. In Make, create a new scenario with a **Webhook** trigger
2. Copy the webhook URL Make provides
3. In CalltTone, navigate to **Dashboard > Integrations**
4. Find **Make** under Automation
5. Click **Connect**
6. Paste your Make webhook URL
7. Click **Connect**

### How It Works

When your voice agent determines it should trigger an automation (based on conversation context), it sends a POST request to your Make webhook with the call data. Make then runs your scenario.

### Example Use Cases

- **After qualifying a lead**: Agent triggers Make to create a deal in Pipedrive + send a Slack message + add to an email sequence
- **Appointment booked**: Agent triggers Make to create a Zoom link + send calendar invite + update your CRM
- **Support escalation**: Agent triggers Make to create a Zendesk ticket + page the on-call team

---

## Slack

**Category**: Communication
**Auth**: OAuth 2.0
**What it does**: Get real-time call notifications in your Slack channels.

### Notifications Sent

| Event | Message |
|-------|---------|
| **Call Started** | "Call received/started with [Agent Name]" |
| **Call Ended** | "Call ended (duration) - status \| Sentiment: positive/neutral/negative" with call summary |

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **Slack** under Communication
3. Click **Connect**
4. Select the Slack workspace and channel for notifications
5. Authorize CalltTone

### Environment Variables Required

```env
SLACK_CLIENT_ID=your_slack_app_client_id
SLACK_CLIENT_SECRET=your_slack_app_client_secret
```

---

## Zapier

**Category**: Automation
**Auth**: Webhook URL
**What it does**: Connect CalltTone to 8,000+ apps with automated Zaps triggered by call events.

### Setup

1. In Zapier, create a new Zap with **Webhooks by Zapier** as the trigger
2. Choose **Catch Hook** as the trigger event
3. Copy the webhook URL Zapier provides
4. In CalltTone, navigate to **Dashboard > Integrations**
5. Find **Zapier** under Automation
6. Click **Connect** and paste the webhook URL

### Difference from Make

Both Make and Zapier connect to thousands of apps. The key difference:

- **Make**: Agent triggers scenarios *during* calls (real-time, mid-conversation)
- **Zapier**: CalltTone sends event data *after* events happen (call ended, transcript ready, etc.)

You can use both simultaneously for different purposes.

---

## HubSpot

**Category**: CRM
**Auth**: OAuth 2.0
**What it does**: Automatically sync contacts and log call activities to HubSpot CRM after each call.

### What Gets Synced

| Data | Direction | When |
|------|-----------|------|
| **Call Activity** | CalltTone -> HubSpot | After call analysis completes |
| **Contact Creation** | CalltTone -> HubSpot | When a new lead is captured |

### Call Activity Fields

- Call direction (inbound/outbound)
- Duration
- Status (completed/no-answer)
- Call summary (AI-generated)
- From/To numbers

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **HubSpot** under CRM
3. Click **Connect**
4. Authorize CalltTone in HubSpot
5. Grant permissions for Contacts and Deals

### Environment Variables Required

```env
HUBSPOT_CLIENT_ID=your_hubspot_app_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_app_client_secret
```

---

## Salesforce

**Category**: CRM
**Auth**: OAuth 2.0
**What it does**: Automatically create leads and log call tasks in Salesforce after each call.

### What Gets Synced

| Data | Direction | When |
|------|-----------|------|
| **Task (Call Log)** | CalltTone -> Salesforce | After call analysis completes |
| **Lead Creation** | CalltTone -> Salesforce | When a new lead is captured |

### Lead Fields

- First/Last Name, Email, Phone, Company
- Lead Source: "AI Voice Agent"

### Setup

1. Navigate to **Dashboard > Integrations**
2. Find **Salesforce** under CRM
3. Click **Connect**
4. Log in to Salesforce and authorize CalltTone

### Environment Variables Required

```env
SALESFORCE_CLIENT_ID=your_salesforce_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_connected_app_client_secret
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

---

## MCP Server

**Category**: Automation
**Auth**: Server URL
**What it does**: Connect any MCP (Model Context Protocol) compatible service to your voice agents for dynamic tool discovery.

### How It Works

1. When a call starts, CalltTone connects to your MCP server
2. The server responds with a list of available tools
3. These tools become available to the voice agent for that call
4. If the agent needs a tool, CalltTone routes the request to your MCP server

This is the most flexible integration — you can build custom tools that your voice agents use during calls without modifying CalltTone.

### Setup

1. Deploy an MCP-compatible server (see [MCP Specification](https://modelcontextprotocol.io/))
2. In CalltTone, navigate to **Dashboard > Integrations**
3. Find **MCP Server** under Automation
4. Click **Connect** and enter your MCP server URL
5. Your agents will now discover and use tools from your server

### Use Cases

- Custom database lookups during calls
- Proprietary business logic execution
- Integration with internal APIs
- Dynamic pricing or inventory checks

---

## Outbound Webhooks

**Category**: Developer
**Auth**: HMAC-SHA256 signed
**What it does**: Receive real-time HTTP POST notifications when events happen in CalltTone.

### Available Events

| Event | Description |
|-------|-------------|
| `call.started` | A call begins (inbound or outbound) |
| `call.ended` | A call completes, with duration, status, and summary |
| `call.failed` | A call failed to connect |
| `transcript.ready` | Full transcript is available |
| `analysis.complete` | AI analysis finished (sentiment, lead score, key points) |

### Payload Format

All webhooks are sent as `POST` requests with:

```
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 hex digest>
X-Webhook-Timestamp: <Unix timestamp>
X-Webhook-Event: <event name>
```

### Example Payload (`call.ended`)

```json
{
  "event": "call.ended",
  "callId": "call_abc123",
  "direction": "inbound",
  "status": "completed",
  "durationSeconds": 247,
  "fromNumber": "+15551234567",
  "toNumber": "+15559876543",
  "agentName": "Sales Agent",
  "summary": "Customer inquired about pricing for the premium plan...",
  "sentiment": "positive",
  "endedAt": "2026-02-17T12:34:56.789Z"
}
```

### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}
```

### Setup

1. Navigate to **Dashboard > Integrations**
2. Under **Webhooks**, click **Add Endpoint**
3. Enter your endpoint URL
4. Select which events to receive
5. A signing secret is generated automatically — copy and store it securely
6. Click **Create Webhook Endpoint**
7. Use the **Test** button to verify delivery

### Limits

- Maximum 5 webhook endpoints per organization
- 10-second delivery timeout
- Delivery logs available for debugging

---

## REST API

CalltTone provides a full REST API for building custom integrations.

### Available Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/v1/agents` | GET, POST | Manage voice agents |
| `/api/v1/calls` | GET | Query call history |
| `/api/v1/campaigns` | GET, POST | Manage campaigns |
| `/api/v1/appointments` | GET, POST | Manage appointments |
| `/api/v1/appointments/available-slots` | GET | Check availability |

### Authentication

All API requests require an API key in the `Authorization` header:

```
Authorization: Bearer vxf_your_api_key_here
```

Manage API keys at **Dashboard > Settings > API Keys**.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OAuth redirect fails | Verify your redirect URI matches: `https://your-domain.com/api/integrations/callback` |
| Integration shows "Error" | Click Disconnect, then Connect again to re-authorize |
| Webhook deliveries failing | Check the delivery logs — verify your endpoint is publicly accessible and returns 2xx |
| Tools not appearing in calls | After connecting an integration, re-sync your agents (Agents > Edit > Save) |
| Plan upgrade required | Integrations require Professional plan or higher |
