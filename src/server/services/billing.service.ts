import { db } from "@/lib/db";
import { stripe, createStripeCustomer, reportUsage } from "@/lib/stripe";
import { getPlan, getOverageRateCents } from "@/constants/plans";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";
import {
  sendUsageAlertEmail,
  sendOverageCapHitEmail,
  sendOverageThresholdEmail,
} from "@/lib/email";

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

  if (usage.agents.limit === -1) return { allowed: true };

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

  if (usage.phoneNumbers.limit === -1) return { allowed: true };

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

  if (usage.campaigns.limit === -1) return { allowed: true };

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
 * Check if organization can make calls (minutes remaining + trial rules)
 */
export async function checkMinutesLimit(orgId: string, estimatedMinutes: number = 1): Promise<LimitCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planId: true,
      trialExpiresAt: true,
      overageCapCents: true,
      users: { where: { role: "owner" }, take: 1, select: { email: true } },
    },
  });

  if (!org) return { allowed: false, reason: "Organization not found" };

  // ── 14-day trial expiry check ─────────────────────────────────────────
  if (org.planId === "free-trial") {
    // Ensure trialExpiresAt is set
    if (!org.trialExpiresAt) {
      await db.organization.update({
        where: { id: orgId },
        data: { trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      });
    } else if (org.trialExpiresAt < new Date()) {
      return {
        allowed: false,
        reason: "Your 14-day free trial has expired. Please upgrade to continue making calls.",
        upgradeRequired: true,
      };
    }

    // ── 20 outbound call cap during trial ─────────────────────────────
    const trialStart = org.trialExpiresAt
      ? new Date(org.trialExpiresAt.getTime() - 14 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const outboundCount = await db.call.count({
      where: {
        organizationId: orgId,
        direction: "outbound",
        createdAt: { gte: trialStart },
      },
    });

    if (outboundCount >= 20) {
      return {
        allowed: false,
        reason: "You have reached the 20 outbound call limit for your free trial. Please upgrade to continue.",
        upgradeRequired: true,
      };
    }
  }

  const usage = await getOrganizationUsage(orgId);

  // Unlimited minutes
  if (usage.minutes.limit === -1) return { allowed: true };

  // ── Overage cap check ─────────────────────────────────────────────────
  if (org.overageCapCents && org.overageCapCents > 0 && usage.minutes.used > usage.minutes.limit) {
    const overageMinutes = usage.minutes.used - usage.minutes.limit;
    const overageRateCents = getOverageRateCents(org.planId);
    const currentOverageCents = overageMinutes * overageRateCents;
    if (currentOverageCents >= org.overageCapCents) {
      return {
        allowed: false,
        reason: `Your monthly overage cap of $${(org.overageCapCents / 100).toFixed(2)} has been reached. Calls are paused until next billing cycle or you remove the cap.`,
        upgradeRequired: false,
      };
    }
  }

  // Trial users hitting the minute limit: block, don't bill
  if (org.planId === "free-trial" && usage.minutes.remaining < estimatedMinutes) {
    return {
      allowed: false,
      reason: "You have used all 100 trial minutes. Please upgrade to continue making calls.",
      upgradeRequired: true,
    };
  }

  if (usage.minutes.remaining < estimatedMinutes) {
    // Paid plan — overage is allowed unless cap hit above
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record call usage, handle overage billing, fire usage alert emails
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
      overageCapCents: true,
      settings: true,
      users: { where: { role: "owner" }, take: 1, select: { email: true, name: true } },
    },
  });

  if (!org) return;

  const plan = getPlan(org.planId);
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const overageRateCents = getOverageRateCents(org.planId);

  // Get current usage (exclude this call)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentUsage = await db.call.aggregate({
    where: {
      organizationId: orgId,
      createdAt: { gte: startOfMonth },
      id: { not: callId },
    },
    _sum: { durationSeconds: true },
  });

  const prevMinutes = Math.ceil((currentUsage._sum.durationSeconds || 0) / 60);
  const totalMinutesUsed = prevMinutes + durationMinutes;
  const ownerEmail = org.users[0]?.email;
  const ownerName = org.users[0]?.name || "there";
  const settings = org.settings as Record<string, unknown> | null;

  // ── Usage alert emails (80% and 100% of included minutes) ────────────
  if (plan.minutesPerMonth !== -1 && ownerEmail) {
    const prevPct = plan.minutesPerMonth > 0 ? (prevMinutes / plan.minutesPerMonth) * 100 : 0;
    const newPct = plan.minutesPerMonth > 0 ? (totalMinutesUsed / plan.minutesPerMonth) * 100 : 0;

    const alert80Sent = settings?.usageAlert80Sent === true;
    const alert100Sent = settings?.usageAlert100Sent === true;

    if (!alert80Sent && prevPct < 80 && newPct >= 80) {
      sendUsageAlertEmail(ownerEmail, ownerName, {
        percent: 80,
        minutesUsed: totalMinutesUsed,
        minutesLimit: plan.minutesPerMonth,
        planName: plan.name,
        overageRateDollars: overageRateCents / 100,
      }).catch((e) => log.error("Failed to send 80% alert email:", e));
      await db.organization.update({
        where: { id: orgId },
        data: { settings: { ...(settings ?? {}), usageAlert80Sent: true } as object },
      });
    }

    if (!alert100Sent && prevPct < 100 && newPct >= 100) {
      sendUsageAlertEmail(ownerEmail, ownerName, {
        percent: 100,
        minutesUsed: totalMinutesUsed,
        minutesLimit: plan.minutesPerMonth,
        planName: plan.name,
        overageRateDollars: overageRateCents / 100,
      }).catch((e) => log.error("Failed to send 100% alert email:", e));
      await db.organization.update({
        where: { id: orgId },
        data: { settings: { ...(settings ?? {}), usageAlert100Sent: true } as object },
      });
    }
  }

  // ── Overage handling ──────────────────────────────────────────────────
  if (plan.minutesPerMonth !== -1 && totalMinutesUsed > plan.minutesPerMonth) {
    const overageMinutes = Math.max(0, totalMinutesUsed - plan.minutesPerMonth);
    const prevOverageMinutes = Math.max(0, prevMinutes - plan.minutesPerMonth);
    const costCents = overageMinutes * overageRateCents;

    // Update call with overage cost
    await db.call.update({
      where: { id: callId },
      data: { costCents },
    });

    // ── Per-100-overage-minutes email ──────────────────────────────────
    if (ownerEmail) {
      const prevBucket = Math.floor(prevOverageMinutes / 100);
      const newBucket = Math.floor(overageMinutes / 100);
      if (newBucket > prevBucket) {
        const totalOverageCents = overageMinutes * overageRateCents;
        sendOverageThresholdEmail(ownerEmail, ownerName, {
          overageMinutes,
          overageCostDollars: totalOverageCents / 100,
          overageRateDollars: overageRateCents / 100,
          planName: plan.name,
        }).catch((e) => log.error("Failed to send overage threshold email:", e));
      }
    }

    // ── Overage cap check — notify if cap about to be hit ─────────────
    if (org.overageCapCents && org.overageCapCents > 0 && ownerEmail) {
      if (costCents >= org.overageCapCents) {
        sendOverageCapHitEmail(ownerEmail, ownerName, {
          capDollars: org.overageCapCents / 100,
          planName: plan.name,
        }).catch((e) => log.error("Failed to send overage cap email:", e));
      }
    }

    // ── Report to Stripe metered billing ──────────────────────────────
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

  if (org.stripeCustomerId) return org.stripeCustomerId;

  const ownerEmail = org.users[0]?.email || "unknown@example.com";
  const customer = await createStripeCustomer(ownerEmail, org.name, {
    organizationId: orgId,
  });

  await db.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Handle successful subscription — set plan and clear trial expiry
 */
export async function handleSubscriptionCreated(
  subscriptionId: string,
  customerId: string,
  priceId: string
): Promise<void> {
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!org) {
    log.error("Organization not found for customer:", customerId);
    return;
  }

  let planId = "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID || priceId === process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID) {
    planId = "professional";
  } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID || priceId === process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID) {
    planId = "business";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID) {
    planId = "enterprise";
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      planId,
      trialExpiresAt: null, // Clear trial expiry on paid upgrade
    },
  });

  log.info(`Organization ${org.id} upgraded to ${planId}`);
}

/**
 * Handle subscription cancellation — downgrade to free-trial
 */
export async function handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
  const org = await db.organization.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!org) {
    log.error("Organization not found for subscription:", subscriptionId);
    return;
  }

  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: null,
      planId: "free-trial",
      trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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

  let planId = "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID || priceId === process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID) {
    planId = "professional";
  } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID || priceId === process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID) {
    planId = "business";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID) {
    planId = "enterprise";
  }

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

  if (!org?.stripeCustomerId) return [];

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

/**
 * Ensure trialExpiresAt is set for a new free-trial org (call on first signup)
 */
export async function ensureTrialExpiry(orgId: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planId: true, trialExpiresAt: true },
  });

  if (!org || org.planId !== "free-trial" || org.trialExpiresAt) return;

  await db.organization.update({
    where: { id: orgId },
    data: { trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
}
