import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("Billing");
import {
  createCheckoutSession,
  createBillingPortalSession,
  createStripeCustomer,
  getSubscription,
  getPaymentMethods,
  getInvoices,
  getUpcomingInvoice,
  getStripePrice,
  stripe,
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
        paymentFailedAt: true,
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
      paymentFailed: !!org.paymentFailedAt,
    };
  }),

  // Get usage for current billing period
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        planId: true,
        settings: true,
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

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

    // Burn rate projection
    const avgMinutesPerDay = daysElapsed > 0 ? totalMinutes / daysElapsed : 0;
    let daysUntilLimit: number | null = null;
    if (plan.minutesPerMonth !== -1 && avgMinutesPerDay > 0) {
      const remainingMinutes = plan.minutesPerMonth - totalMinutes;
      daysUntilLimit = remainingMinutes <= 0 ? 0 : Math.ceil(remainingMinutes / avgMinutesPerDay);
    }

    // Usage alert threshold from settings
    const settings = (org.settings as Record<string, unknown>) || {};
    const alertThreshold = typeof settings.usageAlertThreshold === "number"
      ? settings.usageAlertThreshold
      : 80;

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
      alertThreshold,
      burnRate: {
        avgMinutesPerDay: Math.round(avgMinutesPerDay),
        daysUntilLimit,
        daysRemainingInPeriod: daysRemaining,
      },
    };
  }),

  // Set usage alert threshold
  setUsageAlertThreshold: adminProcedure
    .input(z.object({ threshold: z.number().int().min(50).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { settings: true },
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const settings = (org.settings as Record<string, unknown>) || {};
      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: { settings: { ...settings, usageAlertThreshold: input.threshold } },
      });

      log.info(`Org ${ctx.orgId} usage alert threshold set to ${input.threshold}%`);
      return { success: true };
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
        billing: z.enum(["monthly", "annual"]).default("monthly"),
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

      const plan = PLANS[input.planId as keyof typeof PLANS];
      if (!plan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid plan selected",
        });
      }

      // Pick annual priceId if requested and available, else fall back to monthly
      let priceId: string | null | undefined = plan.priceId;
      if (input.billing === "annual" && "annualPriceId" in plan && plan.annualPriceId) {
        priceId = plan.annualPriceId;
      }

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid plan selected",
        });
      }

      // Ensure a valid Stripe customer exists
      let customerId = org.stripeCustomerId;

      if (customerId) {
        // Verify the stored customer still exists in Stripe
        try {
          await stripe.customers.retrieve(customerId);
        } catch {
          log.warn(`Stale Stripe customer ${customerId} for org ${org.id}, will create new one`);
          customerId = null;
        }
      }

      if (!customerId) {
        const user = await ctx.db.user.findFirst({
          where: { clerkId: ctx.userId },
          select: { email: true, name: true },
        });

        const customer = await createStripeCustomer(
          user?.email || "",
          org.name,
          { organizationId: org.id }
        );
        customerId = customer.id;

        await ctx.db.organization.update({
          where: { id: org.id },
          data: { stripeCustomerId: customerId },
        });
        log.info(`Created Stripe customer ${customerId} for org ${org.id}`);
      }

      const session = await createCheckoutSession(
        customerId,
        priceId,
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

  // Get available plans with live prices from Stripe
  getPlans: protectedProcedure.query(async () => {
    const plans = Object.values(PLANS);

    const plansWithPrices = await Promise.all(
      plans.map(async (plan) => {
        let monthlyPrice: number | null = plan.price as number | null;
        let annualPrice: number | null = ("annualPrice" in plan ? plan.annualPrice : null) as number | null;

        // Fetch live monthly price from Stripe
        if (plan.priceId) {
          try {
            const stripePrice = await getStripePrice(plan.priceId);
            monthlyPrice = Math.round(stripePrice.unitAmount / 100);
          } catch (err) {
            log.error(`Failed to fetch monthly price for plan ${plan.id}:`, err);
          }
        }

        // Fetch live annual price from Stripe if available
        if ("annualPriceId" in plan && plan.annualPriceId) {
          try {
            const stripeAnnual = await getStripePrice(plan.annualPriceId);
            // Annual price in Stripe is the yearly total; convert to monthly equivalent
            annualPrice = Math.round(stripeAnnual.unitAmount / 100 / 12);
          } catch (err) {
            log.error(`Failed to fetch annual price for plan ${plan.id}:`, err);
          }
        }

        return {
          ...plan,
          price: monthlyPrice,
          annualPrice,
          annualPriceId: "annualPriceId" in plan ? plan.annualPriceId : null,
        };
      })
    );

    return plansWithPrices;
  }),
});
