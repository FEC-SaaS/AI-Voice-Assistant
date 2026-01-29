# System Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Web App     │  │ Mobile PWA  │  │ API Clients │  │ Webhooks    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EDGE LAYER (Cloudflare)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  CDN + DDoS Protection + SSL Termination + Rate Limiting           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER (Vercel)                           │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │   Next.js App      │  │   API Routes       │  │   Edge Functions   │    │
│  │   (React SSR)      │  │   (tRPC + REST)    │  │   (Middleware)     │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘    │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │   Webhook Handlers │  │   Cron Jobs        │  │   Background Jobs  │    │
│  │   (Vapi, Stripe)   │  │   (Reports, Sync)  │  │   (Trigger.dev)    │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   DATA LAYER     │    │   CACHE LAYER    │    │   FILE STORAGE   │
│   (PostgreSQL)   │    │   (Redis)        │    │   (R2)           │
│   - Supabase     │    │   - Upstash      │    │   - Cloudflare   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Vapi.ai │  │ Stripe  │  │ Clerk   │  │ OpenAI  │  │ Resend  │           │
│  │ Voice   │  │ Billing │  │ Auth    │  │ AI      │  │ Email   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Outbound Call Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│  Web    │────▶│  API    │────▶│  Job    │────▶│  Vapi   │
│Dashboard│     │  App    │     │  Layer  │     │  Queue  │     │  API    │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                                     │
                                                                     ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│Analytics│◀────│Processor│◀────│ Webhook │◀────│  Call   │◀────│  Phone  │
│  DB     │     │  Job    │     │ Handler │     │  Event  │     │  Call   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘

Detailed Steps:
1. User uploads contacts and starts campaign
2. API validates and queues call jobs
3. Trigger.dev processes jobs with rate limiting
4. Vapi API initiates outbound calls
5. Vapi sends real-time webhooks (call events)
6. Webhook handler logs call progress
7. On call end, processor job runs
8. AI analyzes transcript, updates analytics
```

### Inbound Call Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│Customer │────▶│  Phone  │────▶│ Vapi    │────▶│Assistant│
│  Calls  │     │  Number │     │Platform │     │  (AI)   │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
                    ┌────────────────────────────────┤
                    │                                │
                    ▼                                ▼
              ┌─────────┐                      ┌─────────┐
              │ Webhook │                      │Knowledge│
              │  Events │                      │  Base   │
              └────┬────┘                      └─────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
     ┌─────────┐┌─────────┐┌─────────┐
     │Call Log ││Calendar ││  CRM    │
     │  Entry  ││ Booking ││ Update  │
     └─────────┘└─────────┘└─────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan_id         UUID REFERENCES plans(id),
    stripe_customer_id VARCHAR(255),
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id        VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    role            VARCHAR(50) DEFAULT 'member',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Agents (AI Assistants)
CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    vapi_assistant_id VARCHAR(255),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    system_prompt   TEXT NOT NULL,
    first_message   TEXT,
    voice_provider  VARCHAR(50) DEFAULT 'elevenlabs',
    voice_id        VARCHAR(255),
    language        VARCHAR(10) DEFAULT 'en-US',
    model_provider  VARCHAR(50) DEFAULT 'openai',
    model           VARCHAR(100) DEFAULT 'gpt-4-turbo',
    settings        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Phone Numbers
CREATE TABLE phone_numbers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    vapi_phone_id   VARCHAR(255),
    number          VARCHAR(20) NOT NULL,
    type            VARCHAR(20) DEFAULT 'local', -- local, toll_free
    agent_id        UUID REFERENCES agents(id),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    agent_id        UUID REFERENCES agents(id) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, running, paused, completed
    type            VARCHAR(50) DEFAULT 'outbound', -- outbound, survey
    schedule_start  TIMESTAMP,
    schedule_end    TIMESTAMP,
    time_zone       VARCHAR(50) DEFAULT 'America/New_York',
    calling_hours   JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
    settings        JSONB DEFAULT '{}',
    stats           JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    campaign_id     UUID REFERENCES campaigns(id),
    phone_number    VARCHAR(20) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    company         VARCHAR(255),
    custom_data     JSONB DEFAULT '{}',
    status          VARCHAR(50) DEFAULT 'pending', -- pending, called, completed, failed, dnc
    last_called_at  TIMESTAMP,
    call_attempts   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Calls
CREATE TABLE calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    agent_id        UUID REFERENCES agents(id),
    campaign_id     UUID REFERENCES campaigns(id),
    contact_id      UUID REFERENCES contacts(id),
    vapi_call_id    VARCHAR(255) UNIQUE,
    direction       VARCHAR(20) NOT NULL, -- inbound, outbound
    status          VARCHAR(50), -- queued, ringing, in-progress, completed, failed, no-answer
    from_number     VARCHAR(20),
    to_number       VARCHAR(20),
    started_at      TIMESTAMP,
    ended_at        TIMESTAMP,
    duration_seconds INTEGER,
    recording_url   TEXT,
    transcript      TEXT,
    summary         TEXT,
    sentiment       VARCHAR(20), -- positive, neutral, negative
    lead_score      INTEGER,
    analysis        JSONB DEFAULT '{}',
    cost_cents      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Knowledge Base Documents
CREATE TABLE knowledge_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    agent_id        UUID REFERENCES agents(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50), -- pdf, docx, url, manual
    source_url      TEXT,
    content         TEXT,
    embeddings      VECTOR(1536), -- for semantic search
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    call_id         UUID REFERENCES calls(id),
    contact_id      UUID REFERENCES contacts(id),
    title           VARCHAR(255),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    calendar_event_id VARCHAR(255),
    status          VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agents_org ON agents(organization_id);
CREATE INDEX idx_calls_org ON calls(organization_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_campaign ON calls(campaign_id);
CREATE INDEX idx_calls_created ON calls(created_at DESC);
CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_campaign ON contacts(campaign_id);
CREATE INDEX idx_contacts_status ON contacts(status);
```

