import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

interface AnalysisJson {
  keyPoints?: string[];
  objections?: string[];
  buyingSignals?: string[];
  actionItems?: string[];
  competitorMentions?: string[];
  coachingRecommendations?: string[];
  closeProbability?: number;
  nextBestAction?: string;
  objectionCategories?: Array<{
    category: string;
    objection: string;
    suggestedResponse: string;
  }>;
  optOutDetected?: boolean;
}

export const intelligenceRouter = router({
  getInsights: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      }).default({})
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          sentiment: { not: null },
          createdAt: { gte: since },
        },
        select: {
          id: true,
          leadScore: true,
          sentiment: true,
          analysis: true,
        },
      });

      let totalCloseProbability = 0;
      let closeProbCount = 0;
      const competitorCounts = new Map<string, number>();
      let totalBuyingSignals = 0;
      const objectionCategoryCounts = new Map<string, number>();

      for (const call of calls) {
        const a = call.analysis as AnalysisJson | null;
        if (!a) continue;

        if (a.closeProbability != null) {
          totalCloseProbability += a.closeProbability;
          closeProbCount++;
        }

        if (a.competitorMentions) {
          for (const comp of a.competitorMentions) {
            const key = comp.toLowerCase().trim();
            competitorCounts.set(key, (competitorCounts.get(key) || 0) + 1);
          }
        }

        if (a.buyingSignals) {
          totalBuyingSignals += a.buyingSignals.length;
        }

        if (a.objectionCategories) {
          for (const oc of a.objectionCategories) {
            objectionCategoryCounts.set(
              oc.category,
              (objectionCategoryCounts.get(oc.category) || 0) + 1
            );
          }
        }
      }

      const avgCloseProbability =
        closeProbCount > 0 ? Math.round(totalCloseProbability / closeProbCount) : 0;

      const topCompetitors = Array.from(competitorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const topObjectionCategories = Array.from(objectionCategoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([category, count]) => ({ category, count }));

      return {
        totalAnalyzedCalls: calls.length,
        avgCloseProbability,
        totalCompetitorMentions: Array.from(competitorCounts.values()).reduce(
          (a, b) => a + b,
          0
        ),
        totalBuyingSignals,
        topCompetitors,
        topObjectionCategories,
      };
    }),

  getBuyingSignalAlerts: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(20) }).default({})
    )
    .query(async ({ ctx, input }) => {
      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          leadScore: { gte: 60 },
          sentiment: { not: null },
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              phoneNumber: true,
            },
          },
          agent: { select: { name: true } },
        },
        orderBy: { leadScore: "desc" },
        take: input.limit,
      });

      return calls
        .filter((call) => {
          const a = call.analysis as AnalysisJson | null;
          return a?.buyingSignals && a.buyingSignals.length > 0;
        })
        .map((call) => {
          const a = call.analysis as AnalysisJson;
          return {
            callId: call.id,
            leadScore: call.leadScore,
            sentiment: call.sentiment,
            buyingSignals: a.buyingSignals || [],
            nextBestAction: a.nextBestAction || null,
            closeProbability: a.closeProbability ?? null,
            contactName: call.contact
              ? `${call.contact.firstName ?? ""} ${call.contact.lastName ?? ""}`.trim()
              : null,
            contactCompany: call.contact?.company ?? null,
            contactPhone: call.contact?.phoneNumber ?? call.toNumber,
            agentName: call.agent?.name ?? null,
            createdAt: call.createdAt,
          };
        });
    }),

  getObjectionPatterns: protectedProcedure
    .input(
      z.object({ days: z.number().min(1).max(90).default(30) }).default({})
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          sentiment: { not: null },
          createdAt: { gte: since },
        },
        select: { analysis: true },
      });

      const patterns = new Map<
        string,
        {
          count: number;
          objections: Map<string, number>;
          responses: Map<string, number>;
        }
      >();

      for (const call of calls) {
        const a = call.analysis as AnalysisJson | null;
        if (!a?.objectionCategories) continue;

        for (const oc of a.objectionCategories) {
          const existing = patterns.get(oc.category) || {
            count: 0,
            objections: new Map(),
            responses: new Map(),
          };
          existing.count++;
          existing.objections.set(
            oc.objection,
            (existing.objections.get(oc.objection) || 0) + 1
          );
          existing.responses.set(
            oc.suggestedResponse,
            (existing.responses.get(oc.suggestedResponse) || 0) + 1
          );
          patterns.set(oc.category, existing);
        }
      }

      return Array.from(patterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([category, data]) => {
          const topObjections = Array.from(data.objections.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([text]) => text);
          const topResponse = Array.from(data.responses.entries()).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0];

          return {
            category,
            count: data.count,
            topObjections,
            suggestedResponse: topResponse ?? null,
          };
        });
    }),

  getCoachingInsights: protectedProcedure
    .input(
      z.object({ days: z.number().min(1).max(90).default(30) }).default({})
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const calls = await ctx.db.call.findMany({
        where: {
          organizationId: ctx.orgId,
          sentiment: { not: null },
          createdAt: { gte: since },
        },
        select: { analysis: true },
      });

      const recommendations = new Map<string, number>();

      for (const call of calls) {
        const a = call.analysis as AnalysisJson | null;
        if (!a?.coachingRecommendations) continue;

        for (const rec of a.coachingRecommendations) {
          const key = rec.toLowerCase().trim();
          recommendations.set(key, (recommendations.get(key) || 0) + 1);
        }
      }

      return Array.from(recommendations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([recommendation, count]) => ({ recommendation, count }));
    }),
});
