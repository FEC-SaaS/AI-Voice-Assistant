import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generateInterviewQuestions } from "@/lib/openai";
import { enforceCampaignLimit } from "../trpc/middleware";
import { createLogger } from "@/lib/logger";

const log = createLogger("Interviews");

export const interviewsRouter = router({
  // List interview campaigns
  list: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: {
        organizationId: ctx.orgId,
        type: "interview",
      },
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { contacts: true, calls: true },
        },
      },
    });

    // For each campaign, get average interview score
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const scoreAgg = await ctx.db.call.aggregate({
          where: {
            campaignId: campaign.id,
            interviewScore: { not: null },
          },
          _avg: { interviewScore: true },
          _max: { interviewScore: true },
          _count: { interviewScore: true },
        });

        return {
          ...campaign,
          avgScore: Math.round(scoreAgg._avg.interviewScore || 0),
          topScore: scoreAgg._max.interviewScore || 0,
          interviewedCount: scoreAgg._count.interviewScore,
        };
      })
    );

    return campaignsWithStats;
  }),

  // Get single interview campaign
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          type: "interview",
        },
        include: {
          agent: true,
          _count: {
            select: { contacts: true, calls: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview campaign not found",
        });
      }

      return campaign;
    }),

  // Create interview campaign
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        agentId: z.string(),
        jobTitle: z.string().min(1, "Job title is required"),
        jobDescription: z.string().min(1, "Job description is required"),
        jobRequirements: z.object({
          skills: z.array(z.string()).default([]),
          experience: z.string().default(""),
          education: z.string().default(""),
          questions: z.array(z.string()).default([]),
        }),
        timeZone: z.string().default("America/New_York"),
        callingHours: z
          .object({ start: z.string(), end: z.string() })
          .default({ start: "09:00", end: "17:00" }),
        maxCallsPerDay: z.number().min(1).max(1000).default(50),
      })
    )
    .use(enforceCampaignLimit)
    .mutation(async ({ ctx, input }) => {
      // Verify agent
      const agent = await ctx.db.agent.findFirst({
        where: { id: input.agentId, organizationId: ctx.orgId },
      });
      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const campaign = await ctx.db.campaign.create({
        data: {
          organizationId: ctx.orgId,
          agentId: input.agentId,
          name: input.name,
          description: input.description,
          type: "interview",
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          jobRequirements: input.jobRequirements,
          timeZone: input.timeZone,
          callingHours: input.callingHours,
          maxCallsPerDay: input.maxCallsPerDay,
        },
      });

      log.info(`Interview campaign created: ${campaign.id} for ${input.jobTitle}`);
      return campaign;
    }),

  // Update interview campaign
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          agentId: z.string().optional(),
          jobTitle: z.string().optional(),
          jobDescription: z.string().optional(),
          jobRequirements: z
            .object({
              skills: z.array(z.string()).optional(),
              experience: z.string().optional(),
              education: z.string().optional(),
              questions: z.array(z.string()).optional(),
            })
            .optional(),
          timeZone: z.string().optional(),
          callingHours: z
            .object({ start: z.string(), end: z.string() })
            .optional(),
          maxCallsPerDay: z.number().min(1).max(1000).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.campaign.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, type: "interview" },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview campaign not found" });
      }

      return ctx.db.campaign.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  // Delete interview campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.campaign.findFirst({
        where: { id: input.id, organizationId: ctx.orgId, type: "interview" },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview campaign not found" });
      }

      await ctx.db.campaign.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Get candidates for an interview campaign, sorted by score
  getCandidates: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: { id: input.campaignId, organizationId: ctx.orgId, type: "interview" },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview campaign not found" });
      }

      const contacts = await ctx.db.contact.findMany({
        where: { campaignId: input.campaignId },
        orderBy: { createdAt: "asc" },
        include: {
          calls: {
            where: { interviewScore: { not: null } },
            select: {
              id: true,
              interviewScore: true,
              interviewAnalysis: true,
              status: true,
              durationSeconds: true,
              recordingUrl: true,
              transcript: true,
              summary: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      // Sort by interview score desc, then unscored at the end
      const sorted = contacts.sort((a, b) => {
        const scoreA = a.calls[0]?.interviewScore ?? -1;
        const scoreB = b.calls[0]?.interviewScore ?? -1;
        return scoreB - scoreA;
      });

      return sorted;
    }),

  // Get single candidate detail
  getCandidateDetail: protectedProcedure
    .input(z.object({ campaignId: z.string(), contactId: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: {
          id: input.contactId,
          campaignId: input.campaignId,
          organizationId: ctx.orgId,
        },
        include: {
          calls: {
            where: { campaignId: input.campaignId },
            select: {
              id: true,
              interviewScore: true,
              interviewAnalysis: true,
              status: true,
              durationSeconds: true,
              recordingUrl: true,
              transcript: true,
              summary: true,
              sentiment: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      return contact;
    }),

  // Get job stats summary
  getJobStats: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: { id: input.campaignId, organizationId: ctx.orgId, type: "interview" },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview campaign not found" });
      }

      const totalCandidates = await ctx.db.contact.count({
        where: { campaignId: input.campaignId },
      });

      const scoreAgg = await ctx.db.call.aggregate({
        where: {
          campaignId: input.campaignId,
          interviewScore: { not: null },
        },
        _avg: { interviewScore: true },
        _max: { interviewScore: true },
        _min: { interviewScore: true },
        _count: { interviewScore: true },
      });

      // Get recommendation breakdown
      const calls = await ctx.db.call.findMany({
        where: {
          campaignId: input.campaignId,
          interviewAnalysis: { not: Prisma.JsonNull },
        },
        select: { interviewAnalysis: true, interviewScore: true },
      });

      const recommendations = { strong_yes: 0, yes: 0, maybe: 0, no: 0 };
      for (const call of calls) {
        const analysis = call.interviewAnalysis as Record<string, unknown> | null;
        const rec = analysis?.recommendation as string;
        if (rec && rec in recommendations) {
          recommendations[rec as keyof typeof recommendations]++;
        }
      }

      // Top candidates
      const topCandidates = await ctx.db.call.findMany({
        where: {
          campaignId: input.campaignId,
          interviewScore: { not: null },
        },
        orderBy: { interviewScore: "desc" },
        take: 5,
        include: {
          contact: {
            select: { firstName: true, lastName: true, phoneNumber: true },
          },
        },
      });

      return {
        totalCandidates,
        interviewed: scoreAgg._count.interviewScore,
        avgScore: Math.round(scoreAgg._avg.interviewScore || 0),
        maxScore: scoreAgg._max.interviewScore || 0,
        minScore: scoreAgg._min.interviewScore || 0,
        recommendations,
        topCandidates: topCandidates.map((c) => ({
          contactName: `${c.contact?.firstName || ""} ${c.contact?.lastName || ""}`.trim() || "Unknown",
          phone: c.contact?.phoneNumber || "",
          score: c.interviewScore || 0,
          recommendation: (c.interviewAnalysis as Record<string, unknown>)?.recommendation || "unknown",
        })),
      };
    }),

  // Generate AI-suggested interview questions from job description
  generateQuestions: protectedProcedure
    .input(
      z.object({
        jobTitle: z.string().min(1),
        jobDescription: z.string().min(10),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateInterviewQuestions(
        input.jobTitle,
        input.jobDescription
      );
      return result;
    }),
});
