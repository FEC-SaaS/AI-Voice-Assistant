import { db } from "@/lib/db";
import { stripe, createStripeCustomer, reportUsage } from "@/lib/stripe";
import { getPlan, OVERAGE_RATE_CENTS } from "@/constants/plans";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("BillingService");

export interface UsageStats {
  agents: { used: number; limit: number; remaining: number };
  phoneNumbers: { used: number; limit: number; remaining: number };
  campaigns: { used: number; limit: number; remaining: number };
  minutes: { used: number; limit: number; remaining: number };
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  limit?: number;
}

/**
 * Get organization usage statistics
 */
export async function getOrganizationUsage(orgId: string): Promise<UsageStats> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          agents: true,
          phoneNumbers: true,
          campaigns: true,
        },
      },
    },
  });

  if (!org) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  // Get minutes used this billing period
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const minutesAgg = await db.call.aggregate({
    where: {
      organizationId: orgId,
      createdAt: { gte: startOfMonth },
    },
    _sum: { durationSeconds: true },
  });

  const plan = getPlan(org.planId);
  const minutesUsed = Math.ceil((minutesAgg._sum.durationSeconds || 0) / 60);

  return {
    agents: {
      used: org._count.agents,
      limit: plan.agents,
      remaining: plan.agents === -1 ? Infinity : Math.max(0, plan.agents - org._count.agents),
    },
    phoneNumbers: {
      used: org._count.phoneNumbers,
      limit: plan.phoneNumbers,
      remaining: plan.phoneNumbers === -1 ? Infinity : Math.max(0, plan.phoneNumbers - org._count.phoneNumbers),
    },
    campaigns: {
      used: org._count.campaigns,
      limit: plan.campaigns,
      remaining: plan.campaigns === -1 ? Infinity : Math.max(0, plan.campaigns - org._count.campaigns),
    },
    minutes: {
      used: minutesUsed,
      limit: plan.minutesPerMonth,
      remaining: plan.minutesPerMonth === -1 ? Infinity : Math.max(0, plan.minutesPerMonth - minutesUsed),
    },
  };
}

/**
 * Check if organization can add an agent
 */
export async function checkAgentLimit(orgId: string): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);

  if (usage.agents.limit === -1) {
    return { allowed: true };
  }

  if (usage.agents.used >= usage.agents.limit) {
    return {
      allowed: false,
      reason: `You have reached your plan limit of ${usage.agents.limit} agent(s). Please upgrade to add more agents.`,
      upgradeRequired: true,
      currentUsage: usage.agents.used,
      limit: usage.agents.limit,
    };
  }

  return { allowed: true };
}

/**
 * Check if organization can add a phone number
 */
export async function checkPhoneNumberLimit(orgId: string): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);

  if (usage.phoneNumbers.limit === -1) {
    return { allowed: true };
  }

  if (usage.phoneNumbers.used >= usage.phoneNumbers.limit) {
    return {
      allowed: false,
      reason: `You have reached your plan limit of ${usage.phoneNumbers.limit} phone number(s). Please upgrade to add more.`,
      upgradeRequired: true,
      currentUsage: usage.phoneNumbers.used,
      limit: usage.phoneNumbers.limit,
    };
  }

  return { allowed: true };
}

/**
 * Check if organization can add a campaign
 */
export async function checkCampaignLimit(orgId: string): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);

  if (usage.campaigns.limit === -1) {
    return { allowed: true };
  }

  if (usage.campaigns.used >= usage.campaigns.limit) {
    return {
      allowed: false,
      reason: `You have reached your plan limit of ${usage.campaigns.limit} campaign(s). Please upgrade to add more.`,
      upgradeRequired: true,
      currentUsage: usage.campaigns.used,
      limit: usage.campaigns.limit,
    };
  }

  return { allowed: true };
}

/**
 * Check if organization can make calls (has minutes remaining)
 */
