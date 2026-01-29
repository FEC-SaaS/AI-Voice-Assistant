# SaaS Logic

## Multi-Tenancy

### Tenant Model

```
Organization (Tenant)
├── Users (team members)
├── Agents (AI assistants)
├── Phone Numbers
├── Campaigns
├── Calls
├── Knowledge Documents
├── Integrations
└── Billing (Stripe customer)
```

### Organization Creation Flow

```typescript
// When user signs up via Clerk
export async function handleUserCreated(event: ClerkWebhookEvent) {
  const { id, email_addresses, first_name, last_name } = event.data;
  
  // Check if invited to existing org
  const invitation = await prisma.invitation.findFirst({
    where: { email: email_addresses[0].email_address, status: 'pending' },
  });

  if (invitation) {
    // Join existing organization
    await prisma.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });
    
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });
  } else {
    // Create new organization
    const organization = await prisma.organization.create({
      data: {
        name: `${first_name}'s Organization`,
        slug: generateSlug(`${first_name}-org`),
        plan: { connect: { id: 'free-trial' } },
      },
    });

    await prisma.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`,
        organizationId: organization.id,
        role: 'owner',
      },
    });

    // Initialize Stripe customer
    const customer = await stripe.customers.create({
      email: email_addresses[0].email_address,
      metadata: { organizationId: organization.id },
    });

    await prisma.organization.update({
      where: { id: organization.id },
      data: { stripeCustomerId: customer.id },
    });

    // Send welcome email
    await resend.emails.send({
      to: email_addresses[0].email_address,
      subject: 'Welcome to VoxForge AI',
      react: WelcomeEmail({ name: first_name }),
    });
  }
}
```

---

## Billing & Subscriptions

### Plan Structure

```typescript
// constants/plans.ts

export const PLANS = {
  FREE_TRIAL: {
    id: 'free-trial',
    name: 'Free Trial',
    price: 0,
    limits: {
      agents: 1,
      minutesPerMonth: 100,
      phoneNumbers: 1,
      campaigns: 1,
      teamMembers: 1,
      knowledgeDocs: 5,
    },
    features: {
      analytics: 'basic',
      integrations: false,
      whiteLabel: false,
      support: 'community',
    },
    trialDays: 14,
  },
  
  STARTER: {
    id: 'starter',
    stripePriceId: 'price_starter_monthly',
    name: 'Starter',
    price: 99,
    limits: {
      agents: 1,
      minutesPerMonth: 500,
      phoneNumbers: 1,
      campaigns: 5,
      teamMembers: 2,
      knowledgeDocs: 20,
    },
    features: {
      analytics: 'basic',
      integrations: false,
      whiteLabel: false,
      support: 'email',
    },
  },
  
  PROFESSIONAL: {
    id: 'professional',
    stripePriceId: 'price_professional_monthly',
    name: 'Professional',
    price: 299,
    limits: {
      agents: 3,
      minutesPerMonth: 2000,
      phoneNumbers: 3,
      campaigns: 20,
      teamMembers: 5,
      knowledgeDocs: 100,
    },
    features: {
      analytics: 'advanced',
      integrations: true,
      whiteLabel: false,
      support: 'priority',
    },
  },
  
  BUSINESS: {
    id: 'business',
    stripePriceId: 'price_business_monthly',
    name: 'Business',
    price: 599,
    limits: {
      agents: 10,
      minutesPerMonth: 5000,
      phoneNumbers: 10,
      campaigns: -1, // unlimited
      teamMembers: 20,
      knowledgeDocs: -1, // unlimited
    },
    features: {
      analytics: 'advanced',
      integrations: true,
      whiteLabel: true,
      support: 'dedicated',
    },
  },
  
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'custom',
    limits: {
      agents: -1,
      minutesPerMonth: -1,
      phoneNumbers: -1,
      campaigns: -1,
      teamMembers: -1,
      knowledgeDocs: -1,
    },
    features: {
      analytics: 'enterprise',
      integrations: true,
      whiteLabel: true,
      support: 'enterprise',
      sso: true,
      sla: true,
      customIntegrations: true,
    },
  },
} as const;
```

### Subscription Management

