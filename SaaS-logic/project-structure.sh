# Project Structure

## Directory Overview

```
voxforge-ai/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # CI pipeline
│   │   └── deploy.yml             # Deployment workflow
│   └── CODEOWNERS
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Seed data script
│   └── migrations/                # Database migrations
│
├── public/
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # Auth pages group
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   │
│   │   ├── (dashboard)/          # Protected dashboard pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── agents/
│   │   │   │   ├── page.tsx      # Agents list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create agent
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Agent details
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx      # Call logs
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Call details
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── knowledge/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/
│   │   │   │
│   │   │   ├── phone-numbers/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── billing/
│   │   │   │   ├── team/
│   │   │   │   └── api-keys/
│   │   │   │
│   │   │   └── onboarding/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (marketing)/          # Public marketing pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── pricing/
│   │   │   ├── features/
│   │   │   ├── blog/
│   │   │   └── contact/
│   │   │
│   │   ├── api/                   # API routes
│   │   │   ├── trpc/
│   │   │   │   └── [trpc]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── v1/               # REST API
│   │   │   │   ├── agents/
│   │   │   │   ├── calls/
│   │   │   │   └── campaigns/
│   │   │   │
│   │   │   ├── webhooks/
│   │   │   │   ├── vapi/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── stripe/
│   │   │   │   │   └── route.ts
│   │   │   │   └── clerk/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   └── cron/
│   │   │       ├── daily-reports/
│   │   │       └── cleanup/
│   │   │
│   │   ├── layout.tsx            # Root layout
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   ├── agents/               # Agent feature components
│   │   │   ├── agent-card.tsx
│   │   │   ├── agent-form.tsx
│   │   │   ├── agent-builder/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── prompt-editor.tsx
│   │   │   │   ├── voice-selector.tsx
│   │   │   │   └── test-call.tsx
│   │   │   └── agent-list.tsx
│   │   │
│   │   ├── campaigns/            # Campaign components
│   │   │   ├── campaign-card.tsx
│   │   │   ├── campaign-form.tsx
│   │   │   ├── contact-upload.tsx
│   │   │   └── campaign-stats.tsx
│   │   │
│   │   ├── calls/                # Call components
│   │   │   ├── call-list.tsx
│   │   │   ├── call-detail.tsx
│   │   │   ├── transcript-viewer.tsx
│   │   │   └── audio-player.tsx
│   │   │
│   │   ├── analytics/            # Analytics components
│   │   │   ├── dashboard-cards.tsx
│   │   │   ├── call-chart.tsx
│   │   │   ├── sentiment-chart.tsx
│   │   │   └── performance-table.tsx
│   │   │
│   │   ├── knowledge/            # Knowledge base components
│   │   │   ├── document-list.tsx
│   │   │   ├── document-upload.tsx
│   │   │   └── qa-editor.tsx
│   │   │
│   │   ├── settings/             # Settings components
│   │   │   ├── profile-form.tsx
│   │   │   ├── billing-section.tsx
│   │   │   └── api-keys-table.tsx
│   │   │
│   │   └── shared/               # Shared components
│   │       ├── data-table.tsx
│   │       ├── empty-state.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── page-header.tsx
│   │       └── confirm-dialog.tsx
│   │
│   ├── lib/                       # Core utilities
│   │   ├── db.ts                  # Prisma client
│   │   ├── redis.ts               # Redis client
│   │   ├── vapi.ts                # Vapi SDK wrapper
│   │   ├── stripe.ts              # Stripe client
│   │   ├── openai.ts              # OpenAI client
│   │   ├── storage.ts             # R2/S3 client
│   │   ├── email.ts               # Resend client
│   │   └── utils.ts               # General utilities
│   │
│   ├── server/                    # Server-side code
│   │   ├── trpc/
│   │   │   ├── index.ts           # tRPC init
│   │   │   ├── context.ts         # Request context
│   │   │   └── middleware.ts      # Auth middleware
│   │   │
│   │   ├── routers/               # tRPC routers
│   │   │   ├── _app.ts            # Root router
│   │   │   ├── agents.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── calls.ts
│   │   │   ├── analytics.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── phone-numbers.ts
│   │   │   ├── integrations.ts
│   │   │   ├── billing.ts
│   │   │   └── users.ts
│   │   │
│   │   └── services/              # Business logic
│   │       ├── agent.service.ts
│   │       ├── campaign.service.ts
│   │       ├── call.service.ts
│   │       ├── analytics.service.ts
│   │       ├── billing.service.ts
│   │       └── vapi-sync.service.ts
│   │
│   ├── hooks/                     # React hooks
│   │   ├── use-agents.ts
│   │   ├── use-campaigns.ts
│   │   ├── use-calls.ts
│   │   ├── use-analytics.ts
│   │   ├── use-debounce.ts
│   │   └── use-local-storage.ts
│   │
│   ├── stores/                    # Zustand stores
│   │   ├── agent-store.ts
│   │   ├── ui-store.ts
│   │   └── onboarding-store.ts
│   │
│   ├── types/                     # TypeScript types
│   │   ├── agent.ts
│   │   ├── campaign.ts
│   │   ├── call.ts
│   │   ├── analytics.ts
│   │   ├── api.ts
│   │   └── vapi.ts
│   │
│   ├── schemas/                   # Zod schemas
│   │   ├── agent.schema.ts
│   │   ├── campaign.schema.ts
│   │   ├── call.schema.ts
│   │   └── common.schema.ts
│   │
│   ├── constants/                 # App constants
│   │   ├── plans.ts
│   │   ├── voices.ts
│   │   ├── languages.ts
│   │   └── routes.ts
│   │
│   └── emails/                    # React email templates
│       ├── welcome.tsx
│       ├── call-summary.tsx
│       ├── daily-report.tsx
│       └── trial-ending.tsx
│
├── trigger/                       # Trigger.dev jobs
│   ├── client.ts
│   └── jobs/
│       ├── campaign-execute.ts
│       ├── call-analyze.ts
│       ├── report-generate.ts
│       └── sync-vapi.ts
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── webhooks/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── agents.spec.ts
│       └── campaigns.spec.ts
│
├── docs/                          # Documentation
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
├── scripts/                       # Utility scripts
│   ├── seed.ts
│   ├── migrate.ts
│   └── generate-api-docs.ts
│
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment (gitignored)
├── .eslintrc.js
├── .prettierrc
├── components.json                # shadcn/ui config
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## Key Files Explained

### Configuration Files

#### `next.config.ts`
```typescript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      { hostname: 'storage.googleapis.com' },
      { hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'voxforge',
  project: 'voxforge-app',
});
```

#### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

#### `.env.example`
```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Vapi.ai
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=
VAPI_PHONE_NUMBER_ID=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Storage (R2)
R2_ENDPOINT=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=

