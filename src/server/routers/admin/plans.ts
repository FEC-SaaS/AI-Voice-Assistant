import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const plansRouter = router({
  getPlanDistribution: superAdminProcedure.query(async ({ ctx }) => {
    const dist = await ctx.db.organization.groupBy({
      by: ["planId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    return dist.map((d) => ({ planId: d.planId, count: d._count.id }));
  }),

  getConversionFunnel: superAdminProcedure.query(async ({ ctx }) => {
    const [total, withAgent, withCampaign, withCall, paid] = await Promise.all([
      ctx.db.organization.count(),
      ctx.db.organization.count({ where: { agents: { some: {} } } }),
      ctx.db.organization.count({ where: { campaigns: { some: {} } } }),
      ctx.db.organization.count({ where: { calls: { some: {} } } }),
      ctx.db.organization.count({ where: { stripeSubscriptionId: { not: null } } }),
    ]);
    return [
      { step: "Signed Up", count: total },
      { step: "Created Agent", count: withAgent },
      { step: "Created Campaign", count: withCampaign },
      { step: "Made First Call", count: withCall },
      { step: "Converted to Paid", count: paid },
    ];
  }),

  getPlanTrend: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const result: { month: string; free: number; starter: number; professional: number; enterprise: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [free, starter, professional, enterprise] = await Promise.all([
        ctx.db.organization.count({ where: { planId: "free-trial", createdAt: { lte: end } } }),
        ctx.db.organization.count({ where: { planId: "starter", createdAt: { lte: end } } }),
        ctx.db.organization.count({ where: { planId: "professional", createdAt: { lte: end } } }),
        ctx.db.organization.count({ where: { planId: "enterprise", createdAt: { lte: end } } }),
      ]);

      result.push({
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        free,
        starter,
        professional,
        enterprise,
      });
    }
    return result;
  }),

  getExpiringTrials: superAdminProcedure.query(async ({ ctx }) => {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return ctx.db.organization.findMany({
      where: {
        trialExpiresAt: { lte: sevenDaysFromNow, gte: new Date() },
        stripeSubscriptionId: null,
      },
      select: { id: true, name: true, planId: true, trialExpiresAt: true, createdAt: true },
      orderBy: { trialExpiresAt: "asc" },
    });
  }),
});