```typescript
// server/services/billing.service.ts

export class BillingService {
  private orgId: string;

  constructor(ctx: Context) {
    this.orgId = ctx.orgId;
  }

  async createSubscription(priceId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: this.orgId },
    });

    if (!org?.stripeCustomerId) {
      throw new Error('No Stripe customer');
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update organization
    await prisma.organization.update({
      where: { id: this.orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        planId: this.getPlanIdFromPrice(priceId),
      },
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
    };
  }

  async cancelSubscription() {
    const org = await prisma.organization.findUnique({
      where: { id: this.orgId },
    });

    if (!org?.stripeSubscriptionId) {
      throw new Error('No active subscription');
    }

    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return { cancelled: true };
  }

  async getUsage() {
    const startOfMonth = startOfMonth(new Date());
    
    const [minutesUsed, agentCount, campaignCount] = await Promise.all([
      prisma.call.aggregate({
        where: {
          organizationId: this.orgId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { durationSeconds: true },
      }),
      prisma.agent.count({ where: { organizationId: this.orgId } }),
      prisma.campaign.count({ where: { organizationId: this.orgId } }),
    ]);

    return {
      minutesUsed: Math.ceil((minutesUsed._sum.durationSeconds || 0) / 60),
      agents: agentCount,
      campaigns: campaignCount,
    };
  }

  async checkLimit(resource: 'agents' | 'campaigns' | 'minutes') {
    const org = await prisma.organization.findUnique({
      where: { id: this.orgId },
      include: { plan: true },
    });

    const usage = await this.getUsage();
    const limits = PLANS[org!.plan.id].limits;

    switch (resource) {
      case 'agents':
        if (limits.agents !== -1 && usage.agents >= limits.agents) {
          throw new Error('Agent limit reached. Please upgrade your plan.');
        }
        break;
      case 'campaigns':
        if (limits.campaigns !== -1 && usage.campaigns >= limits.campaigns) {
          throw new Error('Campaign limit reached. Please upgrade your plan.');
        }
        break;
      case 'minutes':
        if (limits.minutesPerMonth !== -1 && usage.minutesUsed >= limits.minutesPerMonth) {
          throw new Error('Monthly minutes exceeded. Please upgrade your plan.');
        }
        break;
    }

    return true;
  }
}
```

### Usage-Based Billing

```typescript
// Report overage minutes to Stripe
export async function reportUsage(orgId: string, minutes: number) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { plan: true },
  });

  if (!org?.stripeSubscriptionId) return;

  const planLimits = PLANS[org.plan.id].limits;
  const usage = await getMonthlyUsage(orgId);

  // Only report overage
  if (usage.minutesUsed > planLimits.minutesPerMonth) {
    const overageMinutes = minutes; // This call's minutes as overage

    // Get metered subscription item
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    const meteredItem = subscription.items.data.find(
      (item) => item.price.recurring?.usage_type === 'metered'
    );

    if (meteredItem) {
      await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
        quantity: overageMinutes,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      });
    }
  }
}
```

### Stripe Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  return Response.json({ received: true });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!org) return;

  const priceId = subscription.items.data[0].price.id;
  const plan = Object.values(PLANS).find((p) => p.stripePriceId === priceId);

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: subscription.id,
      planId: plan?.id ?? 'free-trial',
      subscriptionStatus: subscription.status,
    },
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!org) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      planId: 'free-trial',
      subscriptionStatus: 'cancelled',
    },
  });

  // Send cancellation email
  const owner = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'owner' },
  });

  if (owner) {
    await resend.emails.send({
      to: owner.email,
      subject: 'Your VoxForge subscription has been cancelled',
      react: SubscriptionCancelledEmail({ name: owner.name }),
    });
  }
}
```

---

## Access Control (RBAC)

### Roles & Permissions

```typescript
// lib/permissions.ts

