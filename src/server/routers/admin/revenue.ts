import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";
import { TRPCError } from "@trpc/server";

export const revenueRouter = router({
  getMRR: superAdminProcedure.query(async () => {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

      let mrr = 0;
      let arr = 0;
      let totalCustomers = 0;

      const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
      for (const sub of subs.data) {
        const price = sub.items.data[0]?.price;
        if (!price) continue;
        const amount = price.unit_amount ?? 0;
        if (price.recurring?.interval === "year") {
          mrr += amount / 12 / 100;
        } else {
          mrr += amount / 100;
        }
        totalCustomers++;
      }
      arr = mrr * 12;
      const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;

      return { mrr, arr, arpu, totalPaidCustomers: totalCustomers };
    } catch {
      return { mrr: 0, arr: 0, arpu: 0, totalPaidCustomers: 0 };
    }
  }),

  getPaymentFailures: superAdminProcedure.query(async ({ ctx }) => {
    const orgs = await ctx.db.organization.findMany({
      where: { paymentFailedAt: { not: null } },
      select: {
        id: true,
        name: true,
        planId: true,
        paymentFailedAt: true,
        stripeCustomerId: true,
      },
      orderBy: { paymentFailedAt: "desc" },
    });
    return orgs;
  }),

  getRevenueByMonth: superAdminProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(12) }))
    .query(async ({ ctx }) => {
      // Use DB subscription data as approximation
      const now = new Date();
      const months: { month: string; revenue: number; subs: number }[] = [];

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const count = await ctx.db.organization.count({
          where: {
            stripeSubscriptionId: { not: null },
            createdAt: { lte: end },
          },
        });
        months.unshift({
          month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          revenue: count * 99, // placeholder ARPU
          subs: count,
        });
      }
      return months;
    }),

  getChurnMetrics: superAdminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Orgs that had a subscription and no longer have one (cancelled)
    const churnedThisMonth = await ctx.db.organization.count({
      where: {
        stripeSubscriptionId: null,
        paymentFailedAt: { gte: thirtyDaysAgo },
      },
    });

    const totalPaid = await ctx.db.organization.count({
      where: { stripeSubscriptionId: { not: null } },
    });

    const churnRate = totalPaid > 0 ? (churnedThisMonth / totalPaid) * 100 : 0;

    return { churnedThisMonth, totalPaid, churnRate: Math.round(churnRate * 10) / 10 };
  }),
});
