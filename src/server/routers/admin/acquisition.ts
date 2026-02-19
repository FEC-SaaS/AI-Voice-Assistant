import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const acquisitionRouter = router({
  getSignupTrend: superAdminProcedure
    .input(z.object({ days: z.number().int().min(7).max(180).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const rows = await ctx.db.$queryRaw<{ day: string; count: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM "Organization"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `;
      return rows;
    }),

  getSignupsBySource: superAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.organization.groupBy({
      by: ["referralSource"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    return rows.map((r) => ({
      source: r.referralSource || "direct",
      count: r._count.id,
    }));
  }),

  getRecentSignups: superAdminProcedure
    .input(z.object({ limit: z.number().int().min(5).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          name: true,
          planId: true,
          referralSource: true,
          onboardingComplete: true,
          createdAt: true,
          _count: { select: { users: true, calls: true } },
        },
      });
    }),

  getOnboardingFunnel: superAdminProcedure.query(async ({ ctx }) => {
    const [total, withAgent, withCampaign, withCall, completed] = await Promise.all([
      ctx.db.organization.count(),
      ctx.db.organization.count({ where: { agents: { some: {} } } }),
      ctx.db.organization.count({ where: { campaigns: { some: {} } } }),
      ctx.db.organization.count({ where: { calls: { some: {} } } }),
      ctx.db.organization.count({ where: { onboardingComplete: true } }),
    ]);

    return [
      { step: "Signed Up", count: total, pct: 100 },
      { step: "Created Agent", count: withAgent, pct: total > 0 ? Math.round((withAgent / total) * 100) : 0 },
      { step: "Created Campaign", count: withCampaign, pct: total > 0 ? Math.round((withCampaign / total) * 100) : 0 },
      { step: "Made First Call", count: withCall, pct: total > 0 ? Math.round((withCall / total) * 100) : 0 },
      { step: "Onboarding Complete", count: completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 },
    ];
  }),

  getTimeToFirstCall: superAdminProcedure.query(async ({ ctx }) => {
    // Average hours from org creation to first call
    const rows = await ctx.db.$queryRaw<{ avg_hours: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (first_call.min_created - o."createdAt")) / 3600)::float AS avg_hours
      FROM "Organization" o
      JOIN (
        SELECT "organizationId", MIN("createdAt") AS min_created FROM "Call" GROUP BY "organizationId"
      ) first_call ON first_call."organizationId" = o."id"
    `;
    return { avgHoursToFirstCall: Math.round((rows[0]?.avg_hours || 0) * 10) / 10 };
  }),

  getStuckAccounts: superAdminProcedure.query(async ({ ctx }) => {
    // Orgs that signed up >3 days ago but have no calls
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return ctx.db.organization.findMany({
      where: {
        createdAt: { lte: threeDaysAgo },
        onboardingComplete: false,
        calls: { none: {} },
      },
      select: { id: true, name: true, planId: true, createdAt: true, onboardingComplete: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});
