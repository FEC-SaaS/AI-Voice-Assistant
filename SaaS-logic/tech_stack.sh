# Tech Stack

## Overview

This document outlines the technology choices for building a scalable, maintainable, and performant Voice AI SaaS platform.

---

## Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui            │
├─────────────────────────────────────────────────────────────────┤
│                          API LAYER                              │
│  tRPC (type-safe) + REST (external) + WebSockets (real-time)   │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                 │
│  Node.js + TypeScript + Prisma ORM                             │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                               │
│  PostgreSQL (Supabase) + Redis (Upstash) + S3 (Cloudflare R2) │
├─────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                          │
│  Vapi.ai + Stripe + Clerk + Resend + OpenAI                    │
├─────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE                             │
│  Vercel + AWS Lambda + CloudFlare + GitHub Actions             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Stack

### Framework: Next.js 14 (App Router)

**Why Next.js:**
- Server-side rendering for SEO
- API routes for lightweight backend
- Excellent developer experience
- Great performance out of the box
- Large ecosystem and community

**Configuration:**
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverActions: true,
    typedRoutes: true,
  },
  images: {
    domains: ['storage.googleapis.com', 'avatars.githubusercontent.com'],
  },
};
```

### Language: TypeScript

**Why TypeScript:**
- Type safety prevents bugs
- Better IDE support
- Self-documenting code
- Easier refactoring

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

### Styling: Tailwind CSS + shadcn/ui

**Why Tailwind:**
- Rapid prototyping
- Consistent design system
- Small bundle size
- Easy responsive design

**Why shadcn/ui:**
- Beautiful, accessible components
- Copy-paste, own your code
- Highly customizable
- Built on Radix primitives

**Key Components:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add select
npx shadcn-ui@latest add input
```

### State Management: Zustand + TanStack Query

**Zustand** - Client state:
```typescript
// stores/agentStore.ts
import { create } from 'zustand';

interface AgentState {
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
}));
```

**TanStack Query** - Server state:
```typescript
// hooks/useAgents.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => trpc.agents.list.query(),
  });
};
```

### Additional Frontend Libraries

| Library | Purpose |
|---------|---------|
| `react-hook-form` | Form handling |
| `zod` | Schema validation |
| `date-fns` | Date formatting |
| `recharts` | Analytics charts |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `sonner` | Toast notifications |
| `@dnd-kit` | Drag and drop |
| `react-flow` | Flow diagrams |

---

## Backend Stack

### Runtime: Node.js 20 LTS

**Why Node.js:**
- JavaScript/TypeScript throughout
- Excellent async performance
- Large package ecosystem
- Easy hiring

### API Framework: tRPC

**Why tRPC:**
- End-to-end type safety
- No code generation
- Excellent DX with Next.js
- Auto-completion everywhere

**Setup:**
```typescript
// server/routers/_app.ts
import { router } from '../trpc';
import { agentsRouter } from './agents';
import { campaignsRouter } from './campaigns';
import { analyticsRouter } from './analytics';

export const appRouter = router({
  agents: agentsRouter,
  campaigns: campaignsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
```

### ORM: Prisma

**Why Prisma:**
- Type-safe database queries
- Visual data browser
- Easy migrations
- Great documentation

**Schema Example:**
```prisma
// prisma/schema.prisma
model Agent {
  id          String   @id @default(cuid())
  name        String
  systemPrompt String  @db.Text
  voice       String
  language    String   @default("en-US")
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  calls       Call[]
  campaigns   Campaign[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([organizationId])
}
```

### Background Jobs: Trigger.dev

**Why Trigger.dev:**
- Serverless background jobs
- Built for Next.js
- Great observability
- No infrastructure to manage

**Use Cases:**
- Campaign execution
- Transcript processing
- Report generation
- Webhook retries

```typescript
// jobs/processCampaign.ts
import { client } from '@/trigger';

export const processCampaignJob = client.defineJob({
  id: 'process-campaign',
  name: 'Process Campaign Calls',
  version: '0.0.1',
  trigger: invokeTrigger(),
  run: async (payload, io) => {
    // Process campaign logic
  },
});
```

---

## Database Layer

### Primary Database: PostgreSQL (Supabase)

**Why PostgreSQL:**
- Robust and proven
- Great JSON support
- Full-text search
- Row-level security

**Why Supabase:**
- Managed PostgreSQL
- Real-time subscriptions
- Auth (backup option)
- Storage (backup option)
- Generous free tier

**Connection:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Cache: Redis (Upstash)

**Why Redis:**
- Fast key-value storage
- Session management
- Rate limiting
- Real-time features

