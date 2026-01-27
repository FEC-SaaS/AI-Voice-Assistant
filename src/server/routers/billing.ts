import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
} from "@/lib/stripe";
import { PLANS, getPlan } from "@/constants/plans";

export const billingRouter = router({
  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        planId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const plan = getPlan(org.planId);
    let subscriptionStatus = null;

    if (org.stripeSubscriptionId) {
      try {
        const subscription = await getSubscription(org.stripeSubscriptionId);
        subscriptionStatus = {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    }

    return {
      plan,
      subscription: subscriptionStatus,
    };
  }),

  // Get usage for current billing period
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
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

    // Get total minutes used this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const minutesUsed = await ctx.db.call.aggregate({
      where: {
        organizationId: ctx.orgId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { durationSeconds: true },
    });

    const plan = getPlan(org.planId);

    return {
      agents: {
        used: org._count.agents,
        limit: plan.agents,
      },
      phoneNumbers: {
        used: org._count.phoneNumbers,
        limit: plan.phoneNumbers,
      },
      campaigns: {
        used: org._count.campaigns,
        limit: plan.campaigns,
      },
      minutes: {
        used: Math.round((minutesUsed._sum.durationSeconds || 0) / 60),
        limit: plan.minutesPerMonth,
      },
    };
  }),

  // Create checkout session for upgrade
  createCheckout: adminProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      if (!org.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe customer found. Please contact support.",
        });
      }

      const plan = PLANS[input.planId as keyof typeof PLANS];
      if (!plan || !plan.priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid plan selected",
        });
      }

      const session = await createCheckoutSession(
        org.stripeCustomerId,
        plan.priceId,
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`
      );

      return { url: session.url };
    }),

  // Create billing portal session
  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
    });

    if (!org || !org.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account found",
      });
    }

    const session = await createBillingPortalSession(
      org.stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`
    );

    return { url: session.url };
  }),

  // Get available plans
  getPlans: protectedProcedure.query(() => {
    return Object.values(PLANS).filter((plan) => plan.id !== "enterprise");
  }),
});