export const ROLES = {
  owner: {
    name: 'Owner',
    description: 'Full access to everything',
    permissions: ['*'],
  },
  admin: {
    name: 'Admin',
    description: 'Manage team and settings',
    permissions: [
      'agents:*',
      'campaigns:*',
      'calls:*',
      'analytics:*',
      'knowledge:*',
      'phone_numbers:*',
      'integrations:*',
      'team:read',
      'team:invite',
      'settings:read',
      'settings:write',
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Manage agents and campaigns',
    permissions: [
      'agents:*',
      'campaigns:*',
      'calls:*',
      'analytics:*',
      'knowledge:*',
      'phone_numbers:read',
      'integrations:read',
      'team:read',
      'settings:read',
    ],
  },
  member: {
    name: 'Member',
    description: 'Basic access',
    permissions: [
      'agents:read',
      'campaigns:read',
      'calls:read',
      'calls:create',
      'analytics:read',
      'knowledge:read',
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'agents:read',
      'campaigns:read',
      'calls:read',
      'analytics:read',
    ],
  },
} as const;

export type Role = keyof typeof ROLES;
export type Permission = string;

export function hasPermission(role: Role, permission: Permission): boolean {
  const rolePerms = ROLES[role].permissions;
  
  if (rolePerms.includes('*')) return true;
  if (rolePerms.includes(permission)) return true;
  
  // Check wildcard (e.g., 'agents:*' matches 'agents:create')
  const [resource] = permission.split(':');
  if (rolePerms.includes(`${resource}:*`)) return true;
  
  return false;
}
```

### Permission Middleware

```typescript
// server/trpc/middleware.ts

export const requirePermission = (permission: Permission) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (!hasPermission(ctx.user.role as Role, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${permission}`,
      });
    }

    return next();
  });
};

// Usage in router
export const agentsRouter = router({
  create: protectedProcedure
    .use(requirePermission('agents:create'))
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});
```

---

## Team Management

### Invite Flow

```typescript
// server/services/team.service.ts

export class TeamService {
  async inviteMember(email: string, role: Role) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email, organizationId: this.orgId },
    });

    if (existingUser) {
      throw new Error('User is already a member');
    }

    // Check team size limit
    const memberCount = await prisma.user.count({
      where: { organizationId: this.orgId },
    });

    const org = await prisma.organization.findUnique({
      where: { id: this.orgId },
      include: { plan: true },
    });

    const limit = PLANS[org!.plan.id].limits.teamMembers;
    if (limit !== -1 && memberCount >= limit) {
      throw new Error('Team member limit reached');
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        organizationId: this.orgId,
        token: generateToken(),
        expiresAt: addDays(new Date(), 7),
      },
    });

    // Send invitation email
    await resend.emails.send({
      to: email,
      subject: `You're invited to join ${org!.name} on VoxForge`,
      react: InvitationEmail({
        orgName: org!.name,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
      }),
    });

    return invitation;
  }

  async removeMember(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: this.orgId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    await prisma.user.delete({ where: { id: userId } });

    return { removed: true };
  }

  async updateRole(userId: string, newRole: Role) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: this.orgId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    return { updated: true };
  }
}
```

---

## Onboarding Flow

### Onboarding Steps

```typescript
// stores/onboarding-store.ts

interface OnboardingState {
  currentStep: number;
  completedSteps: string[];
  data: {
    businessName?: string;
    industry?: string;
    useCase?: string;
    firstAgentName?: string;
    phoneNumber?: string;
  };
}

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Tell us about your business',
  },
  {
    id: 'use-case',
    title: 'Use Case',
    description: 'What will you use VoxForge for?',
  },
  {
    id: 'first-agent',
    title: 'Create Agent',
    description: 'Set up your first AI agent',
  },
  {
    id: 'phone-number',
    title: 'Phone Number',
    description: 'Get a phone number for your agent',
  },
  {
    id: 'test-call',
    title: 'Test Call',
    description: 'Make your first test call',
  },
];
```

### Onboarding Service

```typescript
// server/services/onboarding.service.ts

export class OnboardingService {
  async completeStep(step: string, data: any) {
    const org = await prisma.organization.findUnique({
      where: { id: this.orgId },
    });

    const completedSteps = [...(org?.onboardingSteps || []), step];

    await prisma.organization.update({
      where: { id: this.orgId },
      data: {
        onboardingSteps: completedSteps,
        onboardingData: {
          ...(org?.onboardingData as object || {}),
          [step]: data,
        },
      },
    });

    // Check if onboarding complete
    if (completedSteps.length >= ONBOARDING_STEPS.length) {
      await this.completeOnboarding();
    }

    return { completed: completedSteps };
  }

  async completeOnboarding() {
    await prisma.organization.update({
      where: { id: this.orgId },
      data: { onboardingComplete: true },
    });

    // Track analytics
    await posthog.capture({
      distinctId: this.orgId,
      event: 'onboarding_completed',
    });

    // Send completion email
    const owner = await prisma.user.findFirst({
      where: { organizationId: this.orgId, role: 'owner' },
    });

    if (owner) {
      await resend.emails.send({
        to: owner.email,
        subject: "You're all set! Here's what to do next",
        react: OnboardingCompleteEmail({ name: owner.name }),
      });
    }
  }
}
```

---

## Feature Flags

### Feature Flag System

```typescript
// lib/features.ts

export const FEATURES = {
  // Plan-based features
  advancedAnalytics: {
    plans: ['professional', 'business', 'enterprise'],
  },
  whiteLabel: {
    plans: ['business', 'enterprise'],
  },
  sso: {
    plans: ['enterprise'],
  },
  
  // Beta features (by org ID)
  newAgentBuilder: {
    beta: true,
    orgIds: ['org_123', 'org_456'],
  },
  
  // Percentage rollout
  newDashboard: {
    percentage: 25,
  },
} as const;

