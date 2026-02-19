import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const adminCallsRouter = router({
  getPlatformCallStats: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, today, last7, last30, statusDist, totalDuration, avgDuration] = await Promise.all([
      ctx.db.call.count(),
      ctx.db.call.count({ where: { createdAt: { gte: startOfToday } } }),
      ctx.db.call.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ctx.db.call.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.call.groupBy({
        by: ["status"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      ctx.db.call.aggregate({ _sum: { durationSeconds: true } }),
      ctx.db.call.aggregate({ _avg: { durationSeconds: true } }),
    ]);

    return {
      total,
      today,
      last7,
      last30,
      totalMinutes: Math.round((totalDuration._sum.durationSeconds || 0) / 60),
      avgDurationSeconds: Math.round(avgDuration._avg.durationSeconds || 0),
      statusBreakdown: statusDist.map((s) => ({ status: s.status || "unknown", count: s._count.id })),
    };
  }),

  getCallsByDay: superAdminProcedure
    .input(z.object({ days: z.number().int().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const rows = await ctx.db.$queryRaw<{ day: string; count: number; minutes: number }[]>`
        SELECT
          DATE_TRUNC('day', "createdAt") AS day,
          COUNT(*)::int AS count,
          COALESCE(SUM("durationSeconds"), 0)::int / 60 AS minutes
        FROM "Call"
        WHERE "createdAt" >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `;
      return rows;
    }),

  getCallsByHour: superAdminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await ctx.db.$queryRaw<{ hour: number; count: number }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::int AS count
      FROM "Call"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY hour
      ORDER BY hour ASC
    `;
    return rows;
  }),

  getTopOrgsByCallVolume: superAdminProcedure
    .input(z.object({ limit: z.number().int().min(5).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.$queryRaw<{ orgId: string; orgName: string; count: number; minutes: number }[]>`
        SELECT
          o."id" AS "orgId",
          o."name" AS "orgName",
          COUNT(c."id")::int AS count,
          COALESCE(SUM(c."durationSeconds"), 0)::int / 60 AS minutes
        FROM "Call" c
        JOIN "Organization" o ON o."id" = c."organizationId"
        GROUP BY o."id", o."name"
        ORDER BY count DESC
        LIMIT ${input.limit}
      `;
      return rows;
    }),
});