---

## Multi-Tenancy Architecture

### Tenant Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED DATABASE                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              organization_id (FK)                    │   │
│  │                      │                               │   │
│  │    ┌─────────────────┼─────────────────┐            │   │
│  │    ▼                 ▼                 ▼            │   │
│  │ ┌──────┐        ┌──────┐         ┌──────┐          │   │
│  │ │Org A │        │Org B │         │Org C │          │   │
│  │ │data  │        │data  │         │data  │          │   │
│  │ └──────┘        └──────┘         └──────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Row-Level Security (RLS) enforces tenant isolation        │
└─────────────────────────────────────────────────────────────┘
```

### RLS Policies (Supabase/PostgreSQL)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON agents
    USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Function to set current tenant
CREATE OR REPLACE FUNCTION set_current_org(org_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_org_id', org_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;
```

### Application-Level Tenant Context

```typescript
// middleware/tenant.ts
import { prisma } from '@/lib/db';

export function withTenant<T>(
  orgId: string,
  fn: () => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_current_org(${orgId}::UUID)`;
    return fn();
  });
}

// Usage in API routes
export async function GET(req: Request) {
  const { orgId } = await getAuth(req);
  
  return withTenant(orgId, async () => {
    // All queries automatically scoped to tenant
    const agents = await prisma.agent.findMany();
    return Response.json(agents);
  });
}
```

---

## API Architecture

### tRPC Router Structure

```typescript
// server/routers/_app.ts
export const appRouter = router({
  // Agents
  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.agent.findMany({
        where: { organizationId: ctx.orgId },
      });
    }),
    create: protectedProcedure
      .input(createAgentSchema)
      .mutation(async ({ ctx, input }) => {
        // Create in DB
        const agent = await ctx.db.agent.create({
          data: { ...input, organizationId: ctx.orgId },
        });
        
        // Sync to Vapi
        const vapiAssistant = await vapi.assistants.create({
          name: input.name,
          model: { provider: 'openai', model: input.model },
          voice: { provider: input.voiceProvider, voiceId: input.voiceId },
        });
        
        // Update with Vapi ID
        return ctx.db.agent.update({
          where: { id: agent.id },
          data: { vapiAssistantId: vapiAssistant.id },
        });
      }),
  }),
  
  // Campaigns
  campaigns: router({
    list: protectedProcedure.query(/* ... */),
    create: protectedProcedure.input(createCampaignSchema).mutation(/* ... */),
    start: protectedProcedure.input(z.string()).mutation(/* ... */),
    pause: protectedProcedure.input(z.string()).mutation(/* ... */),
  }),
  
  // Calls
  calls: router({
    list: protectedProcedure.input(callsFilterSchema).query(/* ... */),
    get: protectedProcedure.input(z.string()).query(/* ... */),
    analytics: protectedProcedure.input(dateRangeSchema).query(/* ... */),
  }),
  
  // Analytics
  analytics: router({
    dashboard: protectedProcedure.query(/* ... */),
    agentPerformance: protectedProcedure.input(z.string()).query(/* ... */),
    campaignStats: protectedProcedure.input(z.string()).query(/* ... */),
  }),
});
```

### REST Endpoints (for external integrations)

```
POST   /api/v1/agents              Create agent
GET    /api/v1/agents              List agents
GET    /api/v1/agents/:id          Get agent
PATCH  /api/v1/agents/:id          Update agent
DELETE /api/v1/agents/:id          Delete agent

POST   /api/v1/calls               Initiate call
GET    /api/v1/calls               List calls
GET    /api/v1/calls/:id           Get call details
GET    /api/v1/calls/:id/transcript Get transcript

POST   /api/v1/campaigns           Create campaign
GET    /api/v1/campaigns           List campaigns
POST   /api/v1/campaigns/:id/start Start campaign
POST   /api/v1/campaigns/:id/pause Pause campaign

