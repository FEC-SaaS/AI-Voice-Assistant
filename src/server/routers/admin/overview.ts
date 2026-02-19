import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const overviewRouter = router({
  getCommandCenter: superAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Core counts — always available
    const [
      totalOrgs,
      newOrgsLast30,
      totalUsers,
      totalCallsAllTime,
      callsLast7Days,
      callsToday,
      planDistribution,
      recentSignups,
    ] = await Promise.all([
      db.organization.count(),
      db.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.user.count(),
      db.call.count(),
      db.call.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.call.count({ where: { createdAt: { gte: startOfToday } } }),
      db.organization.groupBy({
        by: ["planId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      db.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, planId: true, createdAt: true },
      }),
    ]);

    // These use columns that may not exist yet if db push hasn't run
    const [activeOrgs, suspendedOrgs, paymentFailures] = await Promise.all([
      db.organization.count({ where: { suspendedAt: null } }).catch(() => totalOrgs),
      db.organization.count({ where: { suspendedAt: { not: null } } }).catch(() => 0),
      db.organization.count({ where: { paymentFailedAt: { not: null } } }).catch(() => 0),
    ]);

    const signupsByDay = await db.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "Organization"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY day
      ORDER BY day ASC
    `.catch(() => [] as { day: string; count: number }[]);

    const callsByDay = await db.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "Call"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY day
      ORDER BY day ASC
    `.catch(() => [] as { day: string; count: number }[]);

    return {
      kpis: {
        totalOrgs,
        activeOrgs,
        newOrgsLast30,
        totalUsers,
        totalCallsAllTime,
        callsLast7Days,
        callsToday,
        suspendedOrgs,
        paymentFailures,
      },
      planDistribution: planDistribution.map((p) => ({
        planId: p.planId,
        count: p._count.id,
      })),
      recentSignups,
      signupsByDay,
      callsByDay,
    };
  }),
});
