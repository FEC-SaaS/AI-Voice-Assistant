# Integration Testing Procedures

Step-by-step guide for testing all CalltTone integration features during development.

---

## Prerequisites

### 1. Enable Developer Mode (Bypass Plan Check)

Since you're on the free tier, add this to your `.env` file:

```env
BYPASS_PLAN_CHECK=true
```

This allows you to test all integrations without upgrading.

### 2. Apply Database Schema

```bash
npx prisma db push
npx prisma generate
```

**Expected**: Schema applies successfully with 3 new models: `Integration`, `WebhookEndpoint`, `WebhookLog`.

### 3. Start Dev Server

```bash
npm run dev
```

---

## Test 1: Integrations Page Loads

**Steps**:
1. Navigate to `http://localhost:3000/dashboard/integrations`
2. Verify the page loads without errors

**Expected Outcome**:
- Header: "Integrations" with subtitle
- Webhooks section with "Add Endpoint" button
- REST API card with "Manage Keys" link
- 4 category sections: Automation & API, CRM, Communication, Calendar
- 9 integration cards displayed:
  - Automation: Make, Zapier, MCP Server
  - CRM: GoHighLevel, HubSpot, Salesforce
  - Communication: Slack
  - Calendar: Google Calendar
- All cards show "Not Connected" status
- No "Professional+" lock badges (because BYPASS_PLAN_CHECK=true)
- "Request Integration" section at bottom

**If BYPASS_PLAN_CHECK is NOT set**:
- Yellow banner: "Upgrade to Professional"
- All Connect buttons replaced with locked "Professional+" badge

---

## Test 2: Webhook Endpoint CRUD

### 2a. Create a Webhook Endpoint