# Email (Resend)
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=

# Trigger.dev
TRIGGER_API_KEY=
```

---

## Naming Conventions

### Files & Folders

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AgentCard.tsx` |
| Hooks | camelCase with `use` prefix | `useAgents.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `Agent.ts` |
| Schemas | camelCase with `.schema` suffix | `agent.schema.ts` |
| API routes | kebab-case | `api/v1/phone-numbers` |
| tRPC routers | camelCase | `agents.ts` |

### Code Conventions

```typescript
// Types - PascalCase
interface AgentConfig {
  name: string;
  voice: VoiceSettings;
}

// Enums - PascalCase with SCREAMING_SNAKE values
enum CallStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

// Functions - camelCase
function createAgent(config: AgentConfig): Promise<Agent> {
  // ...
}

// Constants - SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_VOICE_ID = 'rachel';

// React components - PascalCase
export function AgentCard({ agent }: AgentCardProps) {
  // ...
}
```

---

## Module Organization

### Feature-Based Structure

Each feature (agents, campaigns, calls) follows the same pattern:

```
feature/
├── components/           # UI components
├── hooks/               # Feature-specific hooks
├── types/               # TypeScript types
├── schemas/             # Validation schemas
├── services/            # Business logic
└── utils/               # Helper functions
```

### Import Order

```typescript
// 1. React/Next
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { z } from 'zod';
import { format } from 'date-fns';

// 3. Internal - absolute imports
import { Button } from '@/components/ui/button';
import { useAgents } from '@/hooks/use-agents';
import { trpc } from '@/lib/trpc';

// 4. Internal - relative imports
import { AgentCard } from './agent-card';
import { formatAgentStatus } from './utils';

// 5. Types
import type { Agent } from '@/types';
```

---

## Testing Structure

```
tests/
├── unit/                          # Unit tests (Vitest)
│   ├── services/
│   │   ├── agent.service.test.ts
│   │   └── billing.service.test.ts
│   └── utils/
│       └── format.test.ts
│
├── integration/                   # Integration tests
│   ├── api/
│   │   ├── agents.test.ts
│   │   └── calls.test.ts
│   └── webhooks/
│       ├── vapi.test.ts
│       └── stripe.test.ts
│
└── e2e/                          # End-to-end tests (Playwright)
    ├── fixtures/
    │   └── auth.ts
    ├── auth.spec.ts
    ├── agents.spec.ts
    ├── campaigns.spec.ts
    └── onboarding.spec.ts
```

### Test File Example

```typescript
// tests/unit/services/agent.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AgentService } from '@/server/services/agent.service';

describe('AgentService', () => {
  describe('create', () => {
    it('should create an agent and sync to Vapi', async () => {
      const mockVapi = vi.fn().mockResolvedValue({ id: 'vapi-123' });
      const service = new AgentService({ vapiClient: mockVapi });
      
      const agent = await service.create({
        name: 'Test Agent',
        systemPrompt: 'You are a helpful assistant',
      });
      
      expect(agent).toBeDefined();
      expect(agent.vapiAssistantId).toBe('vapi-123');
      expect(mockVapi).toHaveBeenCalled();
    });
  });
});
```

---

## Deployment Structure

```
.vercel/
├── project.json
└── README.txt

vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "functions": {
    "app/api/webhooks/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-reports",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```