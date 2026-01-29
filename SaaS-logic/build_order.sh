# Build Order - Prioritized Development Sequence

## How to Use This Document

Work through each phase in order. Complete each step before moving to the next. Each step includes:
- **What to build**
- **Why it's this priority**
- **Acceptance criteria**
- **Estimated time**

---

## PHASE 1: Foundation (Must Complete First)

### Step 1.1: Project Scaffolding
**Priority: CRITICAL | Time: 2-3 hours**

**What to build:**
```bash
# Initialize project
npx create-next-app@latest voxforge-ai --typescript --tailwind --eslint --app --src-dir
cd voxforge-ai

# Install core dependencies
pnpm add @clerk/nextjs @trpc/server @trpc/client @trpc/react-query @trpc/next
pnpm add @prisma/client @tanstack/react-query zod
pnpm add -D prisma

# Install UI
pnpm add class-variance-authority clsx tailwind-merge lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label form dialog table toast tabs select dropdown-menu avatar badge separator sheet skeleton

# Initialize Prisma
npx prisma init
```

**Why first:** Nothing else works without the foundation. This is your development environment.

**Acceptance criteria:**
- [ ] `pnpm dev` runs without errors
- [ ] TypeScript strict mode enabled
- [ ] Tailwind working
- [ ] shadcn/ui components available
- [ ] Prisma schema file exists

---

### Step 1.2: Database Schema & Prisma Setup
**Priority: CRITICAL | Time: 2-3 hours**

**What to build:**
1. Complete Prisma schema (copy from CLAUDE.md)
2. Connect to Supabase PostgreSQL
3. Run initial migration

```bash
# After setting DATABASE_URL in .env
npx prisma db push
npx prisma generate
```

**Why second:** Database is the backbone. Every feature depends on data models.

**Acceptance criteria:**
- [ ] All models from CLAUDE.md in schema
- [ ] `prisma db push` succeeds
- [ ] Can open Prisma Studio (`npx prisma studio`)
- [ ] `lib/db.ts` exports singleton Prisma client

---

### Step 1.3: Authentication (Clerk)
**Priority: CRITICAL | Time: 3-4 hours**

**What to build:**
1. Clerk provider in root layout
2. Sign-in and sign-up pages
3. Middleware for protected routes
4. Clerk webhook to create Organization/User on signup

```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/', '/pricing', '/api/webhooks/(.*)'],
});

// app/api/webhooks/clerk/route.ts
// On user.created: Create Organization + User in database
```

**Why third:** Can't build any protected features without auth. Multi-tenancy depends on this.

**Acceptance criteria:**
- [ ] Can sign up new account
- [ ] Can sign in/out
- [ ] Dashboard routes protected
- [ ] New signup creates Organization + User in DB
- [ ] `ctx.orgId` available in tRPC context

---

### Step 1.4: tRPC Setup
**Priority: CRITICAL | Time: 2-3 hours**

**What to build:**
1. tRPC initialization with context
2. Protected procedure middleware
3. App router with basic health check
4. React Query provider

```typescript
// server/trpc/index.ts
// server/trpc/context.ts - Include orgId, userId from Clerk
// server/trpc/middleware.ts - requireAuth, requirePermission
// server/routers/_app.ts - Root router
// app/api/trpc/[trpc]/route.ts - API endpoint
// lib/trpc.ts - Client setup
```

**Why fourth:** All dashboard features use tRPC. Need this before any feature development.

**Acceptance criteria:**
- [ ] tRPC endpoint responds at `/api/trpc`
- [ ] Context includes `orgId` and `userId`
- [ ] Protected procedures reject unauthenticated requests
- [ ] Can call tRPC from React components

---

### Step 1.5: Dashboard Layout Shell
**Priority: HIGH | Time: 3-4 hours**

**What to build:**
1. Dashboard layout with sidebar
2. Header with user menu
3. Basic navigation structure
4. Empty pages for all main sections

```
(dashboard)/
├── layout.tsx      # Sidebar + header
├── page.tsx        # Dashboard home (empty for now)
├── agents/page.tsx
├── campaigns/page.tsx
├── calls/page.tsx
├── analytics/page.tsx
├── settings/page.tsx
```

**Why fifth:** Developers need to see where they're building. Visual structure helps planning.

**Acceptance criteria:**
- [ ] Sidebar with navigation links
- [ ] Header with org name + user avatar
- [ ] All main pages accessible (even if empty)
- [ ] Mobile responsive (collapsible sidebar)
- [ ] Active nav item highlighted