export async function hasFeature(
  orgId: string,
  feature: keyof typeof FEATURES
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { plan: true },
  });

  const featureConfig = FEATURES[feature];

  // Plan-based check
  if ('plans' in featureConfig) {
    return featureConfig.plans.includes(org!.plan.id);
  }

  // Beta check
  if ('beta' in featureConfig && featureConfig.beta) {
    return featureConfig.orgIds?.includes(orgId) ?? false;
  }

  // Percentage rollout
  if ('percentage' in featureConfig) {
    const hash = hashCode(orgId + feature);
    return (hash % 100) < featureConfig.percentage;
  }

  return false;
}
```

### Feature Flag Hook

```typescript
// hooks/use-feature.ts

export function useFeature(feature: keyof typeof FEATURES) {
  const { data: org } = useOrganization();
  
  return useQuery({
    queryKey: ['feature', feature, org?.id],
    queryFn: () => checkFeature(feature),
    enabled: !!org?.id,
  });
}

// Usage
function Dashboard() {
  const { data: hasNewDashboard } = useFeature('newDashboard');
  
  if (hasNewDashboard) {
    return <NewDashboard />;
  }
  
  return <LegacyDashboard />;
}
```

---

## Data Retention & Privacy

### Data Retention Policies

```typescript
// jobs/data-retention.ts

export const dataRetentionJob = client.defineJob({
  id: 'data-retention',
  name: 'Data Retention Cleanup',
  trigger: cronTrigger({ cron: '0 3 * * *' }), // 3am daily
  run: async (_, io) => {
    const retentionPolicies = {
      calls: {
        free: 30,        // 30 days
        starter: 90,     // 90 days
        professional: 180,// 6 months
        business: 365,   // 1 year
        enterprise: -1,  // unlimited (or custom)
      },
      recordings: {
        free: 7,
        starter: 30,
        professional: 90,
        business: 180,
        enterprise: -1,
      },
    };

    const organizations = await io.runTask('get-orgs', async () => {
      return prisma.organization.findMany({
        include: { plan: true },
      });
    });

    for (const org of organizations) {
      const callRetention = retentionPolicies.calls[org.plan.id];
      const recordingRetention = retentionPolicies.recordings[org.plan.id];

      if (callRetention !== -1) {
        const cutoff = subDays(new Date(), callRetention);
        
        // Archive old calls (keep metadata, remove sensitive data)
        await io.runTask(`archive-calls-${org.id}`, async () => {
          await prisma.call.updateMany({
            where: {
              organizationId: org.id,
              createdAt: { lt: cutoff },
              archived: false,
            },
            data: {
              archived: true,
              transcript: null,
              summary: null,
            },
          });
        });
      }

      if (recordingRetention !== -1) {
        const cutoff = subDays(new Date(), recordingRetention);
        
        // Delete old recordings from storage
        await io.runTask(`delete-recordings-${org.id}`, async () => {
          const calls = await prisma.call.findMany({
            where: {
              organizationId: org.id,
              createdAt: { lt: cutoff },
              recordingUrl: { not: null },
            },
          });

          for (const call of calls) {
            await deleteRecording(call.recordingUrl);
            await prisma.call.update({
              where: { id: call.id },
              data: { recordingUrl: null },
            });
          }
        });
      }
    }
  },
});
```

### Data Export (GDPR)

```typescript
// server/services/data-export.service.ts

export class DataExportService {
  async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    const calls = await prisma.call.findMany({
      where: { organizationId: user!.organizationId },
      take: 1000,
    });

    const exportData = {
      user: {
        email: user!.email,
        name: user!.name,
        createdAt: user!.createdAt,
      },
      organization: {
        name: user!.organization.name,
        createdAt: user!.organization.createdAt,
      },
      calls: calls.map((c) => ({
        id: c.id,
        direction: c.direction,
        duration: c.durationSeconds,
        createdAt: c.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    // Create export file
    const fileName = `data-export-${userId}-${Date.now()}.json`;
    await uploadToR2(fileName, JSON.stringify(exportData, null, 2));

    // Generate signed URL
    const downloadUrl = await getSignedUrl(fileName, 24 * 60 * 60); // 24h

    // Notify user
    await resend.emails.send({
      to: user!.email,
      subject: 'Your data export is ready',
      react: DataExportEmail({ downloadUrl }),
    });

    return { downloadUrl };
  }

  async deleteUserData(userId: string) {
    // This is a serious operation - require additional confirmation
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user!.role === 'owner') {
      throw new Error('Owner must transfer ownership before deletion');
    }

    // Anonymize user data
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        name: 'Deleted User',
        clerkId: `deleted-${userId}`,
      },
    });

    // Delete from Clerk
    await clerk.users.deleteUser(user!.clerkId);

    return { deleted: true };
  }
}
```