**Why Upstash:**
- Serverless Redis
- Pay per request
- Global replication
- REST API

**Use Cases:**
```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Caching example
export async function getCachedAnalytics(orgId: string) {
  const cached = await redis.get(`analytics:${orgId}`);
  if (cached) return cached;
  
  const data = await computeAnalytics(orgId);
  await redis.setex(`analytics:${orgId}`, 300, data); // 5 min TTL
  return data;
}
```

### File Storage: Cloudflare R2

**Why R2:**
- S3-compatible API
- No egress fees
- Edge-distributed
- Cost-effective

**Use Cases:**
- Call recordings
- Uploaded documents
- Generated reports

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});
```

---

## External Services

### Voice AI: Vapi.ai

**Integration:**
```typescript
// lib/vapi.ts
import Vapi from '@vapi-ai/server-sdk';

export const vapi = new Vapi({
  apiKey: process.env.VAPI_API_KEY!,
});

// Create assistant
export async function createAssistant(config: AssistantConfig) {
  return vapi.assistants.create({
    name: config.name,
    model: {
      provider: 'openai',
      model: 'gpt-4-turbo',
      systemPrompt: config.systemPrompt,
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: config.voiceId,
    },
    firstMessage: config.firstMessage,
  });
}

// Make outbound call
export async function makeCall(phoneNumber: string, assistantId: string) {
  return vapi.calls.create({
    assistantId,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: {
      number: phoneNumber,
    },
  });
}
```

### Authentication: Clerk

**Why Clerk:**
- Complete auth solution
- Organization support (multi-tenant)
- Beautiful pre-built components
- Webhook integrations

```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/', '/pricing', '/api/webhooks/(.*)'],
});
```

### Payments: Stripe

**Why Stripe:**
- Industry standard
- Subscription billing
- Usage-based billing
- Metering API

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create subscription
export async function createSubscription(customerId: string, priceId: string) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

// Report usage
export async function reportUsage(subscriptionItemId: string, quantity: number) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  });
}
```

### Email: Resend

**Why Resend:**
- Developer-friendly
- React email templates
- Great deliverability
- Simple API

```typescript
// lib/email.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: 'VoxForge <hello@voxforge.ai>',
    to,
    subject: 'Welcome to VoxForge AI',
    react: WelcomeEmail({ name }),
  });
}
```

### AI Processing: OpenAI

**Why OpenAI:**
- GPT-4 for conversation intelligence
- Whisper for transcription
- Embeddings for knowledge base

```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Analyze transcript
export async function analyzeTranscript(transcript: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `Analyze this call transcript and extract:
          1. Customer sentiment (positive/neutral/negative)
          2. Key objections raised
          3. Buying signals detected
          4. Action items
          5. Lead score (1-100)
          Return as JSON.`,
      },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(response.choices[0].message.content!);
}
```

---

## Infrastructure

### Hosting: Vercel

**Why Vercel:**
- Next.js creators
- Zero-config deployment
- Edge functions
- Great DX

**Configuration:**
```json
// vercel.json
{
  "functions": {
    "app/api/webhooks/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-reports",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### CDN: Cloudflare

**Why Cloudflare:**
- Global edge network
- DDoS protection
- SSL/TLS
- R2 integration

### CI/CD: GitHub Actions

**Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Monitoring & Observability

### Error Tracking: Sentry

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

### Analytics: PostHog

```typescript
// lib/posthog.ts
import posthog from 'posthog-js';

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}
```

### Uptime Monitoring: BetterStack

- Status page
- Incident management
- Alerting

---

## Security Considerations

### API Security

```typescript
// Rate limiting with Upstash
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limited', { status: 429 });
  }
}
```

### Data Encryption

- Data at rest: PostgreSQL encryption
- Data in transit: TLS 1.3
- Sensitive fields: Application-level encryption

### Secrets Management

- Vercel environment variables
- GitHub Secrets for CI/CD
- No secrets in code ever

---

## Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Commitlint | Commit message validation |
| TypeDoc | Documentation generation |
| Playwright | E2E testing |
| Vitest | Unit testing |

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

---

## Cost Estimates (Monthly)

| Service | Free Tier | Production ($500+ MRR) |
|---------|-----------|------------------------|
| Vercel | Free | $20/mo |
| Supabase | Free | $25/mo |
| Upstash Redis | Free | $10/mo |
| Cloudflare R2 | Free | $5/mo |
| Clerk | Free (5K MAU) | $25/mo |
| Resend | Free (3K emails) | $20/mo |
| Sentry | Free | $26/mo |
| PostHog | Free | $0 |
| **Total** | **$0** | **~$130/mo** |

*Note: Vapi.ai costs pass through to customers based on usage*