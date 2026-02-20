# How VoxForge Works

This guide explains the core concepts behind the platform — how calls are made, how agents think, how campaigns run, and how all the pieces fit together. No technical background required.

---

## The Big Picture

VoxForge AI is a **voice agent platform**. You configure AI agents, give them a phone number, and they make (or receive) calls on your behalf — handling conversations, booking appointments, taking messages, and syncing data to your CRM.

```
You (Dashboard)
    │
    ▼
AI Agent (prompt + voice + instructions)
    │
    ▼
Phone Call (outbound or inbound)
    │
    ▼
Real person on the other end
    │
    ▼
Results: transcript · recording · summary · booked appointment · CRM update
```

---

## Core Concepts

### Organizations

Everything in VoxForge is scoped to your **organization** — your agents, campaigns, contacts, call history, and billing are all private to your team. You can invite teammates with different roles:

| Role | What they can do |
|------|-----------------|
| **Owner** | Full access, billing management |
| **Admin** | All features except billing |
| **Manager** | Create/edit agents and campaigns |
| **Member** | View and make calls |
| **Viewer** | Read-only access |

---

### Agents

An **agent** is an AI voice persona. It has:

- **Name & voice** — how it sounds and introduces itself
- **System prompt** — the personality, goals, and rules it follows
- **First message** — what it says when the call connects
- **Knowledge base** — documents it can reference during a call
- **Integrations** — tools it can use (book appointments, look up contacts, update CRM)

Agents don't "remember" previous calls by default — each call starts fresh from the system prompt. However, you can inject context (contact name, history, custom data) when triggering calls via the API or campaigns.

---

### Phone Numbers

Each agent needs a **phone number** to make or receive calls. You can:

- **Provision numbers** directly in VoxForge (powered by Twilio)
- **Assign numbers** to specific agents or campaigns
- **Use one number for inbound** (receptionist) and a different one for outbound (campaigns)

Phone numbers belong to your organization and are isolated from other organizations on the platform.

---

### Campaigns

A **campaign** is a bulk outbound calling operation. You define:

- Which **agent** makes the calls
- Which **phone number** to call from
- A **contact list** to dial
- A **call window** (e.g. weekdays 9am–5pm Eastern)
- **Max concurrent calls** (how many simultaneous calls to run)
- A **scheduled start time**

VoxForge dials contacts automatically within your call window, respects Do Not Call lists, and tracks results in real time.

---

### Calls

Every call — whether triggered by a campaign, the API, or an inbound ring — is recorded as a **call record** with:

| Field | Description |
|-------|-------------|
| **Transcript** | Word-for-word conversation |
| **Recording** | Audio playback |
| **Summary** | AI-generated summary of what was discussed |
| **Sentiment** | Positive / neutral / negative |
| **Duration** | Length of the call in seconds |
| **Outcome** | What happened (booked, not interested, voicemail, etc.) |

---

## How a Call Works (Step by Step)

1. **You initiate** — via Campaign, the dashboard, or the API
2. **Agent dials** — the AI calls the phone number
3. **Conversation** — the AI listens and responds in real time using the voice and prompt you configured
4. **Tools** — if the agent needs to book an appointment or check a contact's history, it queries your connected integrations mid-call
5. **Call ends** — either party hangs up, or the max duration is reached
6. **Processing** — transcript is generated, AI analysis runs, your CRM is updated, webhooks fire
7. **Review** — call appears in your dashboard with full details

---

## Inbound Calls (AI Receptionist)

When someone calls **your VoxForge number**, the AI Receptionist answers:

- Greets the caller using your custom greeting
- Routes to the right department or staff member
- Takes a message if no one is available
- Books appointments
- Sends you an SMS/email notification

Configure your receptionist in **Dashboard → Receptionist**.

---

## Missed Call Text-Back

When an inbound call goes unanswered, VoxForge automatically:

1. Sends the caller an SMS ("Sorry we missed you…")
2. Optionally schedules an automatic callback
3. Captures the caller as a lead
4. Logs everything in your missed calls dashboard

Configure in **Dashboard → Missed Calls**.

---

## Integrations

Integrations connect VoxForge to your existing tools so agents can take action during and after calls.

### How integrations work

When your agent needs to book an appointment, it doesn't just say "I'll have someone call you back." It actually **creates the appointment** in your calendar in real time, during the call.

| Integration | What agents can do |
|------------|-------------------|
| **Google Calendar** | Book, check, and update appointments |
| **Google Sheets** | Log call data, read contact info |
| **GoHighLevel** | Sync contacts, update pipeline, create opportunities |
| **HubSpot** | Update contacts and deals |
| **Salesforce** | Log activities, update records |
| **Slack** | Send call summaries to your team |
| **Make / Zapier** | Trigger any automation workflow |
| **MCP** | Connect custom AI tools |

### Outbound webhooks

Every time a call event happens, VoxForge can send a real-time notification to **your server** or any HTTP endpoint. This lets you:

- Update your own database with call results
- Trigger actions in other systems
- Build custom dashboards

Configure webhooks in **Integrations → Webhooks**.

---

## Analytics & Intelligence

### Analytics Dashboard

Track your team's performance across:

- Total calls · completion rate · average duration
- Sentiment trends over time
- Best call times (day of week, hour)
- Campaign ROI
- Minutes used vs. plan limit
- Lead score distribution

### Conversation Intelligence

The AI automatically reviews every call and surfaces:

- **Objections** — common reasons prospects push back
- **Competitor mentions** — when your competition comes up
- **Coaching moments** — areas where the agent could improve
- **Top performers** — which agents and campaigns convert best

Find this in **Dashboard → Intelligence**.

### Live Call Monitoring

Watch calls happen in real time from **Dashboard → Live**. Supervisors can:

- **Whisper** — speak to the agent without the customer hearing
- **Barge in** — join the call as a third party
- **End call** — hang up if needed

---

## Compliance

VoxForge has built-in tools to keep your calling compliant:

### Do Not Call (DNC) List

Contacts on your DNC list are never dialed — even if they appear in a campaign. You can add numbers manually or import a list.

### Consent Tracking

Log and audit consent records for your contacts. Each consent entry stores the source, timestamp, and consent type.

### Audit Log

Every significant action in your account is logged — who did what and when. Find it in **Settings → Activity Log**.

### Call Windows

Campaigns automatically respect the call window you configure. Calls are never made outside your defined hours, protecting you from TCPA violations.

---

## Billing & Plans

### How usage is counted

VoxForge bills primarily on **minutes used** — the total duration of all calls made through the platform in a given month.

| Plan | Included minutes | Overage |
|------|-----------------|---------|
| Starter | 500 min/mo | Per-minute rate |
| Professional | 2,000 min/mo | Per-minute rate |
| Business | 5,000 min/mo | Per-minute rate |
| Enterprise | Custom | Custom |

### Overage cap

You can set a **spending cap** to prevent unexpected charges if you exceed your plan's included minutes. When the cap is reached, outbound calls pause automatically.

Find billing details in **Settings → Billing**.

---

## Security

Your data is protected at every layer:

- All traffic is encrypted in transit (TLS)
- Data is stored in an isolated database per organization
- API keys can be restricted by IP address
- Webhook payloads are HMAC-signed so you can verify authenticity
- All admin actions are logged in the audit trail
- You can rotate API keys and webhook secrets at any time
