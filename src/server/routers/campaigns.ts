import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { enforceCampaignLimit, enforceMinutesLimit, actionRateLimit } from "../trpc/middleware";
import {
  executeCampaignBatch,
  pauseCampaign,
  resumeCampaign as resumeCampaignExecution,
  stopCampaign,
  getCampaignState,
} from "../services/campaign-executor.service";
import { createLogger } from "@/lib/logger";

const log = createLogger("Campaign");

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  agentId: z.string(),
  type: z.enum(["cold_calling", "interview"]).default("cold_calling"),
  scheduleStart: z.date().optional(),
  scheduleEnd: z.date().optional(),
  timeZone: z.string().default("America/New_York"),
  callingHours: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .default({ start: "09:00", end: "17:00" }),
  maxCallsPerDay: z.number().min(1).max(1000).default(100),
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
});

export const campaignsRouter = router({
  // List all campaigns (excludes interview campaigns by default)
  list: protectedProcedure
    .input(z.object({ type: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: {
        organizationId: ctx.orgId,
        type: input?.type || "cold_calling",
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
    return campaigns;
  }),

  // Get a single campaign
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
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
          message: "Campaign not found",
        });
      }

      return campaign;
    }),

  // Create a new campaign
  create: protectedProcedure
    .input(campaignSchema)
    .use(enforceCampaignLimit)
    .mutation(async ({ ctx, input }) => {
      // Verify agent exists and belongs to org
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.agentId,
          organizationId: ctx.orgId,
        },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      const campaign = await ctx.db.campaign.create({
        data: {
          organizationId: ctx.orgId,
          agentId: input.agentId,
          name: input.name,
          description: input.description,
          type: input.type,
          scheduleStart: input.scheduleStart,
          scheduleEnd: input.scheduleEnd,
          timeZone: input.timeZone,
          callingHours: input.callingHours,
          maxCallsPerDay: input.maxCallsPerDay,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          jobRequirements: input.jobRequirements,
        },
      });

      return campaign;
    }),

  // Update a campaign
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: campaignSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const campaign = await ctx.db.campaign.update({
        where: { id: input.id },
        data: input.data,
      });

      return campaign;
    }),

  // Delete a campaign
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await ctx.db.campaign.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Update campaign status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["draft", "scheduled", "running", "paused", "completed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return updated;
    }),

  // Get detailed campaign stats
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Get contact stats by status
      const contactStats = await ctx.db.contact.groupBy({
        by: ["status"],
        where: {
          campaignId: input.id,
          organizationId: ctx.orgId,
        },
        _count: {
          status: true,
        },
      });

      // Get call stats
      const callStats = await ctx.db.call.groupBy({
        by: ["status"],
        where: {
          campaignId: input.id,
          organizationId: ctx.orgId,
        },
        _count: {
          status: true,
        },
      });

      // Get total call duration
      const callDuration = await ctx.db.call.aggregate({
        where: {
          campaignId: input.id,
          organizationId: ctx.orgId,
        },
        _sum: {
          durationSeconds: true,
        },
        _avg: {
          durationSeconds: true,
        },
      });

      // Get sentiment breakdown
      const sentimentStats = await ctx.db.call.groupBy({
        by: ["sentiment"],
        where: {
          campaignId: input.id,
          organizationId: ctx.orgId,
          sentiment: { not: null },
        },
        _count: {
          sentiment: true,
        },
      });

      // Format response
      const contacts = {
        total: 0,
        pending: 0,
        called: 0,
        completed: 0,
        failed: 0,
        dnc: 0,
      };

      for (const stat of contactStats) {
        contacts[stat.status as keyof typeof contacts] = stat._count.status;
        contacts.total += stat._count.status;
      }

      const calls = {
        total: 0,
        queued: 0,
        ringing: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
        noAnswer: 0,
      };

      for (const stat of callStats) {
        const status = stat.status?.replace("-", "") as keyof typeof calls;
        if (status && status in calls) {
          calls[status] = stat._count.status;
        }
        calls.total += stat._count.status;
      }

      const sentiment = {
        positive: 0,
        neutral: 0,
        negative: 0,
      };

      for (const stat of sentimentStats) {
        if (stat.sentiment && stat.sentiment in sentiment) {
          sentiment[stat.sentiment as keyof typeof sentiment] = stat._count.sentiment;
        }
      }

      return {
        contacts,
        calls,
        sentiment,
        duration: {
          total: callDuration._sum.durationSeconds || 0,
          average: Math.round(callDuration._avg.durationSeconds || 0),
        },
        progress: contacts.total > 0
          ? Math.round(((contacts.completed + contacts.failed + contacts.dnc) / contacts.total) * 100)
          : 0,
      };
    }),

  // Start a campaign
  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .use(enforceMinutesLimit)
    .use(actionRateLimit("campaign_start", 5, 60)) // Max 5 campaign starts per minute
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          _count: {
            select: { contacts: true },
          },
          agent: {
            include: {
              phoneNumbers: {
                where: { isActive: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.status === "running") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign is already running",
        });
      }

      if (campaign._count.contacts === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign has no contacts. Add contacts before starting.",
        });
      }

      if (!campaign.agent.phoneNumbers.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent has no phone number assigned. Assign a phone number first.",
        });
      }

      if (!campaign.agent.vapiAssistantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is not connected to voice system. Please connect the agent first.",
        });
      }

      // Update campaign status
      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: "running",
          stats: {
            startedAt: new Date().toISOString(),
          },
        },
      });

      // Trigger campaign execution asynchronously
      // This runs in the background and processes contacts
      executeCampaignBatch(input.id, ctx.orgId, 10).catch((error) => {
        log.error(`Failed to execute campaign ${input.id}:`, error);
      });

      return updated;
    }),

  // Pause a campaign
  pause: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.status !== "running") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign is not running",
        });
      }

      // Signal the executor to pause
      pauseCampaign(input.id);

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: "paused",
          stats: {
            ...(campaign.stats as object || {}),
            pausedAt: new Date().toISOString(),
          },
        },
      });

      return updated;
    }),

  // Resume a paused campaign
  resume: protectedProcedure
    .input(z.object({ id: z.string() }))
    .use(enforceMinutesLimit)
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.status !== "paused") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign is not paused",
        });
      }

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: "running",
          stats: {
            ...(campaign.stats as object || {}),
            resumedAt: new Date().toISOString(),
          },
        },
      });

      // Resume campaign execution
      resumeCampaignExecution(input.id);

      // Trigger campaign execution asynchronously
      executeCampaignBatch(input.id, ctx.orgId, 10).catch((error) => {
        log.error(`Failed to resume campaign ${input.id}:`, error);
      });

      return updated;
    }),

  // Complete a campaign (manually end it)
  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Stop the campaign executor if running
      stopCampaign(input.id);

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: "completed",
          stats: {
            ...(campaign.stats as object || {}),
            completedAt: new Date().toISOString(),
            completedManually: true,
          },
        },
      });

      return updated;
    }),

  // Get real-time campaign execution status
  getExecutionStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        select: {
          id: true,
          status: true,
          stats: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      // Get executor state
      const executorState = getCampaignState(input.id);

      // Get real-time contact counts
      const contactCounts = await ctx.db.contact.groupBy({
        by: ["status"],
        where: { campaignId: input.id },
        _count: true,
      });

      const counts = {
        pending: 0,
        called: 0,
        completed: 0,
        failed: 0,
        dnc: 0,
      };

      for (const c of contactCounts) {
        if (c.status in counts) {
          counts[c.status as keyof typeof counts] = c._count;
        }
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const processed = counts.completed + counts.failed + counts.dnc;

      return {
        campaignStatus: campaign.status,
        executorState: executorState || null,
        isExecuting: executorState === "running",
        contacts: counts,
        progress: total > 0 ? Math.round((processed / total) * 100) : 0,
        stats: campaign.stats,
      };
    }),

  // Get available phone numbers for campaign
  getAvailablePhoneNumbers: protectedProcedure.query(async ({ ctx }) => {
    const phoneNumbers = await ctx.db.phoneNumber.findMany({
      where: {
        organizationId: ctx.orgId,
        isActive: true,
      },
      include: {
        agent: {
          select: { id: true, name: true },
        },
      },
    });

    return phoneNumbers;
  }),
});
