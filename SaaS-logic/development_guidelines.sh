# Development Guidelines

## Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm 8+
- PostgreSQL 15+ (or Supabase account)
- Redis (or Upstash account)
- Git

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourcompany/voxforge-ai.git
cd voxforge-ai

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Set up database
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed with demo data

# 5. Start development server
pnpm dev

# App runs at http://localhost:3000
```

### IDE Setup (VS Code)

**Recommended Extensions:**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma
- Error Lens
- GitLens

**Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## Coding Standards

### TypeScript Guidelines

#### Strict Mode

Always use strict TypeScript configuration:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Type Safety

```typescript
// ❌ Bad - Avoid `any`
function processData(data: any) {
  return data.value;
}

// ✅ Good - Use proper types
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}

// ❌ Bad - Non-null assertion
const user = getUser()!;

// ✅ Good - Handle null cases
const user = getUser();
if (!user) {
  throw new Error('User not found');
}
```

#### Prefer Type Inference

```typescript
// ❌ Unnecessary type annotation
const name: string = 'John';

// ✅ Let TypeScript infer
const name = 'John';

// ✅ Annotate when necessary (function parameters, return types)
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

#### Use Discriminated Unions

```typescript
// ❌ Bad
interface ApiResponse {
  success: boolean;
  data?: Data;
  error?: string;
}

// ✅ Good - Discriminated union
type ApiResponse =
  | { success: true; data: Data }
  | { success: false; error: string };

function handleResponse(response: ApiResponse) {
  if (response.success) {
    // TypeScript knows data exists
    console.log(response.data);
  } else {
    // TypeScript knows error exists
    console.log(response.error);
  }
}
```

---

### React Guidelines

#### Component Structure

```typescript
// components/agents/agent-card.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Agent } from '@/types';

// Props interface
interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (id: string) => void;
}

// Component
export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete?.(agent.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3>{agent.name}</h3>
      </CardHeader>
      <CardContent>
        <p>{agent.description}</p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onEdit?.(agent)}>Edit</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Custom Hooks

```typescript
// hooks/use-agents.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => trpc.agents.list.query(),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentInput) => trpc.agents.create.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => trpc.agents.get.query(id),
    enabled: !!id,
  });
}
```

#### Form Handling

```typescript
// components/agents/agent-form.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAgentSchema, type CreateAgentInput } from '@/schemas/agent.schema';

export function AgentForm({ onSubmit }: { onSubmit: (data: CreateAgentInput) => void }) {
  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: '',
      systemPrompt: '',
      voice: 'rachel',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* More fields... */}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create Agent
      </Button>
    </form>
  );
}
```

---

### API Guidelines

#### tRPC Router Pattern

```typescript
// server/routers/agents.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createAgentSchema, updateAgentSchema } from '@/schemas/agent.schema';
import { AgentService } from '../services/agent.service';

export const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new AgentService(ctx);
    return service.list();
  }),

  get: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const service = new AgentService(ctx);
      return service.get(input);
    }),

  create: protectedProcedure
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx);
      return service.create(input);
    }),

  update: protectedProcedure
    .input(updateAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx);
      return service.update(input.id, input);
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const service = new AgentService(ctx);
      return service.delete(input);
    }),
});
```

#### Service Layer Pattern

```typescript
// server/services/agent.service.ts

import { prisma } from '@/lib/db';
import { vapi } from '@/lib/vapi';
import type { Context } from '../trpc/context';
import type { CreateAgentInput, UpdateAgentInput } from '@/schemas/agent.schema';

export class AgentService {
  private orgId: string;

  constructor(ctx: Context) {
    this.orgId = ctx.orgId;
  }

