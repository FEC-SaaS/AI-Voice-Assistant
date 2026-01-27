import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { enforceCampaignLimit } from "../trpc/middleware";

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  agentId: z.string(),
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
});

export const campaignsRouter = router({
  // List all campaigns
  list: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: { organizationId: ctx.orgId },
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
          scheduleStart: input.scheduleStart,
          scheduleEnd: input.scheduleEnd,
          timeZone: input.timeZone,
          callingHours: input.callingHours,
          maxCallsPerDay: input.maxCallsPerDay,
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
});