export async function checkMinutesLimit(orgId: string, estimatedMinutes: number = 1): Promise<LimitCheckResult> {
  const usage = await getOrganizationUsage(orgId);

  // Unlimited minutes
  if (usage.minutes.limit === -1) {
    return { allowed: true };
  }

  // Check if they have enough minutes
  if (usage.minutes.remaining < estimatedMinutes) {
    return {
      allowed: false,
      reason: `You have ${usage.minutes.remaining} minutes remaining this month. Please upgrade for more minutes.`,
      upgradeRequired: true,
      currentUsage: usage.minutes.used,
      limit: usage.minutes.limit,
    };
  }

  return { allowed: true };
}

/**
 * Record call usage and handle overage billing
 */
export async function recordCallUsage(
  orgId: string,
  durationSeconds: number,
  callId: string
): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!org) return;

  const plan = getPlan(org.planId);
  const durationMinutes = Math.ceil(durationSeconds / 60);

  // Get current usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentUsage = await db.call.aggregate({
    where: {
      organizationId: orgId,
      createdAt: { gte: startOfMonth },
      id: { not: callId }, // Exclude current call
    },
    _sum: { durationSeconds: true },
  });

  const totalMinutesUsed = Math.ceil((currentUsage._sum.durationSeconds || 0) / 60) + durationMinutes;

  // Check for overage
  if (plan.minutesPerMonth !== -1 && totalMinutesUsed > plan.minutesPerMonth) {
    const overageMinutes = Math.max(0, totalMinutesUsed - plan.minutesPerMonth);

    // Calculate cost in cents
    const costCents = overageMinutes * OVERAGE_RATE_CENTS;

    // Update call with cost
    await db.call.update({
      where: { id: callId },
      data: { costCents },
    });

    // Report overage to Stripe if customer has metered billing
    if (org.stripeSubscriptionId && org.stripeCustomerId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        const meteredItem = subscription.items.data.find(
          (item) => item.price.recurring?.usage_type === "metered"
        );

        if (meteredItem) {
          await reportUsage(meteredItem.id, overageMinutes);
        }
      } catch (error) {
        log.error("Failed to report usage to Stripe:", error);
      }
    }
  }
}

/**
 * Create Stripe customer for organization
 */
export async function ensureStripeCustomer(orgId: string): Promise<string> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        where: { role: "owner" },
        take: 1,
      },
    },
  });

  if (!org) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  // Already has a customer
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  // Create new customer
  const ownerEmail = org.users[0]?.email || "unknown@example.com";
  const customer = await createStripeCustomer(ownerEmail, org.name, {
    organizationId: orgId,
  });

  // Update organization with customer ID
  await db.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Handle successful subscription
 */
export async function handleSubscriptionCreated(
  subscriptionId: string,
  customerId: string,
  priceId: string
): Promise<void> {
  // Find organization by Stripe customer ID
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!org) {
    log.error("Organization not found for customer:", customerId);
    return;
  }

  // Determine plan from price ID
  let planId = "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    planId = "professional";
  } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
    planId = "business";
  }

  // Update organization
  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      planId,
    },
  });

  log.info(`Organization ${org.id} upgraded to ${planId}`);
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
  const org = await db.organization.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!org) {
    log.error("Organization not found for subscription:", subscriptionId);
    return;
  }

  // Downgrade to free trial
  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: null,
      planId: "free-trial",
    },
  });

  log.info(`Organization ${org.id} downgraded to free-trial`);
}

/**
 * Handle subscription update (plan change)
 */
export async function handleSubscriptionUpdated(
  subscriptionId: string,
  priceId: string
): Promise<void> {
  const org = await db.organization.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!org) {
    log.error("Organization not found for subscription:", subscriptionId);
    return;
  }

  // Determine plan from price ID
  let planId = "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    planId = "professional";
  } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
    planId = "business";
  }

  // Update organization plan
  await db.organization.update({
    where: { id: org.id },
    data: { planId },
  });

  log.info(`Organization ${org.id} plan updated to ${planId}`);
}

/**
 * Get billing history
 */
export async function getBillingHistory(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 12,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
    }));
  } catch (error) {
    log.error("Failed to fetch invoices:", error);
    return [];
  }
}