---

## PHASE 2: Core Vapi Integration (The Product)

### Step 2.1: Vapi Client & Webhook Handler
**Priority: CRITICAL | Time: 4-5 hours**

**What to build:**
1. Vapi SDK wrapper (`lib/vapi.ts`)
2. Webhook endpoint with signature verification
3. Webhook event handlers (store in DB)

```typescript
// lib/vapi.ts
export const vapi = new Vapi({ apiKey: process.env.VAPI_API_KEY! });

// app/api/webhooks/vapi/route.ts
// Handle: call.started, call.ended, transcript.complete
```

**Why first in Phase 2:** This is the core product. Everything else is UI around Vapi.

**Acceptance criteria:**
- [ ] Can create assistant via Vapi API
- [ ] Webhook receives and logs events
- [ ] Call records created from webhooks
- [ ] Transcripts stored when available

---

### Step 2.2: Agent CRUD (Full Feature)
**Priority: CRITICAL | Time: 6-8 hours**

**What to build:**
1. tRPC router: `agents.list`, `agents.get`, `agents.create`, `agents.update`, `agents.delete`
2. Service layer with Vapi sync
3. Agents list page with data table
4. Agent creation form (name, system prompt, voice, first message)
5. Agent detail/edit page
6. Vapi two-way sync

```typescript
// server/routers/agents.ts
// server/services/agent.service.ts
// components/agents/agent-form.tsx
// components/agents/agent-list.tsx
// app/(dashboard)/agents/page.tsx
// app/(dashboard)/agents/new/page.tsx
// app/(dashboard)/agents/[id]/page.tsx
```

**Why second:** Users need to create agents before anything else works.

**Acceptance criteria:**
- [ ] Can create agent (saved to DB + Vapi)
- [ ] Can edit agent (syncs to Vapi)
- [ ] Can delete agent (removes from Vapi)
- [ ] List shows all org agents
- [ ] Form validates inputs
- [ ] Voice selector with preview

---

### Step 2.3: Phone Number Management
**Priority: CRITICAL | Time: 4-5 hours**

**What to build:**
1. tRPC router for phone numbers
2. Phone number provisioning via Vapi
3. Assign phone number to agent
4. Phone numbers list page

```typescript
// server/routers/phone-numbers.ts
// server/services/phone-number.service.ts
// app/(dashboard)/phone-numbers/page.tsx
```

**Why third:** Can't make or receive calls without phone numbers.

**Acceptance criteria:**
- [ ] Can provision local number
- [ ] Can provision toll-free number
- [ ] Can assign number to agent
- [ ] Can unassign number
- [ ] List shows all org numbers

---

### Step 2.4: Test Call Feature
**Priority: CRITICAL | Time: 3-4 hours**

**What to build:**
1. "Test Call" button on agent detail page
2. Input for test phone number
3. Initiate outbound call via Vapi
4. Show call status in real-time

**Why fourth:** Users MUST test their agent before trusting it. This is the "aha moment".

**Acceptance criteria:**
- [ ] Can enter phone number to call
- [ ] Call initiated to that number
- [ ] Agent speaks using configured prompt
- [ ] Call status shown (connecting, in-progress, ended)
- [ ] Can view transcript after call

---

### Step 2.5: Call Logs & Detail View
**Priority: HIGH | Time: 5-6 hours**

**What to build:**
1. tRPC router for calls
2. Calls list page with filters
3. Call detail page (transcript, audio, metadata)
4. Audio player for recordings

```typescript
// server/routers/calls.ts
// app/(dashboard)/calls/page.tsx
// app/(dashboard)/calls/[id]/page.tsx
// components/calls/transcript-viewer.tsx
// components/calls/audio-player.tsx
```

**Why fifth:** Users need visibility into what their agents are doing.

**Acceptance criteria:**
- [ ] List all calls with pagination
- [ ] Filter by agent, date, status
- [ ] Detail view shows full transcript
- [ ] Can play recording if available
- [ ] Shows call duration, sentiment (if analyzed)

---

## PHASE 3: Campaign & Outbound Calling

### Step 3.1: Contact Management
**Priority: HIGH | Time: 4-5 hours**

**What to build:**
1. Contact model and tRPC router
2. CSV upload and parsing
3. Contact list view
4. DNC checking integration

```typescript
// server/routers/contacts.ts
// components/campaigns/contact-upload.tsx
```

**Why first in Phase 3:** Can't run campaigns without contacts.