**Steps**:
1. On the integrations page, click **Add Endpoint**
2. Enter URL: `https://webhook.site` (go to https://webhook.site first, copy your unique URL)
3. Optionally add description: "Test endpoint"
4. Leave all event checkboxes checked
5. Click **Create Webhook Endpoint**

**Expected Outcome**:
- Toast: "Webhook endpoint created! Secret: whsec_..."
- New endpoint card appears with:
  - URL displayed
  - "Active" badge
  - Event badges (call.started, call.ended, call.failed, transcript.ready, analysis.complete)
  - Masked secret with copy/reveal/refresh buttons
  - Test, Logs, Delete buttons

### 2b. Test Webhook Delivery

**Steps**:
1. Click the **Test** button on your webhook endpoint
2. Check your webhook.site page

**Expected Outcome**:
- Toast: "Test delivered! Status: 200"
- On webhook.site, you see a POST request with:
  ```json
  {
    "event": "webhook.test",
    "timestamp": "2026-02-17T...",
    "organizationId": "your_org_id",
    "message": "This is a test webhook delivery from VoxForge AI"
  }
  ```
- Headers include `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event`

### 2c. View Delivery Logs

**Steps**:
1. Click **Logs (1)** on the endpoint card

**Expected Outcome**:
- Log entry appears with green checkmark
- Shows event "webhook.test", status code 200, timestamp

### 2d. Refresh Secret

**Steps**:
1. Click the refresh icon next to the secret

**Expected Outcome**:
- Toast: "Secret refreshed: whsec_..."
- Secret value changes

### 2e. Delete Webhook

**Steps**:
1. Click the red trash icon
2. Endpoint disappears

**Expected Outcome**:
- Toast: "Webhook endpoint deleted"
- Card removed from list

---

## Test 3: Make.com Integration (Webhook-based)

### 3a. Connect Make

**Steps**:
1. Find **Make (Integromat)** card under Automation
2. Click **Connect**
3. A URL input field appears
4. Enter any valid URL (for testing: `https://hook.us1.make.com/test123`)
5. Click **Connect** again

**Expected Outcome**:
- Toast: "Integration connected!"
- Make card now shows "Connected" status (green badge)
- "Disconnect" button replaces "Connect"

### 3b. Disconnect Make

**Steps**:
1. Click **Disconnect** on the Make card

**Expected Outcome**:
- Toast: "Integration disconnected"
- Card returns to "Not Connected" status

---

## Test 4: Zapier Integration (Webhook-based)

Same flow as Make (Test 3). Use a Zapier webhook URL or any valid URL for testing.

---

## Test 5: MCP Server Integration (URL-based)

Same flow as Make (Test 3). Enter an MCP server URL. The placeholder shows: `https://your-mcp-server.com/sse`

---

## Test 6: OAuth Integrations (GHL, Google, Slack, HubSpot, Salesforce)

### Without OAuth Credentials (Expected Error)

**Steps**:
1. Click **Connect** on any OAuth integration (e.g., HubSpot)

**Expected Outcome**:
- Toast error: "OAuth not configured for hubspot. Please set the required environment variables."
- This is correct — OAuth requires real API credentials

### With OAuth Credentials (Full Test)

To fully test any OAuth integration, you need to register an OAuth app with the provider:

#### GHL
1. Register at [GoHighLevel Marketplace](https://marketplace.gohighlevel.com/)
2. Create an app, set redirect URI to: `http://localhost:3000/api/integrations/callback`
3. Add to `.env`:
   ```env
   GHL_CLIENT_ID=your_client_id
   GHL_CLIENT_SECRET=your_client_secret
   ```

#### Google (Calendar + Sheets)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth credentials (Web application)
3. Add redirect URI: `http://localhost:3000/api/integrations/callback`
4. Enable Calendar API and/or Sheets API
5. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

#### Slack
1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app, add OAuth redirect URI: `http://localhost:3000/api/integrations/callback`
3. Add scopes: `chat:write`, `incoming-webhook`
4. Add to `.env`:
   ```env
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   ```

#### HubSpot
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create an app, set redirect URI: `http://localhost:3000/api/integrations/callback`
3. Add scopes: contacts, deals
4. Add to `.env`:
   ```env
   HUBSPOT_CLIENT_ID=your_client_id
   HUBSPOT_CLIENT_SECRET=your_client_secret
   ```

#### Salesforce
1. Go to Salesforce Setup > App Manager > New Connected App
2. Enable OAuth, set callback URL: `http://localhost:3000/api/integrations/callback`
3. Add to `.env`:
   ```env
   SALESFORCE_CLIENT_ID=your_client_id
   SALESFORCE_CLIENT_SECRET=your_client_secret
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   ```

**Full OAuth Test Steps**:
1. Click **Connect** on the integration
2. Browser redirects to the provider's authorization page
3. Authorize CalltTone
4. Browser redirects back to `/dashboard/integrations?connected=provider_name`
5. Toast: "provider_name connected successfully!"
6. Card shows "Connected" with green badge and last synced date

---

## Test 7: Webhook Delivery on Real Calls

This tests that the webhook delivery fires during actual Vapi call events.

### Setup
1. Create a webhook endpoint (Test 2a) with a webhook.site URL
2. Have a voice agent configured with a phone number

### Test Call
1. Make a test call to your agent's phone number (or use the Test Call button)
2. Have a brief conversation, then hang up

### Expected Webhook Deliveries

**1. `call.started`** (received within seconds of call connecting):
```json
{
  "event": "call.started",
  "callId": "vapi_call_id",
  "direction": "inbound",
  "fromNumber": "+1555...",
  "agentName": "Your Agent Name",
  "startedAt": "2026-02-17T..."
}
```

**2. `call.ended`** (received when call ends):
```json
{
  "event": "call.ended",
  "callId": "vapi_call_id",
  "direction": "inbound",
  "status": "completed",
  "durationSeconds": 45,
  "agentName": "Your Agent Name",
  "summary": "AI-generated summary...",
  "sentiment": "positive",
  "endedAt": "2026-02-17T..."
}
```

**3. `transcript.ready`** (received with call.ended):
```json
{
  "event": "transcript.ready",
  "callId": "vapi_call_id",
  "transcript": "Agent: Hello... Caller: Hi..."
}
```

**4. `analysis.complete`** (received 5-15 seconds after call ends):
```json
{
  "event": "analysis.complete",
  "callId": "vapi_call_id",
  "sentiment": "positive",
  "summary": "...",
  "leadScore": 72,
  "keyPoints": ["..."],
  "actionItems": ["..."]
}
```

---

## Test 8: Slack Notifications on Real Calls

### Setup
1. Connect Slack integration (requires OAuth credentials)
2. Make a test call

### Expected Slack Messages

**On call start**: `"Call received/started with Sales Agent"`
**On call end**: `"Call ended (2m 30s) - completed | Sentiment: positive\n> Summary of the conversation..."`

---

## Test 9: Integration Tools in Voice Agents

This verifies that connected integrations inject tools into voice agents.

### Setup
1. Connect a Make integration with a webhook URL
2. Create or edit a voice agent

### Verification (Database Check)
```bash
npx prisma studio
```
1. Open the `Integration` table
2. Verify your connected integration shows `status: "connected"` and has the `webhookUrl` stored

### Verification (Agent Sync)
1. Edit any agent and click **Save**
2. Check the server logs for: `[Vapi] Creating assistant with voice:...`
3. The request to Vapi should now include integration tools in the `model.tools` array

---

## Test 10: Plan Gating

### With BYPASS_PLAN_CHECK=true
- All integrations accessible
- No lock icons or upgrade banners

### Without BYPASS_PLAN_CHECK (remove from .env)
1. Restart dev server
2. Navigate to integrations page
3. **Expected**: Yellow "Upgrade to Professional" banner appears
4. All Connect buttons show locked "Professional+" badge
5. Attempting to create webhook via API returns 403: "Webhooks require a Professional plan or higher"

---

## Test 11: Prisma Studio Verification

```bash
npx prisma studio
```

Open and verify these tables:

| Table | Expected |
|-------|----------|
| `Integration` | Records for each connected integration with type, status, tokens |
| `WebhookEndpoint` | Your created webhook endpoints with URL, secret, events |
| `WebhookLog` | Delivery logs from test webhooks and real call events |

---

## Quick Test Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Page loads with 9 integration cards | [ ] |
| 2a | Create webhook endpoint | [ ] |
| 2b | Test webhook delivery (webhook.site) | [ ] |
| 2c | View delivery logs | [ ] |
| 2d | Refresh webhook secret | [ ] |
| 2e | Delete webhook endpoint | [ ] |
| 3 | Connect Make via webhook URL | [ ] |
| 4 | Connect Zapier via webhook URL | [ ] |
| 5 | Connect MCP Server via URL | [ ] |
| 6 | OAuth error without credentials | [ ] |
| 7 | Webhook fires on real call events | [ ] |
| 8 | Slack notification on call | [ ] |
| 9 | Integration tools injected in agents | [ ] |
| 10 | Plan gating works correctly | [ ] |
| 11 | Database records verified | [ ] |

---

## Environment Variables Summary

```env
# Required for dev testing
BYPASS_PLAN_CHECK=true

# OAuth - GHL (optional)
GHL_CLIENT_ID=
GHL_CLIENT_SECRET=

# OAuth - Google Calendar + Sheets (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth - Slack (optional)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# OAuth - HubSpot (optional)
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=

# OAuth - Salesforce (optional)
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```
