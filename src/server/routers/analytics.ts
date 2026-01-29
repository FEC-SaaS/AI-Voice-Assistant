import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const analyticsRouter = router({
  // Get dashboard overview stats
  getOverview: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const dateFilter = {
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const [
        totalAgents,
        activeAgents,
        totalCampaigns,
        activeCampaigns,
        totalCalls,
        completedCalls,
        totalMinutes,
        avgCallDuration,
      ] = await Promise.all([
        ctx.db.agent.count({ where: { organizationId: ctx.orgId } }),
        ctx.db.agent.count({ where: { organizationId: ctx.orgId, isActive: true } }),
        ctx.db.campaign.count({ where: { organizationId: ctx.orgId } }),
        ctx.db.campaign.count({ where: { organizationId: ctx.orgId, status: "running" } }),
        ctx.db.call.count({ where: { organizationId: ctx.orgId, ...dateFilter } }),
        ctx.db.call.count({
          where: { organizationId: ctx.orgId, status: "completed", ...dateFilter },
        }),
        ctx.db.call.aggregate({
          where: { organizationId: ctx.orgId, ...dateFilter },
          _sum: { durationSeconds: true },
        }),
        ctx.db.call.aggregate({
          where: { organizationId: ctx.orgId, status: "completed", ...dateFilter },
          _avg: { durationSeconds: true },
        }),
      ]);

      return {
        agents: {
          total: totalAgents,
          active: activeAgents,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        calls: {
          total: totalCalls,
          completed: completedCalls,
          successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
        },
        minutes: {
          total: Math.round((totalMinutes._sum.durationSeconds || 0) / 60),
          avgPerCall: Math.round((avgCallDuration._avg.durationSeconds || 0) / 60 * 10) / 10,
        },
      };
    }),

  // Get calls by day for chart
  getCallsByDay: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const calls = await ctx.db.call.groupBy({
        by: ["createdAt"],
        where: {
          organizationId: ctx.orgId,
          createdAt: { gte: startDate },
        },
        _count: true,
      });

      // Aggregate by day
      const dailyData = new Map<string, number>();

      for (let i = 0; i < input.days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split("T")[0] || "";
        dailyData.set(key, 0);
      }

      calls.forEach((call) => {
        const key = call.createdAt.toISOString().split("T")[0] || "";
        dailyData.set(key, (dailyData.get(key) || 0) + call._count);
      });

      return Array.from(dailyData.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }),

  // Get agent performance
  getAgentPerformance: protectedProcedure.query(async ({ ctx }) => {
    const agents = await ctx.db.agent.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        _count: {
          select: { calls: true },
        },
        calls: {
          select: {
            status: true,
            durationSeconds: true,
            sentiment: true,
          },
        },
      },
    });

    return agents.map((agent) => {
      const completedCalls = agent.calls.filter((c) => c.status === "completed");
      const totalMinutes = agent.calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / 60;
      const sentimentCounts = {
        positive: agent.calls.filter((c) => c.sentiment === "positive").length,
        neutral: agent.calls.filter((c) => c.sentiment === "neutral").length,
        negative: agent.calls.filter((c) => c.sentiment === "negative").length,
      };

      return {
        id: agent.id,
        name: agent.name,
        totalCalls: agent._count.calls,
        completedCalls: completedCalls.length,
        successRate:
          agent._count.calls > 0
            ? Math.round((completedCalls.length / agent._count.calls) * 100)
            : 0,
        totalMinutes: Math.round(totalMinutes),
        sentimentCounts,
      };
    });
  }),

  // Get sentiment breakdown
  getSentimentBreakdown: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const sentiment = await ctx.db.call.groupBy({
        by: ["sentiment"],
        where: {
          organizationId: ctx.orgId,
          sentiment: { not: null },
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: startDate }),
                  ...(endDate && { lte: endDate }),
                },
              }
            : {}),
        },
        _count: true,
      });

      return sentiment.map((s) => ({
        sentiment: s.sentiment,
        count: s._count,
      }));
    }),
});