POST   /api/v1/webhooks/vapi       Vapi webhook handler
POST   /api/v1/webhooks/stripe     Stripe webhook handler
```

---

## Webhook Processing

### Vapi Webhook Handler

```typescript
// app/api/webhooks/vapi/route.ts
import { headers } from 'next/headers';
import { verifyVapiSignature } from '@/lib/vapi';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('x-vapi-signature');
  
  // Verify webhook authenticity
  if (!verifyVapiSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  switch (event.type) {
    case 'call.started':
      await handleCallStarted(event.data);
      break;
    case 'call.ended':
      await handleCallEnded(event.data);
      break;
    case 'transcript.complete':
      await handleTranscriptComplete(event.data);
      break;
    case 'function.called':
      return handleFunctionCall(event.data);
    default:
      console.log('Unknown event type:', event.type);
  }
  
  return Response.json({ received: true });
}

async function handleCallEnded(data: VapiCallEndedEvent) {
  const call = await prisma.call.update({
    where: { vapiCallId: data.callId },
    data: {
      status: data.endedReason,
      endedAt: new Date(data.endedAt),
      durationSeconds: data.duration,
      recordingUrl: data.recordingUrl,
    },
  });
  
  // Queue transcript analysis
  await triggerClient.sendEvent({
    name: 'call.analyze',
    payload: { callId: call.id },
  });
}
```

---

## Background Job Architecture

### Job Types

```typescript
// trigger/jobs/index.ts

// 1. Campaign Execution
export const executeCampaignJob = client.defineJob({
  id: 'execute-campaign',
  name: 'Execute Campaign Calls',
  version: '1.0.0',
  trigger: invokeTrigger(),
  run: async (payload: { campaignId: string }, io) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: payload.campaignId },
      include: { contacts: { where: { status: 'pending' } } },
    });
    
    for (const contact of campaign.contacts) {
      // Respect rate limits
      await io.wait('rate-limit', { seconds: 2 });
      
      // Make call via Vapi
      await io.runTask('make-call', async () => {
        await vapi.calls.create({
          assistantId: campaign.agentId,
          customer: { number: contact.phoneNumber },
        });
      });
    }
  },
});

// 2. Transcript Analysis
export const analyzeCallJob = client.defineJob({
  id: 'analyze-call',
  name: 'Analyze Call Transcript',
  version: '1.0.0',
  trigger: eventTrigger({ name: 'call.analyze' }),
  run: async (payload: { callId: string }, io) => {
    const call = await prisma.call.findUnique({
      where: { id: payload.callId },
    });
    
    const analysis = await io.runTask('ai-analysis', async () => {
      return analyzeTranscript(call.transcript);
    });
    
    await prisma.call.update({
      where: { id: call.id },
      data: {
        sentiment: analysis.sentiment,
        leadScore: analysis.leadScore,
        analysis: analysis,
      },
    });
  },
});

// 3. Daily Reports
export const dailyReportJob = client.defineJob({
  id: 'daily-report',
  name: 'Generate Daily Report',
  version: '1.0.0',
  trigger: cronTrigger({ cron: '0 9 * * *' }), // 9am daily
  run: async (payload, io) => {
    const orgs = await prisma.organization.findMany();
    
    for (const org of orgs) {
      const report = await generateDailyReport(org.id);
      await sendReportEmail(org, report);
    }
  },
});
```

---

## Caching Strategy

```typescript
// lib/cache.ts
import { redis } from './redis';

const CACHE_TTL = {
  analytics: 300,      // 5 minutes
  agentConfig: 3600,   // 1 hour
  planLimits: 86400,   // 1 day
};

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return cached as T;
  
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
export async function getDashboardAnalytics(orgId: string) {
  return getCachedOrFetch(
    `analytics:dashboard:${orgId}`,
    () => computeDashboardAnalytics(orgId),
    CACHE_TTL.analytics
  );
}
```

---

## Security Architecture

### Authentication Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ User   │────▶│ Clerk  │────▶│ Verify │────▶│  App   │
│ Login  │     │ Auth   │     │ Token  │     │ Access │
└────────┘     └────────┘     └────────┘     └────────┘

1. User authenticates with Clerk
2. Clerk issues JWT token
3. App verifies token on each request
4. Extract user + org from token claims
```

### API Security Layers

```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs';
import { Ratelimit } from '@upstash/ratelimit';

export default authMiddleware({
  publicRoutes: ['/', '/pricing', '/api/webhooks/(.*)'],
  async beforeAuth(req) {
    // Rate limiting
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
    });
    
    const ip = req.ip ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }
  },
});
```

---

## Scalability Considerations

### Horizontal Scaling Points

| Component | Scaling Strategy |
|-----------|------------------|
| Web App | Vercel auto-scaling (serverless) |
| Database | Supabase connection pooling + read replicas |
| Cache | Upstash global replication |
| Background Jobs | Trigger.dev auto-scaling |
| File Storage | R2 (globally distributed) |

### Performance Optimizations

1. **Database Queries**
   - Proper indexing
   - Query optimization
   - Connection pooling

2. **API Responses**
   - Response caching
   - Pagination
   - Field selection (avoid over-fetching)

3. **Real-time Updates**
   - WebSocket for live data
   - Server-Sent Events for simpler cases
   - Polling fallback

4. **Asset Delivery**
   - CDN for static assets
   - Image optimization
   - Code splitting