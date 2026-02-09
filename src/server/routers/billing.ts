import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("Billing");
import {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  getPaymentMethods,
  getInvoices,
  getUpcomingInvoice,
} from "@/lib/stripe";
import { PLANS, getPlan, OVERAGE_RATE_CENTS } from "@/constants/plans";

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
        log.error("Error fetching subscription:", error);
      }
    }

    return {
      plan,
      subscription: subscriptionStatus,
      hasStripeCustomer: !!org.stripeCustomerId,
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

    const [minutesUsed, overageCosts] = await Promise.all([
      ctx.db.call.aggregate({
        where: {
          organizationId: ctx.orgId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { durationSeconds: true },
      }),
      ctx.db.call.aggregate({
        where: {
          organizationId: ctx.orgId,
          createdAt: { gte: startOfMonth },
          costCents: { gt: 0 },
        },
        _sum: { costCents: true },
      }),
    ]);

    const plan = getPlan(org.planId);
    const totalMinutes = Math.round((minutesUsed._sum.durationSeconds || 0) / 60);
    const overageMinutes = plan.minutesPerMonth === -1
      ? 0
      : Math.max(0, totalMinutes - plan.minutesPerMonth);

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
        used: totalMinutes,
        limit: plan.minutesPerMonth,
      },
      overage: {
        minutes: overageMinutes,
        costCents: overageCosts._sum.costCents || 0,
        ratePerMinuteCents: OVERAGE_RATE_CENTS,
      },
    };
  }),

  // Get payment methods on file
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
      return [];
    }

    try {
      const methods = await getPaymentMethods(org.stripeCustomerId);
      return methods.map((m) => ({
        id: m.id,
        type: m.type,
        card: m.card
          ? {
              brand: m.card.brand,
              last4: m.card.last4,
              expMonth: m.card.exp_month,
              expYear: m.card.exp_year,
            }
          : null,
        paypal: m.paypal
          ? { payerEmail: m.paypal.payer_email }
          : null,
        isDefault: false,
      }));
    } catch (error) {
      log.error("Error fetching payment methods:", error);
      return [];
    }
  }),

  // Get billing history (invoices)
  getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
      return [];
    }

    try {
      const invoices = await getInvoices(org.stripeCustomerId);
      return invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency?.toUpperCase() || "USD",
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
      }));
    } catch (error) {
      log.error("Error fetching invoices:", error);
      return [];
    }
  }),

  // Get upcoming invoice estimate (includes metered overage)
  getUpcomingInvoice: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
      return null;
    }

    try {
      const invoice = await getUpcomingInvoice(org.stripeCustomerId);
      if (!invoice) return null;

      return {
        amountDue: invoice.amount_due / 100,
        subtotal: invoice.subtotal / 100,
        tax: (invoice.tax || 0) / 100,
        total: invoice.total / 100,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        lines: invoice.lines.data.map((line) => ({
          description: line.description,
          amount: line.amount / 100,
          quantity: line.quantity,
        })),
      };
    } catch (error) {
      log.error("Error fetching upcoming invoice:", error);
      return null;
    }
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