**Acceptance criteria:**
- [ ] Can upload CSV with contacts
- [ ] Validates phone numbers
- [ ] Stores with custom fields
- [ ] Skips DNC numbers with warning

---

### Step 3.2: Campaign Management
**Priority: HIGH | Time: 6-8 hours**

**What to build:**
1. Campaign CRUD
2. Campaign creation wizard
3. Schedule configuration (time zone aware)
4. Campaign status management

```typescript
// server/routers/campaigns.ts
// server/services/campaign.service.ts
// app/(dashboard)/campaigns/page.tsx
// app/(dashboard)/campaigns/new/page.tsx
// app/(dashboard)/campaigns/[id]/page.tsx
```

**Why second:** Core outbound calling feature.

**Acceptance criteria:**
- [ ] Can create campaign with agent + contacts
- [ ] Can set calling schedule
- [ ] Can set calling hours (respects local time)
- [ ] Campaign shows status and stats

---

### Step 3.3: Campaign Execution Engine
**Priority: HIGH | Time: 6-8 hours**

**What to build:**
1. Trigger.dev job for campaign execution
2. Rate-limited call processing
3. Status updates and retry logic
4. Campaign pause/resume

```typescript
// trigger/jobs/campaign-execute.ts
```

**Why third:** Makes campaigns actually work.

**Acceptance criteria:**
- [ ] Starting campaign queues calls
- [ ] Calls made at configured rate
- [ ] Respects time zone and calling hours
- [ ] Can pause and resume
- [ ] Failed calls retry with backoff

---

## PHASE 4: Billing & Limits

### Step 4.1: Stripe Integration
**Priority: HIGH | Time: 5-6 hours**

**What to build:**
1. Stripe client setup
2. Webhook handler
3. Customer creation on org signup
4. Subscription management

```typescript
// lib/stripe.ts
// app/api/webhooks/stripe/route.ts
// server/services/billing.service.ts
```

**Why first in Phase 4:** Need to charge customers to be a business.

**Acceptance criteria:**
- [ ] Stripe customer created on signup
- [ ] Webhook handles subscription events
- [ ] Can retrieve subscription status

---

### Step 4.2: Plan Limits Enforcement
**Priority: HIGH | Time: 4-5 hours**

**What to build:**
1. Usage tracking (minutes, agents, campaigns)
2. Limit checking middleware
3. Usage display in dashboard
4. Upgrade prompts when hitting limits

```typescript
// server/services/billing.service.ts - checkLimit(), getUsage()
// components/settings/usage-display.tsx
```

**Why second:** Prevent abuse, encourage upgrades.

**Acceptance criteria:**
- [ ] Can't create agent over limit
- [ ] Can't start campaign over limit
- [ ] Usage visible in settings
- [ ] Clear upgrade CTA when at limit

---

### Step 4.3: Billing Portal & Checkout
**Priority: HIGH | Time: 4-5 hours**

**What to build:**
1. Pricing page with plan comparison
2. Stripe Checkout integration
3. Stripe Customer Portal link
4. Plan change handling

```typescript
// app/(dashboard)/settings/billing/page.tsx
// server/routers/billing.ts
```

**Why third:** Let customers self-serve billing.

**Acceptance criteria:**
- [ ] Can view current plan
- [ ] Can upgrade via Checkout
- [ ] Can access Stripe portal for invoices
- [ ] Plan changes reflected immediately

---

## PHASE 5: Analytics & Intelligence

### Step 5.1: Basic Analytics Dashboard
**Priority: MEDIUM | Time: 4-5 hours**

**What to build:**
1. Dashboard stats cards (total calls, minutes, etc.)
2. Call volume chart
3. Agent performance comparison
4. Date range selector

```typescript
// server/routers/analytics.ts
// app/(dashboard)/analytics/page.tsx
// components/analytics/stats-cards.tsx
// components/analytics/call-chart.tsx
```

**Why first in Phase 5:** Users want to see ROI. Numbers build confidence.

**Acceptance criteria:**
- [ ] Shows key metrics on dashboard
- [ ] Charts render correctly
- [ ] Date filtering works
- [ ] Data updates near real-time

---

### Step 5.2: Conversation Intelligence
**Priority: MEDIUM | Time: 6-8 hours**

**What to build:**
1. Post-call AI analysis (GPT-4)
2. Sentiment scoring
3. Summary generation
4. Key topics extraction
5. Trigger.dev job for async processing

```typescript
// trigger/jobs/call-analyze.ts
// lib/openai.ts - analyzeTranscript()
```

**Why second:** Differentiation. Most competitors don't do this well.

