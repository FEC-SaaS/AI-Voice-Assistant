import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const engagementRouter = router({
  getDAUMAU: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Proxy: orgs that made a call today (DAU) vs last 30 days (MAU)
    const [dau, mau] = await Promise.all([
      ctx.db.organization.count({ where: { calls: { some: { createdAt: { gte: startOfToday } } } } }),
      ctx.db.organization.count({ where: { calls: { some: { createdAt: { gte: thirtyDaysAgo } } } } }),
    ]);

    // DAU/MAU trend last 30 days
    const trend: { day: string; dau: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await ctx.db.organization.count({
        where: { calls: { some: { createdAt: { gte: dayStart, lt: dayEnd } } } },
      });
      trend.push({ day: dayStart.toISOString().slice(0, 10), dau: count });
    }

    return { dau, mau, ratio: mau > 0 ? Math.round((dau / mau) * 100) / 100 : 0, trend };
  }),

  getDormantOrgs: superAdminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // suspendedAt may not exist if schema hasn't been pushed — fall back without that filter
    const orgs = await ctx.db.organization.findMany({
      where: {
        suspendedAt: null,
        calls: { none: { createdAt: { gte: thirtyDaysAgo } } },
        agents: { some: {} },
      },
      select: {
        id: true, name: true, planId: true, createdAt: true,
        _count: { select: { calls: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }).catch(() =>
      ctx.db.organization.findMany({
        where: {
          calls: { none: { createdAt: { gte: thirtyDaysAgo } } },
          agents: { some: {} },
        },
        select: {
          id: true, name: true, planId: true, createdAt: true,
          _count: { select: { calls: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      })
    );
    return orgs;
  }),

  getAtRiskOrgs: superAdminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Paid orgs with payment failure OR no calls in 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const orgs = await ctx.db.organization.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        OR: [
          { paymentFailedAt: { not: null } },
          { calls: { none: { createdAt: { gte: fourteenDaysAgo } } } },
        ],
      },
      select: {
        id: true, name: true, planId: true, paymentFailedAt: true, createdAt: true,
        _count: { select: { calls: true } },
      },
      orderBy: { paymentFailedAt: "desc" },
      take: 50,
    });
    return orgs;
  }),

  getCohortRetention: superAdminProcedure.query(async ({ ctx }) => {
    // 6-month cohort retention: % of orgs from each month that still made calls
    const now = new Date();
    const cohorts: {
      cohort: string;
      size: number;
      m1: number;
      m2: number;
      m3: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const cohortOrgs = await ctx.db.organization.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true },
      });
      const size = cohortOrgs.length;
      if (size === 0) {
        cohorts.push({ cohort: cohortStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), size: 0, m1: 0, m2: 0, m3: 0 });
        continue;
      }

      const ids = cohortOrgs.map((o) => o.id);

      const m1Start = new Date(cohortEnd);
      const m1End = new Date(cohortEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      const m2End = new Date(cohortEnd.getTime() + 60 * 24 * 60 * 60 * 1000);
      const m3End = new Date(cohortEnd.getTime() + 90 * 24 * 60 * 60 * 1000);

      const [r1, r2, r3] = await Promise.all([
        ctx.db.organization.count({ where: { id: { in: ids }, calls: { some: { createdAt: { gte: m1Start, lt: m1End } } } } }),
        ctx.db.organization.count({ where: { id: { in: ids }, calls: { some: { createdAt: { gte: m1End, lt: m2End } } } } }),
        ctx.db.organization.count({ where: { id: { in: ids }, calls: { some: { createdAt: { gte: m2End, lt: m3End } } } } }),
      ]);

      cohorts.push({
        cohort: cohortStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        size,
        m1: Math.round((r1 / size) * 100),
        m2: Math.round((r2 / size) * 100),
        m3: Math.round((r3 / size) * 100),
      });
    }
    return cohorts;
  }),
});
