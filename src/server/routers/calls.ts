import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { analyzeCall, getAnalyticsSummary } from "../services/call-analysis.service";

export const callsRouter = router({
  // List calls with filters
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        campaignId: z.string().optional(),
        status: z.string().optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { agentId, campaignId, status, direction, search, startDate, endDate, limit, cursor } = input;

      const where: Record<string, unknown> = {
        organizationId: ctx.orgId,
        ...(agentId && { agentId }),
        ...(campaignId && { campaignId }),
        ...(status && { status }),
        ...(direction && { direction }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      if (search) {
        where.OR = [
          { toNumber: { contains: search } },
          { fromNumber: { contains: search } },
          { summary: { contains: search, mode: "insensitive" } },
          { agent: { name: { contains: search, mode: "insensitive" } } },
          { campaign: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const calls = await ctx.db.call.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          agent: {
            select: { id: true, name: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (calls.length > limit) {
        const nextItem = calls.pop();
        nextCursor = nextItem?.id;
      }

      return {
        calls,
        nextCursor,
      };
    }),

  // Get a single call
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          agent: true,
          campaign: true,
          contact: true,
        },
      });

      if (!call) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Call not found",
        });
      }

      return call;
    }),

  // Get call statistics
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const where = {
        organizationId: ctx.orgId,
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const [total, completed, failed, totalDuration, avgSentiment] = await Promise.all([
        ctx.db.call.count({ where }),
        ctx.db.call.count({ where: { ...where, status: "completed" } }),
        ctx.db.call.count({ where: { ...where, status: "failed" } }),
        ctx.db.call.aggregate({
          where,
          _sum: { durationSeconds: true },
        }),
        ctx.db.call.groupBy({
          by: ["sentiment"],
          where: { ...where, sentiment: { not: null } },
          _count: true,
        }),
      ]);

      return {
        total,
        completed,
        failed,
        noAnswer: total - completed - failed,
        totalMinutes: Math.round((totalDuration._sum.durationSeconds || 0) / 60),
        sentimentBreakdown: avgSentiment,
      };
    }),

  // Analyze a call with AI
  analyze: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify call belongs to this organization
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!call) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Call not found",
        });
      }

      if (!call.transcript) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Call has no transcript to analyze",
        });
      }

      // Run AI analysis
      const result = await analyzeCall(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to analyze call",
        });
      }

      // Return updated call
      const updatedCall = await ctx.db.call.findUnique({
        where: { id: input.id },
        include: {
          agent: true,
          campaign: true,
          contact: true,
        },
      });

      return {
        call: updatedCall,
        analysis: result.analysis,
        optOutDetected: result.optOutDetected,
      };
    }),

  // Get conversation intelligence analytics
  getAnalytics: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const summary = await getAnalyticsSummary(
        ctx.orgId,
        input.startDate,
        input.endDate
      );

      return summary;
    }),
});
