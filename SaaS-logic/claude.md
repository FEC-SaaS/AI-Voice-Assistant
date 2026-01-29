# CLAUDE.md - Project Context for Claude Code

## Project Overview

**VoxForge AI** - A white-label B2B SaaS platform for AI voice agents. Enables US businesses to deploy AI-powered cold calling, receptionist, and customer engagement solutions using Vapi.ai infrastructure.

## Business Context

- **Target Market**: US SMBs (real estate, insurance, home services, healthcare)
- **Pricing**: $99-599/month tiers + usage overage at $0.15/min
- **Differentiators**: Superior UX, compliance-first, white-label ready, conversation intelligence
- **Revenue Target**: 100 customers, $35K MRR by end of Year 1

## Tech Stack (MUST USE)

```
Frontend:     Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
API:          tRPC for internal, REST for external/webhooks
Backend:      Node.js, Prisma ORM
Database:     PostgreSQL (Supabase)
Cache:        Redis (Upstash)
Auth:         Clerk (with organizations for multi-tenancy)
Payments:     Stripe (subscriptions + metered billing)
Voice AI:     Vapi.ai API
Email:        Resend
Storage:      Cloudflare R2
Jobs:         Trigger.dev
Monitoring:   Sentry, PostHog
Hosting:      Vercel
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── agents/        # Agent management
│   │   ├── campaigns/     # Campaign management
│   │   ├── calls/         # Call logs & details
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── knowledge/     # Knowledge base
│   │   ├── phone-numbers/ # Phone number management
│   │   ├── settings/      # Settings, billing, team
│   │   └── onboarding/    # New user onboarding
│   ├── (marketing)/       # Public pages (landing, pricing)
│   └── api/               # API routes
│       ├── trpc/          # tRPC endpoint
│       ├── v1/            # REST API
│       └── webhooks/      # Vapi, Stripe, Clerk webhooks
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Sidebar, header, footer
│   └── [feature]/         # Feature-specific components
├── server/
│   ├── trpc/              # tRPC setup & middleware
│   ├── routers/           # tRPC routers
│   └── services/          # Business logic services
├── lib/                   # Utility libraries (db, vapi, stripe, etc.)
├── hooks/                 # React hooks
├── stores/                # Zustand stores
├── types/                 # TypeScript types
├── schemas/               # Zod validation schemas
└── constants/             # App constants (plans, voices, etc.)
```

## Database Schema (Core Models)

```prisma
model Organization {
  id                  String   @id @default(cuid())
  name                String
  slug                String   @unique
  stripeCustomerId    String?
  stripeSubscriptionId String?
  planId              String   @default("free-trial")
  onboardingComplete  Boolean  @default(false)
  settings            Json     @default("{}")
  createdAt           DateTime @default(now())
  
  users               User[]
  agents              Agent[]
  campaigns           Campaign[]
  calls               Call[]
  phoneNumbers        PhoneNumber[]
  knowledgeDocs       KnowledgeDocument[]
}

model User {
  id              String   @id @default(cuid())
  clerkId         String   @unique
  email           String
  name            String?
  role            String   @default("member") // owner, admin, manager, member, viewer
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  createdAt       DateTime @default(now())
}

model Agent {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  vapiAssistantId String?
  name            String
  description     String?
  systemPrompt    String   @db.Text
  firstMessage    String?
  voiceProvider   String   @default("elevenlabs")
  voiceId         String   @default("rachel")
  language        String   @default("en-US")
  modelProvider   String   @default("openai")
  model           String   @default("gpt-4-turbo")
  isActive        Boolean  @default(true)
  settings        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  calls           Call[]
  campaigns       Campaign[]
  phoneNumbers    PhoneNumber[]
}

model PhoneNumber {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  vapiPhoneId     String?
  number          String
  type            String   @default("local") // local, toll_free
  agentId         String?
  agent           Agent?   @relation(fields: [agentId], references: [id])
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}

model Campaign {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  agentId         String
  agent           Agent    @relation(fields: [agentId], references: [id])
  name            String
  status          String   @default("draft") // draft, scheduled, running, paused, completed
  scheduleStart   DateTime?
  scheduleEnd     DateTime?
  timeZone        String   @default("America/New_York")
  callingHours    Json     @default("{\"start\": \"09:00\", \"end\": \"17:00\"}")
  settings        Json     @default("{}")
  stats           Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  contacts        Contact[]
  calls           Call[]
}

model Contact {
  id              String   @id @default(cuid())
  organizationId  String
  campaignId      String?
  campaign        Campaign? @relation(fields: [campaignId], references: [id])
  phoneNumber     String
  firstName       String?
  lastName        String?
  email           String?
  company         String?
  customData      Json     @default("{}")
  status          String   @default("pending") // pending, called, completed, failed, dnc
  lastCalledAt    DateTime?
  callAttempts    Int      @default(0)
  createdAt       DateTime @default(now())
}

model Call {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  agentId         String?
  agent           Agent?   @relation(fields: [agentId], references: [id])
  campaignId      String?
  campaign        Campaign? @relation(fields: [campaignId], references: [id])
  contactId       String?
  vapiCallId      String?  @unique
  direction       String   // inbound, outbound
  status          String?  // queued, ringing, in-progress, completed, failed, no-answer
  fromNumber      String?
  toNumber        String?
  startedAt       DateTime?
  endedAt         DateTime?
  durationSeconds Int?
  recordingUrl    String?
  transcript      String?  @db.Text
  summary         String?  @db.Text
  sentiment       String?  // positive, neutral, negative
  leadScore       Int?
  analysis        Json     @default("{}")
  costCents       Int      @default(0)
  createdAt       DateTime @default(now())
}

model KnowledgeDocument {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  agentId         String?
  name            String
  type            String   // pdf, docx, url, manual
  sourceUrl       String?
  content         String?  @db.Text
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
}

model DNCEntry {
  id              String   @id @default(cuid())
  organizationId  String
  phoneNumber     String
  source          String   // national, internal, verbal_request
  reason          String?
  addedAt         DateTime @default(now())
  
  @@unique([organizationId, phoneNumber])
}

model Consent {
  id              String   @id @default(cuid())
  organizationId  String
  contactPhone    String
  consentType     String   // PEWC, EXPRESS, EBR
  consentMethod   String   // web_form, verbal, paper
  consentText     String   @db.Text
  ipAddress       String?
  timestamp       DateTime @default(now())
  expiresAt       DateTime?
  revokedAt       DateTime?
}
```