**Acceptance criteria:**
- [ ] Every completed call gets analyzed
- [ ] Sentiment score assigned
- [ ] Summary generated
- [ ] Key points extracted
- [ ] Visible on call detail page

---

## PHASE 6: Polish & Launch Prep

### Step 6.1: Knowledge Base
**Priority: MEDIUM | Time: 5-6 hours**

**What to build:**
1. Document upload (PDF, DOCX)
2. URL scraping
3. Manual Q&A editor
4. Link documents to agents

```typescript
// server/routers/knowledge.ts
// components/knowledge/document-upload.tsx
// components/knowledge/qa-editor.tsx
```

**Acceptance criteria:**
- [ ] Can upload documents
- [ ] Can add URL to scrape
- [ ] Can add manual Q&A
- [ ] Agent can access knowledge in calls

---

### Step 6.2: Settings & Team Management
**Priority: MEDIUM | Time: 4-5 hours**

**What to build:**
1. Organization settings page
2. Team member invitation
3. Role management
4. API keys management

```typescript
// app/(dashboard)/settings/page.tsx
// app/(dashboard)/settings/team/page.tsx
// app/(dashboard)/settings/api-keys/page.tsx
```

**Acceptance criteria:**
- [ ] Can update org name/settings
- [ ] Can invite team members
- [ ] Can change member roles
- [ ] Can generate/revoke API keys

---

### Step 6.3: Onboarding Flow
**Priority: MEDIUM | Time: 4-5 hours**

**What to build:**
1. Multi-step onboarding wizard
2. Progress tracking
3. First agent creation guide
4. First test call prompt

```typescript
// app/(dashboard)/onboarding/page.tsx
// stores/onboarding-store.ts
```

**Acceptance criteria:**
- [ ] New users see onboarding
- [ ] Can complete step by step
- [ ] Creates first agent
- [ ] Makes first test call
- [ ] Marks onboarding complete

---

### Step 6.4: Marketing Site
**Priority: MEDIUM | Time: 4-5 hours**

**What to build:**
1. Landing page (hero, features, testimonials)
2. Pricing page
3. Basic SEO setup

```typescript
// app/(marketing)/page.tsx
// app/(marketing)/pricing/page.tsx
```

**Acceptance criteria:**
- [ ] Professional landing page
- [ ] Clear pricing display
- [ ] CTA to sign up
- [ ] Mobile responsive

---

## PHASE 7: Enterprise Features (Post-Launch)

### Step 7.1: White-Label Support
**Priority: LOW | Time: 8-10 hours**

Custom domains, branding, sub-accounts.

### Step 7.2: SSO Integration  
**Priority: LOW | Time: 6-8 hours**

SAML/OIDC support for enterprise.

### Step 7.3: Advanced Integrations
**Priority: LOW | Time: 8-10 hours**

HubSpot, Salesforce, Zapier.

---

## Summary: Build Order Checklist

### Week 1-2: Foundation
- [ ] 1.1 Project scaffolding
- [ ] 1.2 Database schema
- [ ] 1.3 Authentication
- [ ] 1.4 tRPC setup
- [ ] 1.5 Dashboard layout

### Week 3-4: Core Product
- [ ] 2.1 Vapi integration
- [ ] 2.2 Agent CRUD
- [ ] 2.3 Phone numbers
- [ ] 2.4 Test call
- [ ] 2.5 Call logs

### Week 5-6: Campaigns
- [ ] 3.1 Contacts
- [ ] 3.2 Campaign management
- [ ] 3.3 Campaign execution

### Week 7-8: Billing
- [ ] 4.1 Stripe integration
- [ ] 4.2 Plan limits
- [ ] 4.3 Billing portal

### Week 9-10: Polish
- [ ] 5.1 Analytics
- [ ] 5.2 Conversation intelligence
- [ ] 6.1 Knowledge base
- [ ] 6.2 Settings
- [ ] 6.3 Onboarding
- [ ] 6.4 Marketing site

### Post-Launch
- [ ] 7.x Enterprise features

--- 

## Why This Order?

1. **Foundation first** - Can't build features without infrastructure
2. **Vapi early** - This IS the product; everything else is wrapper
3. **Agent before campaigns** - Users need agents to use campaigns
4. **Billing before scale** - Don't give away free usage
5. **Analytics after core** - Need data before you can analyze it
6. **Polish last** - Don't optimize what might change

This order ensures you always have a **working product** at each phase, just with fewer features. You could launch after Phase 2 as a simple "AI phone agent" tool.