  async list() {
    return prisma.agent.findMany({
      where: { organizationId: this.orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const agent = await prisma.agent.findFirst({
      where: { id, organizationId: this.orgId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return agent;
  }

  async create(input: CreateAgentInput) {
    // Create in Vapi first
    const vapiAssistant = await vapi.assistants.create({
      name: input.name,
      model: { provider: 'openai', model: 'gpt-4-turbo' },
      voice: { provider: 'elevenlabs', voiceId: input.voice },
      firstMessage: input.firstMessage,
    });

    // Create in database
    return prisma.agent.create({
      data: {
        ...input,
        organizationId: this.orgId,
        vapiAssistantId: vapiAssistant.id,
      },
    });
  }

  async update(id: string, input: UpdateAgentInput) {
    const agent = await this.get(id);

    // Update in Vapi
    if (agent.vapiAssistantId) {
      await vapi.assistants.update(agent.vapiAssistantId, {
        name: input.name,
        // ... other fields
      });
    }

    // Update in database
    return prisma.agent.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string) {
    const agent = await this.get(id);

    // Delete from Vapi
    if (agent.vapiAssistantId) {
      await vapi.assistants.delete(agent.vapiAssistantId);
    }

    // Delete from database
    return prisma.agent.delete({ where: { id } });
  }
}
```

---

### Error Handling

#### API Errors

```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests', 'RATE_LIMIT', 429);
  }
}
```

#### Error Boundary

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

---

### Testing Guidelines

#### Unit Tests

```typescript
// tests/unit/services/agent.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '@/server/services/agent.service';
import { prismaMock } from '../mocks/prisma';
import { vapiMock } from '../mocks/vapi';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService({ 
      orgId: 'org-123',
      db: prismaMock,
      vapi: vapiMock,
    });
  });

  describe('create', () => {
    it('should create agent in Vapi and database', async () => {
      vapiMock.assistants.create.mockResolvedValue({ id: 'vapi-123' });
      prismaMock.agent.create.mockResolvedValue({
        id: 'agent-123',
        name: 'Test Agent',
        vapiAssistantId: 'vapi-123',
      });

      const result = await service.create({
        name: 'Test Agent',
        systemPrompt: 'You are helpful',
        voice: 'rachel',
      });

      expect(result.vapiAssistantId).toBe('vapi-123');
      expect(vapiMock.assistants.create).toHaveBeenCalled();
      expect(prismaMock.agent.create).toHaveBeenCalled();
    });

    it('should rollback if Vapi fails', async () => {
      vapiMock.assistants.create.mockRejectedValue(new Error('Vapi error'));

      await expect(service.create({
        name: 'Test Agent',
        systemPrompt: 'You are helpful',
        voice: 'rachel',
      })).rejects.toThrow('Vapi error');

      expect(prismaMock.agent.create).not.toHaveBeenCalled();
    });
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/agents.spec.ts

import { test, expect } from '@playwright/test';
import { createTestUser, loginAs } from './fixtures/auth';

test.describe('Agents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'test@example.com');
  });

  test('should create a new agent', async ({ page }) => {
    await page.goto('/agents');
    await page.click('text=New Agent');

    await page.fill('[name="name"]', 'Sales Agent');
    await page.fill('[name="systemPrompt"]', 'You are a sales assistant');
    await page.selectOption('[name="voice"]', 'rachel');

    await page.click('text=Create Agent');

    await expect(page.locator('text=Sales Agent')).toBeVisible();
  });

  test('should test call an agent', async ({ page }) => {
    await page.goto('/agents/agent-123');
    await page.click('text=Test Call');

    await expect(page.locator('[data-testid="call-status"]')).toHaveText('Connected');
  });
});
```

---

### Git Workflow

#### Branch Naming

```
feature/  - New features (feature/add-calendar-integration)
fix/      - Bug fixes (fix/call-timeout-issue)
chore/    - Maintenance (chore/update-dependencies)
docs/     - Documentation (docs/api-reference)
refactor/ - Code refactoring (refactor/agent-service)
```

#### Commit Messages (Conventional Commits)

```
feat: add calendar integration for appointments
fix: resolve timeout issue in outbound calls
docs: update API documentation for webhooks
chore: upgrade Next.js to 14.1.0
refactor: simplify agent creation flow
test: add unit tests for billing service
```

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Comments added where necessary
- [ ] Documentation updated
- [ ] No new warnings
```

---

### Performance Guidelines

#### Database Queries

```typescript
// ❌ Bad - N+1 query
const agents = await prisma.agent.findMany();
for (const agent of agents) {
  const calls = await prisma.call.findMany({ where: { agentId: agent.id } });
}

// ✅ Good - Include relations
const agents = await prisma.agent.findMany({
  include: { calls: { take: 10 } },
});

// ✅ Good - Separate optimized query
const [agents, callCounts] = await Promise.all([
  prisma.agent.findMany(),
  prisma.call.groupBy({
    by: ['agentId'],
    _count: true,
  }),
]);
```

#### React Performance

```typescript
// ❌ Bad - Creating new objects in render
function AgentList({ agents }) {
  return (
    <DataTable
      columns={[
        { key: 'name', header: 'Name' },  // New object every render
      ]}
      data={agents}
    />
  );
}

// ✅ Good - Memoize stable values
const columns = [
  { key: 'name', header: 'Name' },
];

function AgentList({ agents }) {
  return <DataTable columns={columns} data={agents} />;
}

// ✅ Good - Use memo for expensive components
const MemoizedChart = memo(function AnalyticsChart({ data }) {
  return <ExpensiveChart data={data} />;
});
```

---

### Security Guidelines

#### Input Validation

```typescript
// Always validate input with Zod
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(10).max(10000),
  voice: z.enum(['rachel', 'adam', 'sarah']),
});

// In API route
const input = createAgentSchema.parse(req.body);
```

#### SQL Injection Prevention

```typescript
// ❌ Never - Raw SQL with user input
await prisma.$executeRaw`SELECT * FROM agents WHERE name = ${userInput}`;

// ✅ Always - Use Prisma's query builder
await prisma.agent.findMany({
  where: { name: userInput },
});
```

#### XSS Prevention

```typescript
// ❌ Dangerous
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Safe - React auto-escapes
<div>{userContent}</div>

// If HTML is needed, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

---

### Documentation Standards

#### JSDoc Comments

```typescript
/**
 * Creates a new AI agent and syncs it with Vapi.
 *
 * @param input - The agent configuration
 * @returns The created agent with Vapi assistant ID
 * @throws {ValidationError} If input validation fails
 * @throws {VapiError} If Vapi sync fails
 *
 * @example
 * ```ts
 * const agent = await agentService.create({
 *   name: 'Sales Agent',
 *   systemPrompt: 'You are a helpful sales assistant',
 *   voice: 'rachel',
 * });
 * ```
 */
async create(input: CreateAgentInput): Promise<Agent> {
  // Implementation
}
```

#### README for Features

Each major feature should have a README:

```markdown
# Agents Feature

## Overview
AI agents are the core of VoxForge. They represent voice assistants...

## Components
- `AgentCard` - Display card for agent
- `AgentForm` - Create/edit form
- `AgentBuilder` - Visual builder interface

## API
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent

## Database Schema
See `prisma/schema.prisma` for Agent model.

## Testing
Run `pnpm test -- agents` for feature tests.
```