## Key Vapi.ai Integration Patterns

```typescript
// lib/vapi.ts - Vapi client setup
import Vapi from '@vapi-ai/server-sdk';

export const vapi = new Vapi({ apiKey: process.env.VAPI_API_KEY! });

// Create assistant (maps to our Agent)
export async function createVapiAssistant(agent: AgentInput) {
  return vapi.assistants.create({
    name: agent.name,
    model: {
      provider: agent.modelProvider,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
    },
    voice: {
      provider: agent.voiceProvider,
      voiceId: agent.voiceId,
    },
    firstMessage: agent.firstMessage,
  });
}

// Make outbound call
export async function makeOutboundCall(
  assistantId: string,
  phoneNumberId: string,
  customerNumber: string
) {
  return vapi.calls.create({
    assistantId,
    phoneNumberId,
    customer: { number: customerNumber },
  });
}
```

## Webhook Handling (Critical)

```typescript
// app/api/webhooks/vapi/route.ts
// Handle: call.started, call.ended, transcript.complete, function.called

// app/api/webhooks/stripe/route.ts  
// Handle: customer.subscription.*, invoice.payment_*

// app/api/webhooks/clerk/route.ts
// Handle: user.created, user.deleted, organization.*
```

## Plan Limits (Enforce These)

```typescript
export const PLANS = {
  'free-trial': { agents: 1, minutesPerMonth: 100, phoneNumbers: 1, campaigns: 1 },
  'starter':    { agents: 1, minutesPerMonth: 500, phoneNumbers: 1, campaigns: 5 },
  'professional': { agents: 3, minutesPerMonth: 2000, phoneNumbers: 3, campaigns: 20 },
  'business':   { agents: 10, minutesPerMonth: 5000, phoneNumbers: 10, campaigns: -1 },
  'enterprise': { agents: -1, minutesPerMonth: -1, phoneNumbers: -1, campaigns: -1 },
};
```

## Coding Standards

1. **TypeScript**: Strict mode, no `any`, proper error handling
2. **Components**: Functional components, use shadcn/ui, Tailwind for styling
3. **API**: tRPC for dashboard, REST only for external integrations
4. **Services**: Business logic in `server/services/`, keep routers thin
5. **Validation**: Zod schemas for all inputs
6. **Error Handling**: Custom error classes, proper HTTP status codes
7. **Testing**: Vitest for unit tests, Playwright for E2E

## Multi-Tenancy Pattern

Every query MUST be scoped to `organizationId`:
```typescript
// ALWAYS do this
const agents = await prisma.agent.findMany({
  where: { organizationId: ctx.orgId },
});

// NEVER do this (security vulnerability)
const agents = await prisma.agent.findMany();
```

## Compliance Requirements (CRITICAL)

1. **AI Disclosure**: Every call MUST start with AI disclosure
2. **DNC Handling**: Scrub contacts against DNC before calling
3. **Time Restrictions**: No calls before 8am or after 9pm LOCAL time
4. **Opt-Out**: Honor verbal opt-outs immediately
5. **Recording Consent**: Two-party consent states need explicit disclosure

## Documentation References

Full documentation is in `/docs/`:
- `01-MARKET_ANALYSIS.md` - Market research and competition
- `02-BUSINESS_PLAN.md` - Pricing, revenue model, GTM
- `03-FEATURES.md` - Complete feature specifications
- `04-TECH_STACK.md` - Technology choices with code examples
- `05-ARCHITECTURE.md` - System design and data flows
- `06-PROJECT_STRUCTURE.md` - Codebase organization
- `07-DEVELOPMENT_GUIDELINES.md` - Coding standards
- `08-SAAS_LOGIC.md` - Multi-tenancy, billing, RBAC
- `09-ROADMAP.md` - Development timeline
- `10-COMPLIANCE.md` - TCPA, DNC, legal requirements

## Current Build Phase

See `BUILD_ORDER.md` for the prioritized development sequence.

## Environment Variables Required

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...

# Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Vapi.ai
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI (for conversation intelligence)
OPENAI_API_KEY=

# Storage (R2)
R2_ENDPOINT=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=

# Email (Resend)
RESEND_API_KEY=
```

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema (dev only)
pnpm db:studio    # Open Prisma Studio
pnpm lint         # Run ESLint
pnpm test         # Run tests
```