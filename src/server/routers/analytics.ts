import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getCallTrends,
  getHourlyDistribution,
  getCampaignPerformance,
} from "../services/analytics.service";
import { format, startOfWeek, startOfMonth } from "date-fns";

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

      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
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
        dailyData.set(key, (dailyData.get(key) || 0) + 1);
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

  // Get call trends over time (line chart data)
  getCallTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      return getCallTrends(ctx.orgId, input.days);
    }),

  // Get hourly call distribution
  getHourlyDistribution: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      return getHourlyDistribution(ctx.orgId, input.days);
    }),

  // Export analytics data as CSV
  exportData: protectedProcedure
    .input(
      z.object({
        type: z.enum(["calls", "agents", "campaigns"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, startDate, endDate } = input;

      if (type === "calls") {
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

        const calls = await ctx.db.call.findMany({
          where: { organizationId: ctx.orgId, ...dateFilter },
          include: {
            agent: { select: { name: true } },
            contact: { select: { firstName: true, lastName: true, phoneNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const header = "Date,Agent,Contact,Phone,Status,Duration (s),Sentiment,Lead Score";
        const rows = calls.map((call) => {
          const contactName = call.contact
            ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim()
            : "";
          return [
            format(call.createdAt, "yyyy-MM-dd HH:mm"),
            (call.agent?.name || "").replace(/,/g, ";"),
            contactName.replace(/,/g, ";"),
            call.contact?.phoneNumber || "",
            call.status || "",
            call.durationSeconds || 0,
            call.sentiment || "",
            call.leadScore ?? "",
          ].join(",");
        });

        return { csv: [header, ...rows].join("\n"), filename: "calls-export.csv" };
      }

      if (type === "agents") {
        const agents = await ctx.db.agent.findMany({
          where: { organizationId: ctx.orgId },
          include: {
            _count: { select: { calls: true } },
            calls: {
              select: { status: true, durationSeconds: true, sentiment: true },
            },
          },
        });

        const header = "Agent,Total Calls,Completed,Success Rate,Total Minutes,Positive,Neutral,Negative";
        const rows = agents.map((agent) => {
          const completed = agent.calls.filter((c) => c.status === "completed").length;
          const minutes = Math.round(agent.calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / 60);
          const pos = agent.calls.filter((c) => c.sentiment === "positive").length;
          const neu = agent.calls.filter((c) => c.sentiment === "neutral").length;
          const neg = agent.calls.filter((c) => c.sentiment === "negative").length;
          const rate = agent._count.calls > 0 ? Math.round((completed / agent._count.calls) * 100) : 0;

          return [
            agent.name.replace(/,/g, ";"),
            agent._count.calls,
            completed,
            `${rate}%`,
            minutes,
            pos,
            neu,
            neg,
          ].join(",");
        });

        return { csv: [header, ...rows].join("\n"), filename: "agents-export.csv" };
      }

      // campaigns
      const campaigns = await getCampaignPerformance(ctx.orgId);
      const header = "Campaign,Status,Total Contacts,Contacted,Completed,Conversion Rate";
      const rows = campaigns.map((c) =>
        [
          c.campaignName.replace(/,/g, ";"),
          c.status,
          c.totalContacts,
          c.contacted,
          c.completed,
          `${c.conversionRate}%`,
        ].join(",")
      );

      return { csv: [header, ...rows].join("\n"), filename: "campaigns-export.csv" };
    }),

  // Run custom report
  runCustomReport: protectedProcedure
    .input(
      z.object({
        groupBy: z.enum(["agent", "campaign", "day", "week", "month"]),
        metrics: z.array(
          z.enum(["calls", "minutes", "successRate", "sentimentBreakdown", "leadScoreAvg"])
        ).min(1),
        filters: z.object({
          agentIds: z.array(z.string()).optional(),
          campaignIds: z.array(z.string()).optional(),
          statuses: z.array(z.string()).optional(),
          sentiments: z.array(z.string()).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupBy, metrics, filters } = input;

      // Build where clause
      const where: Record<string, unknown> = { organizationId: ctx.orgId };
      if (filters?.agentIds?.length) where.agentId = { in: filters.agentIds };
      if (filters?.campaignIds?.length) where.campaignId = { in: filters.campaignIds };
      if (filters?.statuses?.length) where.status = { in: filters.statuses };
      if (filters?.sentiments?.length) where.sentiment = { in: filters.sentiments };
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        };
      }

      const calls = await ctx.db.call.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
          durationSeconds: true,
          sentiment: true,
          leadScore: true,
          agentId: true,
          campaignId: true,
          agent: { select: { name: true } },
          campaign: { select: { name: true } },
        },
      });

      // Group calls
      const groups = new Map<string, typeof calls>();
      for (const call of calls) {
        let key: string;
        switch (groupBy) {
          case "agent":
            key = call.agent?.name || "Unassigned";
            break;
          case "campaign":
            key = call.campaign?.name || "No Campaign";
            break;
          case "day":
            key = format(call.createdAt, "yyyy-MM-dd");
            break;
          case "week":
            key = format(startOfWeek(call.createdAt, { weekStartsOn: 1 }), "yyyy-MM-dd");
            break;
          case "month":
            key = format(startOfMonth(call.createdAt), "yyyy-MM");
            break;
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(call);
      }

      // Compute metrics per group
      const rows = Array.from(groups.entries()).map(([groupLabel, groupCalls]) => {
        const row: Record<string, unknown> = { groupLabel };

        if (metrics.includes("calls")) {
          row.calls = groupCalls.length;
        }
        if (metrics.includes("minutes")) {
          row.minutes = Math.round(
            groupCalls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / 60
          );
        }
        if (metrics.includes("successRate")) {
          const completed = groupCalls.filter((c) => c.status === "completed").length;
          row.successRate = groupCalls.length > 0
            ? Math.round((completed / groupCalls.length) * 100)
            : 0;
        }
        if (metrics.includes("sentimentBreakdown")) {
          row.positive = groupCalls.filter((c) => c.sentiment === "positive").length;
          row.neutral = groupCalls.filter((c) => c.sentiment === "neutral").length;
          row.negative = groupCalls.filter((c) => c.sentiment === "negative").length;
        }
        if (metrics.includes("leadScoreAvg")) {
          const scored = groupCalls.filter((c) => c.leadScore != null);
          row.leadScoreAvg = scored.length > 0
            ? Math.round(scored.reduce((sum, c) => sum + (c.leadScore || 0), 0) / scored.length)
            : 0;
        }

        return row;
      });

      // Sort rows
      rows.sort((a, b) => String(a.groupLabel).localeCompare(String(b.groupLabel)));

      // Summary totals
      const summary: Record<string, unknown> = {};
      if (metrics.includes("calls")) {
        summary.calls = calls.length;
      }
      if (metrics.includes("minutes")) {
        summary.minutes = Math.round(
          calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / 60
        );
      }
      if (metrics.includes("successRate")) {
        const completed = calls.filter((c) => c.status === "completed").length;
        summary.successRate = calls.length > 0
          ? Math.round((completed / calls.length) * 100)
          : 0;
      }
      if (metrics.includes("sentimentBreakdown")) {
        summary.positive = calls.filter((c) => c.sentiment === "positive").length;
        summary.neutral = calls.filter((c) => c.sentiment === "neutral").length;
        summary.negative = calls.filter((c) => c.sentiment === "negative").length;
      }
      if (metrics.includes("leadScoreAvg")) {
        const scored = calls.filter((c) => c.leadScore != null);
        summary.leadScoreAvg = scored.length > 0
          ? Math.round(scored.reduce((sum, c) => sum + (c.leadScore || 0), 0) / scored.length)
          : 0;
      }

      return { rows, summary };
    }),

  // Get filter options for report builder
  getReportFilterOptions: protectedProcedure.query(async ({ ctx }) => {
    const [agents, campaigns] = await Promise.all([
      ctx.db.agent.findMany({
        where: { organizationId: ctx.orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      ctx.db.campaign.findMany({
        where: { organizationId: ctx.orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      agents: agents.map((a) => ({ value: a.id, label: a.name })),
      campaigns: campaigns.map((c) => ({ value: c.id, label: c.name })),
      statuses: [
        { value: "queued", label: "Queued" },
        { value: "ringing", label: "Ringing" },
        { value: "in-progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "no-answer", label: "No Answer" },
      ],
      sentiments: [
        { value: "positive", label: "Positive" },
        { value: "neutral", label: "Neutral" },
        { value: "negative", label: "Negative" },
      ],
    };
  }),
});
