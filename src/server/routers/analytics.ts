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

  // Get agent performance — accepts optional date range
  getAgentPerformance: protectedProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const callsWhere =
        input?.startDate || input?.endDate
          ? {
              createdAt: {
                ...(input.startDate && { gte: input.startDate }),
                ...(input.endDate && { lte: input.endDate }),
              },
            }
          : undefined;

      const agents = await ctx.db.agent.findMany({
        where: { organizationId: ctx.orgId },
        include: {
          _count: {
            select: { calls: true },
          },
          calls: {
            where: callsWhere,
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
          totalCalls: agent.calls.length,
          completedCalls: completedCalls.length,
          successRate:
            agent.calls.length > 0
              ? Math.round((completedCalls.length / agent.calls.length) * 100)
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

  // ── NEW: Day-of-week distribution ──────────────────────────────────
  getDayOfWeekDistribution: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const calls = await ctx.db.call.findMany({
        where: { organizationId: ctx.orgId, createdAt: { gte: startDate } },
        select: { createdAt: true, status: true },
      });

      const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const data = DOW.map((day) => ({ day, calls: 0, completed: 0, successRate: 0 }));

      for (const call of calls) {
        const idx = call.createdAt.getDay();
        const entry = data[idx];
        if (!entry) continue;
        entry.calls++;
        if (call.status === "completed") entry.completed++;
      }

      return data.map((d) => ({
        ...d,
        successRate: d.calls > 0 ? Math.round((d.completed / d.calls) * 100) : 0,
      }));
    }),

  // ── NEW: Lead score distribution histogram ──────────────────────────
  getLeadScoreDistribution: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          leadScore: { not: null },
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: startDate }),
                  ...(endDate && { lte: endDate }),
                },
              }
            : {}),
        },
        select: { leadScore: true },
      });

      const buckets = [
        { range: "Cold (0–20)", min: 0, max: 20, count: 0, color: "#ef4444" },
        { range: "Warm (21–40)", min: 21, max: 40, count: 0, color: "#f97316" },
        { range: "Interested (41–60)", min: 41, max: 60, count: 0, color: "#eab308" },
        { range: "Hot (61–80)", min: 61, max: 80, count: 0, color: "#22c55e" },
        { range: "Very Hot (81–100)", min: 81, max: 100, count: 0, color: "#3b82f6" },
      ];

      for (const call of calls) {
        const score = call.leadScore ?? 0;
        const bucket = buckets.find((b) => score >= b.min && score <= b.max);
        if (bucket) bucket.count++;
      }

      return buckets;
    }),

  // ── NEW: Campaign ROI / cost vs outcomes ───────────────────────────
  getCampaignROI: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      const callDateFilter =
        startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {};

      const campaigns = await ctx.db.campaign.findMany({
        where: { organizationId: ctx.orgId },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { contacts: true } },
          calls: {
            where: callDateFilter,
            select: { status: true, durationSeconds: true, costCents: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return campaigns
        .filter((c) => c.calls.length > 0)
        .map((campaign) => {
          const calls = campaign.calls;
          const completed = calls.filter((c) => c.status === "completed").length;
          const totalMinutes = Math.round(
            calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / 60
          );
          const totalCostCents = calls.reduce((s, c) => s + c.costCents, 0);
          const conversionRate =
            calls.length > 0 ? Math.round((completed / calls.length) * 100) : 0;
          const shortName =
            campaign.name.length > 20
              ? campaign.name.substring(0, 18) + "\u2026"
              : campaign.name;

          return {
            name: shortName,
            fullName: campaign.name,
            status: campaign.status,
            totalContacts: campaign._count.contacts,
            totalCalls: calls.length,
            completedCalls: completed,
            conversionRate,
            totalMinutes,
            totalCostDollars: parseFloat((totalCostCents / 100).toFixed(2)),
            costPerCompletion:
              completed > 0
                ? parseFloat((totalCostCents / completed / 100).toFixed(2))
                : 0,
          };
        });
    }),

  // ── NEW: Full-text transcript search ───────────────────────────────
  searchTranscripts: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(200),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          transcript: { contains: input.query, mode: "insensitive" },
        },
        select: {
          id: true,
          toNumber: true,
          fromNumber: true,
          createdAt: true,
          status: true,
          transcript: true,
          recordingUrl: true,
          agent: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return calls.map((call) => {
        const q = input.query.toLowerCase();
        const transcript = call.transcript ?? "";
        const idx = transcript.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 80);
        const end = Math.min(transcript.length, (idx >= 0 ? idx : 0) + 200);
        const raw = idx >= 0 ? transcript.substring(start, end) : transcript.substring(0, 240);
        const snippet = (start > 0 ? "\u2026" : "") + raw + (end < transcript.length ? "\u2026" : "");

        return {
          id: call.id,
          toNumber: call.toNumber,
          fromNumber: call.fromNumber,
          createdAt: call.createdAt,
          status: call.status,
          snippet,
          highlightWord: input.query,
          recordingUrl: call.recordingUrl,
          agentName: call.agent?.name ?? null,
          contactName: call.contact
            ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim() || null
            : null,
        };
      });
    }),

  // ── NEW: Comparison mode — agents or periods ────────────────────────
  getComparisonData: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["agents", "periods"]),
        agentAId: z.string().optional(),
        agentBId: z.string().optional(),
        periodADays: z.number().min(1).max(90).optional(),
        periodBDays: z.number().min(1).max(90).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      type EntityMetrics = {
        name: string;
        totalCalls: number;
        completedCalls: number;
        successRate: number;
        totalMinutes: number;
        positive: number;
        neutral: number;
        negative: number;
      };

      const toMetrics = (
        calls: Array<{ status: string | null; durationSeconds: number | null; sentiment: string | null }>,
        name: string
      ): EntityMetrics => {
        const total = calls.length;
        const completed = calls.filter((c) => c.status === "completed").length;
        return {
          name,
          totalCalls: total,
          completedCalls: completed,
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          totalMinutes: Math.round(
            calls.reduce((s, c) => s + (c.durationSeconds || 0), 0) / 60
          ),
          positive: calls.filter((c) => c.sentiment === "positive").length,
          neutral: calls.filter((c) => c.sentiment === "neutral").length,
          negative: calls.filter((c) => c.sentiment === "negative").length,
        };
      };

      if (input.mode === "agents") {
        const ids = [input.agentAId, input.agentBId].filter(Boolean) as string[];
        if (ids.length === 0) return { mode: "agents" as const, a: null, b: null };

        const agents = await ctx.db.agent.findMany({
          where: { id: { in: ids }, organizationId: ctx.orgId },
          select: {
            id: true,
            name: true,
            calls: {
              select: { status: true, durationSeconds: true, sentiment: true },
            },
          },
        });

        const findAgent = (id?: string) => (id ? agents.find((a) => a.id === id) : null);
        const agentA = findAgent(input.agentAId);
        const agentB = findAgent(input.agentBId);

        return {
          mode: "agents" as const,
          a: agentA ? toMetrics(agentA.calls, agentA.name) : null,
          b: agentB ? toMetrics(agentB.calls, agentB.name) : null,
        };
      }

      // periods
      const getPeriodMetrics = async (days: number): Promise<EntityMetrics> => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const calls = await ctx.db.call.findMany({
          where: { organizationId: ctx.orgId, createdAt: { gte: since } },
          select: { status: true, durationSeconds: true, sentiment: true },
        });
        return toMetrics(calls, `Last ${days} days`);
      };

      const [a, b] = await Promise.all([
        input.periodADays ? getPeriodMetrics(input.periodADays) : null,
        input.periodBDays ? getPeriodMetrics(input.periodBDays) : null,
      ]);

      return { mode: "periods" as const, a, b };
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
        metrics: z
          .array(
            z.enum(["calls", "minutes", "successRate", "sentimentBreakdown", "leadScoreAvg"])
          )
          .min(1),
        filters: z
          .object({
            agentIds: z.array(z.string()).optional(),
            campaignIds: z.array(z.string()).optional(),
            statuses: z.array(z.string()).optional(),
            sentiments: z.array(z.string()).optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { groupBy, metrics, filters } = input;

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

      const rows = Array.from(groups.entries()).map(([groupLabel, groupCalls]) => {
        const row: Record<string, unknown> = { groupLabel };

        if (metrics.includes("calls")) row.calls = groupCalls.length;
        if (metrics.includes("minutes")) {
          row.minutes = Math.round(
            groupCalls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / 60
          );
        }
        if (metrics.includes("successRate")) {
          const completed = groupCalls.filter((c) => c.status === "completed").length;
          row.successRate =
            groupCalls.length > 0 ? Math.round((completed / groupCalls.length) * 100) : 0;
        }
        if (metrics.includes("sentimentBreakdown")) {
          row.positive = groupCalls.filter((c) => c.sentiment === "positive").length;
          row.neutral = groupCalls.filter((c) => c.sentiment === "neutral").length;
          row.negative = groupCalls.filter((c) => c.sentiment === "negative").length;
        }
        if (metrics.includes("leadScoreAvg")) {
          const scored = groupCalls.filter((c) => c.leadScore != null);
          row.leadScoreAvg =
            scored.length > 0
              ? Math.round(scored.reduce((sum, c) => sum + (c.leadScore || 0), 0) / scored.length)
              : 0;
        }

        return row;
      });

      rows.sort((a, b) => String(a.groupLabel).localeCompare(String(b.groupLabel)));

      const summary: Record<string, unknown> = {};
      if (metrics.includes("calls")) summary.calls = calls.length;
      if (metrics.includes("minutes")) {
        summary.minutes = Math.round(
          calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / 60
        );
      }
      if (metrics.includes("successRate")) {
        const completed = calls.filter((c) => c.status === "completed").length;
        summary.successRate =
          calls.length > 0 ? Math.round((completed / calls.length) * 100) : 0;
      }
      if (metrics.includes("sentimentBreakdown")) {
        summary.positive = calls.filter((c) => c.sentiment === "positive").length;
        summary.neutral = calls.filter((c) => c.sentiment === "neutral").length;
        summary.negative = calls.filter((c) => c.sentiment === "negative").length;
      }
      if (metrics.includes("leadScoreAvg")) {
        const scored = calls.filter((c) => c.leadScore != null);
        summary.leadScoreAvg =
          scored.length > 0
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
