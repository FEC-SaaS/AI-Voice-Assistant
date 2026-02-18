# CallTone AI — White-Label AI Voice Agent SaaS

> A production-grade B2B SaaS platform for AI-powered voice agents. Built for cold calling, AI receptionists, appointment scheduling, and compliance — powered by Vapi.ai, Twilio, Stripe, and Clerk.

**Live domain:** [calltone.ai](https://calltone.ai)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Prerequisites](#prerequisites)
6. [Environment Variables](#environment-variables)
7. [Local Development Setup](#local-development-setup)
8. [Database Setup](#database-setup)
9. [Running the Application](#running-the-application)
10. [Available Scripts](#available-scripts)
11. [Dashboard Routes](#dashboard-routes)
12. [API Reference](#api-reference)
13. [Webhooks](#webhooks)
14. [Cron Jobs](#cron-jobs)
15. [Integrations](#integrations)
16. [Billing Plans](#billing-plans)
17. [Deployment](#deployment)
18. [Project Structure](#project-structure)

---

## Overview

CallTone AI is a white-label B2B SaaS platform that lets businesses deploy AI voice agents for:

- **Outbound cold calling** — automated campaign dialing with AI agents
- **AI receptionist** — inbound call routing, department directories, message taking
- **Appointment scheduling** — booking, reminders, and a self-service portal
- **Missed call text-back** — automatic SMS follow-up on missed inbound calls
- **Conversation intelligence** — AI analysis of competitor mentions, objections, and coaching
- **Compliance** — DNC list management, consent tracking, audit logs
- **CRM integrations** — GoHighLevel, HubSpot, Salesforce, Google Calendar, Slack, Zapier, and more

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.3 |
| **API Layer** | tRPC 10 + React Query 4 |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma 5 |
| **Auth** | Clerk (organizations, roles, SSO) |
| **Voice AI** | Vapi.ai |
| **AI Analysis** | OpenAI (GPT-4, Whisper) |
| **Phone / SMS** | Twilio |
| **Email** | Resend |
| **Billing** | Stripe |
| **File Storage** | Cloudflare R2 (S3-compatible) |
| **Cache / Rate Limiting** | Upstash Redis |
| **UI** | Tailwind CSS + shadcn/ui (Radix UI) |
| **Charts** | Recharts |
| **PDF Export** | @react-pdf/renderer |
| **Monitoring** | Sentry + PostHog |
| **Validation** | Zod |
| **Forms** | React Hook Form |
| **State** | Zustand |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 14 App                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Marketing   │  │  Dashboard   │  │   API Routes  │  │
│  │  /           │  │  /dashboard/ │  │   /api/       │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                           │                   │          │
│              ┌────────────▼───────────┐       │          │
│              │       tRPC Routers     │       │          │
│              │  (18 routers, type-safe│       │          │
│              │   end-to-end API)      │       │          │
│              └────────────┬───────────┘       │          │
│                           │                   │          │
│              ┌────────────▼───────────┐       │          │
│              │    Service Layer       │       │          │
│              │  (11 business logic    │       │          │
│              │   services)            │       │          │
│              └────────────┬───────────┘       │          │
└───────────────────────────┼───────────────────┘          │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌─────▼──────┐     ┌─────▼──────┐
   │Postgres │        │ Upstash    │     │ External   │
   │(Supabase│        │ Redis      │     │ Services   │
   │ PgBouncer│       │ Cache/Rate │     │Vapi/Twilio/│
   └─────────┘        │ Limiting   │     │Stripe/OAI  │
                      └────────────┘     └────────────┘
```

### Data Flow

1. **Client** → tRPC → **Router** → **Service** → **Prisma** → PostgreSQL
2. **Vapi webhooks** → `/api/webhooks/vapi` → handler → DB + downstream actions
3. **Stripe webhooks** → `/api/webhooks/stripe` → billing service → DB
4. **Cron jobs** → `/api/cron/*` → campaign executor / analysis / reminders

---

## Features

### Core Platform
- **Multi-tenant** architecture with Clerk organizations
- **Role-based access control** — owner, admin, manager, member, viewer
- **6-step onboarding wizard** with setup guide banner
- **White-label ready** — custom branding, colors, email domains

### Voice Agents
- Create and manage Vapi.ai voice agents with custom system prompts
- Select voice model (male/female), LLM model, and temperature
- Upload knowledge base documents (PDF, DOCX, URL scraping)
- Test calls directly from the dashboard
- Sync agents to Vapi with one click

### Campaign Management
- Create outbound calling campaigns with contact lists
- Import contacts via CSV or manual entry
- Schedule campaigns with time windows and rate limits
- Real-time campaign stats (answered rate, outcome breakdown)
- Pause, resume, and stop running campaigns

### Real-Time Call Monitoring (`/dashboard/live`)
- View all active calls in real time
- **Supervisor controls:** barge-in, whisper coaching, end call
- Live transcript streaming via Vapi websockets

### Conversation Intelligence (`/dashboard/intelligence`)
- AI analysis of completed calls
- Competitor mention tracking and trends
- Objection pattern detection
- Coaching recommendations for agents
- Buying signal feed

### Smart Lead Scoring (`/dashboard/leads`)
- AI-driven lead scores based on call analysis
- Pipeline visualization by stage
- Next-best-action recommendations per lead

### AI Receptionist (`/dashboard/receptionist`)
- Department directory with phone numbers and extensions
- Staff member management with availability schedules
- Business hours configuration
- Vapi `transferCall` tool injection for live routing
- Message taking with urgency flagging
- Email/SMS notifications for new messages

### Appointment Scheduling (`/dashboard/appointments`)
- Calendar-based booking system
- Google Calendar and Outlook sync
- Multi-channel reminders (email, SMS, Vapi voice calls)
- Self-service portal for confirm/cancel/reschedule (token-authenticated)
- Branded layout for the self-service portal

### Missed Call Text-Back (`/dashboard/missed-calls`)
- Auto-SMS when inbound call is missed
- Auto-callback scheduling
- Lead capture from missed callers
- Deduplication and DNC checking

### Phone Number Management
- Search, purchase, and release Twilio phone numbers
- Twilio subaccount isolation per organization
- CNAM registration via Twilio Trust Hub
- Phone number pool management

### Compliance Dashboard (`/dashboard/compliance`)
- DNC list management (national, internal, verbal request)
- Consent tracking with expiration (PEWC, EXPRESS, EBR types)
- Two-party consent state detection
- Full audit log of all platform actions
- Compliance score calculation
- Export compliance reports

### Billing & Subscriptions (`/dashboard/settings/billing`)
- Stripe-powered subscription management
- Plans: Free Trial, Starter, Professional, Business
- Usage-based overage pricing for call minutes
- Invoice history and payment method management
- Stripe Customer Portal integration

### Integrations (`/dashboard/integrations`)

| Integration | Type | Features |
|------------|------|---------|
| GoHighLevel | CRM/Automation | Contact sync, pipeline updates |
| HubSpot | CRM | Contact and deal sync |
| Salesforce | CRM | Lead and opportunity sync |
| Google Calendar | Scheduling | Two-way appointment sync |
| Google Sheets | Data | Export contacts and call data |
| Slack | Notifications | Call alerts and summaries |
| Zapier | Automation | Outbound webhooks |
| Make (Integromat) | Automation | Outbound webhooks |
| MCP | AI Tools | Custom tool injection into Vapi |

**Outbound Webhooks:** Custom webhook endpoints with HMAC-SHA256 signing and delivery logs.

### REST API (`/api/v1`)
- API key management with SHA256 hashing
- Endpoints for calls, campaigns, appointments, and agents
- OpenAPI-compatible request/response formats

### Analytics (`/dashboard/analytics`)
- Call volume trends and KPI cards
- Sentiment analysis breakdown
- Hourly call distribution heatmap
- Campaign performance comparison table
- Custom report builder
- PDF export of reports

---

## Prerequisites

Before running this application, you need accounts and API keys for:

| Service | Purpose | URL |
|---------|---------|-----|
| **Node.js 18+** | Runtime | [nodejs.org](https://nodejs.org) |
| **PostgreSQL** (Supabase recommended) | Database | [supabase.com](https://supabase.com) |
| **Clerk** | Authentication | [clerk.com](https://clerk.com) |
| **Vapi.ai** | Voice AI | [vapi.ai](https://vapi.ai) |
| **Twilio** | Phone & SMS | [twilio.com](https://twilio.com) |
| **Stripe** | Billing | [stripe.com](https://stripe.com) |
| **OpenAI** | Call analysis | [platform.openai.com](https://platform.openai.com) |
| **Resend** | Email | [resend.com](https://resend.com) |
| **Cloudflare R2** (or AWS S3) | File storage | [cloudflare.com](https://cloudflare.com) |
| **Upstash Redis** | Cache & rate limiting | [upstash.com](https://upstash.com) |
| **Sentry** (optional) | Error monitoring | [sentry.io](https://sentry.io) |
| **PostHog** (optional) | Product analytics | [posthog.com](https://posthog.com) |

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# ─── App ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000          # Change to your domain in production
NODE_ENV=development

# Set to "true" to bypass Stripe plan checks during development only
BYPASS_PLAN_CHECK=false

# ─── Database ────────────────────────────────────────────────────────────────
# Connection-pooled URL (used by Prisma at runtime via PgBouncer)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
# Direct URL (used by Prisma for migrations — bypasses PgBouncer)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# ─── Upstash Redis ────────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL="https://YOUR-INSTANCE.upstash.io"
UPSTASH_REDIS_REST_TOKEN="YOUR_UPSTASH_TOKEN"

# ─── Clerk (Authentication) ──────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...          # From Clerk dashboard → Webhooks
CLERK_WEBHOOK_SIGNING_SECRET=whsec_... # Same as CLERK_WEBHOOK_SECRET

# Auth redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/sign-up

# ─── Vapi.ai (Voice AI) ──────────────────────────────────────────────────────
VAPI_API_KEY=your-vapi-private-key
VAPI_WEBHOOK_SECRET=your-vapi-webhook-secret
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-public-key
# Optional: pre-created demo assistant IDs
NEXT_PUBLIC_VAPI_MALE_ASSISTANT_ID=vapi-assistant-id
NEXT_PUBLIC_VAPI_FEMALE_ASSISTANT_ID=vapi-assistant-id

# ─── Stripe (Billing) ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe dashboard → Webhooks
STRIPE_STARTER_PRICE_ID=price_...      # Monthly price ID for Starter plan
STRIPE_PROFESSIONAL_PRICE_ID=price_... # Monthly price ID for Professional plan
STRIPE_BUSINESS_PRICE_ID=price_...     # Monthly price ID for Business plan
STRIPE_OVERAGE_PRICE_ID=price_...      # Per-unit overage price ID

# ─── Appointment Portal ──────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
APPOINTMENT_TOKEN_SECRET=your-64-char-hex-secret

# ─── OpenAI ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-...

# ─── Cloudflare R2 / AWS S3 (File Storage) ───────────────────────────────────
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name

# ─── Resend (Email) ──────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...         # For inbound email webhook
EMAIL_FROM_ADDRESS="mail.yourdomain.com"

# ─── Twilio (Phone & SMS) ────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Google OAuth (Calendar & Sheets Integration) ────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# ─── Microsoft OAuth (Outlook Calendar Integration) ──────────────────────────
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# ─── Monitoring ──────────────────────────────────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ─── Cron Security ───────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
CRON_SECRET=your-64-char-hex-secret
```

### Generating Secrets

```bash
# Generate APPOINTMENT_TOKEN_SECRET and CRON_SECRET
openssl rand -hex 32
```

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd Voxforge-ai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys (see Environment Variables section above)
```

### 3. Set up the database

```bash
# Generate Prisma client from the schema
npm run db:generate

# Push schema to your database (dev — creates tables without migration history)
npm run db:push

# OR use migrations (production-style — tracks changes)
npm run db:migrate
```

### 4. (Optional) Seed the database

```bash
npm run db:seed
```

### 5. Set up Clerk

1. Create an application at [clerk.com](https://clerk.com)
2. Enable **Organizations** in the Clerk dashboard
3. Add webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `organization.created`, `organizationMembership.created`
4. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SECRET` to `.env`

### 6. Set up Stripe

1. Create products and prices at [stripe.com](https://stripe.com)
2. Create 4 prices: Starter, Professional, Business (monthly recurring), and Overage (per-unit metered)
3. Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Subscribe to: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `checkout.session.completed`
4. Copy price IDs and webhook secret to `.env`

### 7. Set up Vapi.ai

1. Create an account at [vapi.ai](https://vapi.ai)
2. Copy your Private API Key → `VAPI_API_KEY`
3. Copy your Public Key → `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
4. Add webhook URL: `https://your-domain.com/api/webhooks/vapi`
5. Set the webhook secret → `VAPI_WEBHOOK_SECRET`

### 8. Set up Twilio

1. Create an account at [twilio.com](https://twilio.com)
2. Copy Account SID and Auth Token
3. Create a Messaging Service for SMS
4. Configure inbound SMS webhook: `https://your-domain.com/api/webhooks/twilio/sms`

### 9. Set up Cloudflare R2 (File Storage)

1. Create an R2 bucket at [cloudflare.com](https://cloudflare.com)
2. Create an API token with R2 read/write permissions
3. Set bucket CORS policy to allow `PUT` from your domain

---

## Running the Application

### Development

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

> **Webhooks during local development:** Use a tunnel to expose your local server so Clerk, Stripe, Vapi, and Twilio can reach it.

```bash
# Using ngrok
ngrok http 3000
# Update all webhook URLs in Clerk, Stripe, Vapi, and Twilio dashboards
# to point to your ngrok URL (e.g. https://abc123.ngrok.io/api/webhooks/...)
```

### Production Build

```bash
npm run build
npm run start
```

---

## Available Scripts

| Script | Description |
|--------|------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Generate Prisma client + build Next.js for production |
| `npm run start` | Start the production server |
| `npm run lint` | Lint TypeScript/TSX files |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run type-check` | Run TypeScript compiler check (no emit) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:migrate` | Run Prisma migrations (dev mode — prompts for migration name) |
| `npm run db:push` | Push schema directly to DB without migration history |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) at localhost:5555 |
| `npm run db:seed` | Run the database seed script |

---

## Dashboard Routes

All authenticated routes live under `/dashboard/`:

### Core

| Route | Description |
|-------|------------|
| `/dashboard` | Main dashboard with KPI cards and setup guide |
| `/dashboard/onboarding` | 6-step onboarding wizard (new organizations) |

### Agents

| Route | Description |
|-------|------------|
| `/dashboard/agents` | List all voice agents |
| `/dashboard/agents/new` | Create a new agent |
| `/dashboard/agents/[id]` | View agent details |
| `/dashboard/agents/[id]/edit` | Edit agent configuration |

### Campaigns

| Route | Description |
|-------|------------|
| `/dashboard/campaigns` | List all campaigns |
| `/dashboard/campaigns/new` | Create a campaign |
| `/dashboard/campaigns/[id]` | Campaign details and stats |

### Calls

| Route | Description |
|-------|------------|
| `/dashboard/calls` | Full call history |
| `/dashboard/calls/[id]` | Call detail with transcript and recording |
| `/dashboard/live` | Real-time call monitoring + supervisor controls |

### Contacts

| Route | Description |
|-------|------------|
| `/dashboard/contacts` | Contact list (CSV import + manual entry) |

### Appointments

| Route | Description |
|-------|------------|
| `/dashboard/appointments` | Appointment calendar and list |

### Phone Numbers

| Route | Description |
|-------|------------|
| `/dashboard/phone-numbers` | Manage purchased phone numbers |
| `/dashboard/phone-numbers/cnam` | CNAM business profile registration |

### Intelligence & Analytics

| Route | Description |
|-------|------------|
| `/dashboard/analytics` | Call trends, campaign performance, PDF reports |
| `/dashboard/intelligence` | AI conversation analysis (competitors, objections, coaching) |
| `/dashboard/leads` | Smart lead scoring pipeline |

### AI Receptionist

| Route | Description |
|-------|------------|
| `/dashboard/receptionist` | Receptionist overview and stats |
| `/dashboard/receptionist/departments` | Department directory |
| `/dashboard/receptionist/departments/[id]` | Department details |
| `/dashboard/receptionist/staff` | Staff member management |
| `/dashboard/receptionist/messages` | Message history |

### Missed Calls

| Route | Description |
|-------|------------|
| `/dashboard/missed-calls` | Missed call list + auto text-back management |

### Knowledge Base

| Route | Description |
|-------|------------|
| `/dashboard/knowledge` | Document list |
| `/dashboard/knowledge/new` | Upload PDF/DOCX or scrape URL |
| `/dashboard/knowledge/[id]` | Edit document / Q&A pairs |

### Compliance

| Route | Description |
|-------|------------|
| `/dashboard/compliance` | DNC lists, audit logs, consent tracking, compliance score |

### Integrations

| Route | Description |
|-------|------------|
| `/dashboard/integrations` | Integration catalog — connect/disconnect |
| `/dashboard/integrations/docs` | Integration documentation |

### Settings

| Route | Description |
|-------|------------|
| `/dashboard/settings` | Settings overview |
| `/dashboard/settings/team` | Team management and invitations |
| `/dashboard/settings/billing` | Subscription, invoices, payment methods |
| `/dashboard/settings/calendar` | Calendar sync configuration |
| `/dashboard/settings/email` | Custom email domains and branding |
| `/dashboard/settings/branding` | Organization colors and logo |
| `/dashboard/settings/api-keys` | REST API key management |

### Interviews

| Route | Description |
|-------|------------|
| `/dashboard/interviews` | Interview campaign list |
| `/dashboard/interviews/new` | Create interview campaign |
| `/dashboard/interviews/[id]` | Interview campaign details |

---

## API Reference

### tRPC (Primary API)

All tRPC procedures are available at `/api/trpc/[procedure]`. The client is fully type-safe via `@trpc/react-query`.

**Available Routers:**

| Router | Key Procedures |
|--------|---------------|
| `agents` | `list`, `create`, `update`, `delete`, `syncToVapi`, `testCall` |
| `campaigns` | `list`, `create`, `update`, `execute`, `pause`, `resume`, `stop` |
| `calls` | `list`, `get`, `analyze`, `getMetrics` |
| `contacts` | `list`, `create`, `import`, `delete`, `checkDNC` |
| `appointments` | `list`, `create`, `update`, `cancel`, `confirm`, `syncToCalendar` |
| `analytics` | `getOverview`, `getTrends`, `getHourlyDistribution`, `getCampaignPerformance` |
| `intelligence` | `getInsights`, `getCompetitorMentions`, `getObjections`, `getCoachingRecommendations` |
| `liveCalls` | `getActiveCalls`, `sendCallControl` |
| `compliance` | `getDNCList`, `addDNCEntry`, `getAuditLogs`, `getConsents`, `checkTwoPartyConsent` |
| `receptionist` | `createDepartment`, `createStaffMember`, `recordMessage`, `syncReceptionistAgents` |
| `phoneNumbers` | `list`, `search`, `buy`, `release`, `updateCNAM`, `listAvailable` |
| `billing` | `getSubscription`, `createCheckout`, `createPortal`, `getInvoices` |
| `knowledge` | `list`, `create`, `upload`, `delete`, `scrapeUrl` |
| `users` | `list`, `invite`, `updateRole`, `remove` |
| `apiKeys` | `list`, `create`, `revoke` |
| `organization` | `getBranding`, `setBranding`, `getSettings` |
| `integrations` | `list`, `connect`, `disconnect`, `deliverWebhook` |
| `interviews` | `create`, `list`, `update`, `analyze` |

### REST API (v1)

Authenticate with `Authorization: Bearer YOUR_API_KEY` header.

API keys are managed at `/dashboard/settings/api-keys` and are SHA-256 hashed before storage.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/calls` | List calls |
| `POST` | `/api/v1/calls` | Create a call |
| `GET` | `/api/v1/campaigns` | List campaigns |
| `POST` | `/api/v1/campaigns` | Create a campaign |
| `GET` | `/api/v1/appointments` | List appointments |
| `POST` | `/api/v1/appointments` | Book an appointment |
| `GET` | `/api/v1/appointments/available-slots` | Get available time slots |
| `GET` | `/api/v1/agents` | List agents |
| `POST` | `/api/v1/agents` | Create an agent |

---

## Webhooks

### Inbound Webhooks (from providers)

| Provider | Endpoint | Purpose |
|---------|---------|---------|
| **Vapi** | `POST /api/webhooks/vapi` | Call events (started, ended, transcript, tool calls) |
| **Stripe** | `POST /api/webhooks/stripe` | Subscription and payment events |
| **Clerk** | `POST /api/webhooks/clerk` | User and organization sync |
| **Twilio SMS** | `POST /api/webhooks/twilio/sms` | Inbound SMS messages (two-way SMS) |
| **Resend** | `POST /api/webhooks/email` | Inbound email processing |

### Outbound Webhooks (customer-defined)

Organizations can register their own webhook endpoints at `/dashboard/integrations`. All outbound webhooks are:
- Signed with HMAC-SHA256 using the endpoint's signing secret
- Retried on failure
- Logged with full delivery history in the dashboard

---

## Cron Jobs

These endpoints are called on a schedule. All require `Authorization: Bearer CRON_SECRET`.

| Endpoint | Frequency | Purpose |
|---------|-----------|---------|
| `POST /api/cron/campaign-executor` | Every 1–5 min | Execute scheduled campaigns, batch dial contacts |
| `POST /api/cron/call-analysis` | Hourly | Run OpenAI analysis on completed calls |
| `POST /api/cron/appointment-reminders` | Daily | Send appointment reminders (email/SMS/voice) |
| `POST /api/cron/reminders` | Configurable | Multi-channel reminder dispatch |
| `POST /api/cron/daily-reports` | Daily | Generate and send daily summary reports |
| `POST /api/cron/cleanup` | Daily | Clean stale data and expired tokens |

### Vercel Cron Configuration

Add a `vercel.json` to your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/campaign-executor",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/call-analysis",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/appointment-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/daily-reports",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

> Vercel Cron automatically sends the `Authorization: Bearer` header when you set `CRON_SECRET` in Vercel environment variables.

---

## Integrations

### Google Calendar / Sheets

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-domain.com/api/integrations/callback?provider=google`
4. Enable **Google Calendar API** and **Google Sheets API**
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### Microsoft Outlook Calendar

1. Go to [Azure Portal](https://portal.azure.com) → App registrations
2. Create a new app registration
3. Add redirect URI: `https://your-domain.com/api/integrations/callback?provider=microsoft`
4. Grant permissions: `Calendars.ReadWrite`, `offline_access`
5. Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` in `.env`

### GoHighLevel (GHL), HubSpot, Salesforce

Connect via OAuth through `/dashboard/integrations`. Requires the respective OAuth app credentials configured in your integration service environment variables.

---

## Billing Plans

| Plan | Description |
|------|-------------|
| **Free Trial** | Limited agents, calls, and campaigns to evaluate the platform |
| **Starter** | Core voice agent and campaign features |
| **Professional** | Integrations (GHL, Google, Zapier) + more agents/minutes |
| **Business** | High-volume + all integrations + priority support |

Plan limits are enforced in middleware via `src/lib/plan-features.ts`.

> **Dev bypass:** Set `BYPASS_PLAN_CHECK=true` in `.env` to skip all plan enforcement during development.

---

## Deployment

### Deploy to Vercel (Recommended)

1. **Import** your repository to [Vercel](https://vercel.com)
2. **Set all environment variables** in the Vercel dashboard (copy from `.env`)
3. **Add** `vercel.json` with cron config (see [Cron Jobs](#cron-jobs))
4. The build command `prisma generate && next build` is already set in `package.json`
5. **Deploy**

### Production Database Migrations

Run migrations against your production database using the direct URL (bypasses PgBouncer):

```bash
DATABASE_URL="your-direct-postgres-url" npx prisma migrate deploy
```

### Post-Deployment Checklist

- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] `NODE_ENV=production`
- [ ] `BYPASS_PLAN_CHECK=false`
- [ ] Webhook URLs updated in Clerk, Stripe, Vapi, Twilio, and Resend dashboards
- [ ] `prisma migrate deploy` run against production database
- [ ] Vercel cron jobs configured in `vercel.json`
- [ ] Custom domain configured in Vercel with DNS updated
- [ ] Cloudflare R2 bucket CORS policy allows your domain
- [ ] Stripe webhook events verified as flowing

---

## Project Structure

```
Voxforge-ai/
├── prisma/
│   ├── schema.prisma          # Database schema (27 models)
│   └── seed.ts                # Database seed script
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── (marketing)/       # Public marketing/landing pages
│   │   ├── dashboard/         # Protected dashboard (44 pages)
│   │   └── api/
│   │       ├── trpc/          # tRPC Next.js handler
│   │       ├── v1/            # REST API endpoints
│   │       ├── webhooks/      # Inbound webhooks (Vapi, Stripe, Clerk, Twilio, Resend)
│   │       ├── cron/          # Scheduled job endpoints
│   │       ├── upload/        # File upload endpoints (knowledge docs, branding)
│   │       └── integrations/  # OAuth callback handler
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── layout/            # Header, sidebar, footer
│   │   ├── agents/            # Agent management UI
│   │   ├── campaigns/         # Campaign UI
│   │   ├── calls/             # Call list and detail UI
│   │   ├── live/              # Real-time monitoring UI
│   │   ├── intelligence/      # Conversation intelligence UI
│   │   ├── analytics/         # Charts and reports UI
│   │   ├── leads/             # Lead scoring UI
│   │   ├── compliance/        # Compliance dashboard UI
│   │   ├── receptionist/      # Receptionist UI
│   │   ├── knowledge/         # Knowledge base UI
│   │   ├── contacts/          # Contact management UI
│   │   ├── appointments/      # Appointment UI
│   │   ├── settings/          # Settings UI
│   │   ├── auth/              # Auth layout and guards
│   │   ├── marketing/         # Landing page components
│   │   ├── dashboard/         # Dashboard-specific widgets
│   │   └── shared/            # Reusable shared components
│   ├── server/
│   │   ├── routers/           # 18 tRPC routers
│   │   ├── services/          # 11 business logic services
│   │   └── trpc/              # tRPC init, context, middleware
│   ├── lib/
│   │   ├── vapi.ts            # Vapi.ai API client
│   │   ├── vapi-tools.ts      # Vapi tool/function builders
│   │   ├── twilio.ts          # Twilio SDK client
│   │   ├── stripe.ts          # Stripe client
│   │   ├── openai.ts          # OpenAI client
│   │   ├── email.ts           # Resend email client
│   │   ├── sms.ts             # Twilio SMS helpers
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── redis.ts           # Upstash Redis client
│   │   ├── storage.ts         # Cloudflare R2 / S3 client
│   │   ├── logger.ts          # Structured logger (use instead of console.log)
│   │   ├── timezone.ts        # Dynamic per-org timezone helper
│   │   ├── plan-features.ts   # Plan gating logic
│   │   ├── api-keys.ts        # API key generation & SHA-256 validation
│   │   ├── api-middleware.ts  # REST API auth middleware
│   │   ├── business-hours.ts  # Business hours validation
│   │   └── utils.ts           # Shared utility functions
│   └── constants/             # App-wide constants
├── Saas-logic/                # Product planning documents
├── .env                       # Environment variables (never commit this)
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and npm scripts
```

### Key Database Models

| Model | Description |
|-------|------------|
| `Organization` | Multi-tenant workspace — holds plan, Stripe, and Twilio data |
| `User` | Team members linked to Clerk auth with roles |
| `Agent` | Voice agents with Vapi config, LLM settings, voice selection |
| `PhoneNumber` | Purchased numbers with CNAM, provider, and cost tracking |
| `Campaign` | Outbound dialing campaigns with scheduling and rate limits |
| `Contact` | Leads with phone, email, DNC status, and custom fields |
| `Call` | Call history with transcript, recording, sentiment, lead score |
| `KnowledgeDocument` | PDF/DOCX/URL documents for agent knowledge base |
| `Appointment` | Bookings with reminders, calendar sync, and self-service tokens |
| `CalendarSettings` | Google/Outlook OAuth tokens and availability windows |
| `DNCEntry` | Do-not-call entries (national/internal/verbal request) |
| `Consent` | Consent records with type, expiration, and state |
| `AuditLog` | Immutable audit trail of all platform actions |
| `CnamProfile` | Business profile for Twilio Trust Hub CNAM registration |
| `Department` | Receptionist department directory entries |
| `StaffMember` | Staff with availability schedules and contact info |
| `ReceptionistMessage` | Messages taken by the AI receptionist |
| `Integration` | OAuth connections to third-party CRMs and tools |
| `WebhookEndpoint` | Customer-registered outbound webhook URLs |
| `WebhookLog` | Delivery attempt logs for outbound webhooks |
| `ApiKey` | REST API keys stored as SHA-256 hashes |
| `MissedCall` | Missed inbound calls with auto text-back status |

---

## Development Notes

- **Logger:** Use `src/lib/logger.ts` for all server-side logging — do not use `console.log` directly
- **Timezone:** Use `src/lib/timezone.ts` for dynamic per-organization timezone handling
- **Plan gating:** Reference `src/lib/plan-features.ts` before adding feature-gated functionality
- **tRPC patterns:** All protected procedures use `protectedProcedure` from the tRPC context; inputs are validated with Zod schemas
- **No test suite** exists currently — testing is manual via the dashboard or REST client (Postman/curl)
- **File references** use Cloudflare R2 presigned URLs stored in the database

---

*Built with Next.js 14 · Vapi.ai · Twilio · Stripe · Clerk · Prisma · PostgreSQL*
