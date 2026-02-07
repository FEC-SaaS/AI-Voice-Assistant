import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const missedCallsRouter = router({
  // List missed calls with filters
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        agentId: z.string().optional(),
        textBackSent: z.boolean().optional(),
        callbackInitiated: z.boolean().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        organizationId: ctx.orgId,
        isDuplicate: false,
      };

      if (input?.agentId) where.agentId = input.agentId;
      if (input?.textBackSent !== undefined) where.textBackSent = input.textBackSent;
      if (input?.callbackInitiated !== undefined) where.callbackInitiated = input.callbackInitiated;

      if (input?.startDate || input?.endDate) {
        const createdAt: Record<string, Date> = {};
        if (input.startDate) createdAt.gte = new Date(input.startDate);
        if (input.endDate) createdAt.lte = new Date(input.endDate);
        where.createdAt = createdAt;
      }

      const [missedCalls, total] = await Promise.all([
        ctx.db.missedCall.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            agent: { select: { id: true, name: true } },
          },
        }),
        ctx.db.missedCall.count({ where }),
      ]);

      return {
        missedCalls,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Get stats for the missed calls dashboard
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalMissedCalls,
      todayMissedCalls,
      weekMissedCalls,
      textBacksSent,
      callbacksInitiated,
      leadsCreated,
      recentMissedCalls,
    ] = await Promise.all([
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, isDuplicate: false },
      }),
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, isDuplicate: false, createdAt: { gte: todayStart } },
      }),
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, isDuplicate: false, createdAt: { gte: weekStart } },
      }),
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, textBackSent: true },
      }),
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, callbackInitiated: true },
      }),
      ctx.db.missedCall.count({
        where: { organizationId: ctx.orgId, contactCreated: true },
      }),
      ctx.db.missedCall.findMany({
        where: { organizationId: ctx.orgId, isDuplicate: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          agent: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      totalMissedCalls,
      todayMissedCalls,
      weekMissedCalls,
      textBacksSent,
      callbacksInitiated,
      leadsCreated,
      recentMissedCalls,
    };
  }),

  // Get a single missed call detail
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const missedCall = await ctx.db.missedCall.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          agent: { select: { id: true, name: true } },
        },
      });

      return missedCall;
    }),

  // Manually trigger text-back for a missed call
  sendTextBack: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const missedCall = await ctx.db.missedCall.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: { agent: { select: { settings: true } } },
      });

      if (!missedCall) {
        throw new Error("Missed call not found");
      }

      if (missedCall.textBackSent) {
        throw new Error("Text-back already sent for this missed call");
      }

      const { getMissedCallConfig, DEFAULT_MISSED_CALL_CONFIG } = await import("@/lib/missed-calls");
      const agentSettings = (missedCall.agent?.settings as Record<string, unknown>) || {};
      const config = getMissedCallConfig(agentSettings);

      // Get org's SMS number
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: { organizationId: ctx.orgId, isActive: true },
        select: { number: true },
        orderBy: { createdAt: "asc" },
      });

      if (!phoneNumber) {
        throw new Error("No SMS-capable phone number configured");
      }

      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { name: true, settings: true },
      });
      const orgSettings = (org?.settings as Record<string, unknown>) || {};
      const businessName = (orgSettings.emailBusinessName as string) || org?.name || "CallTone";
      const message = config.textBackMessage || DEFAULT_MISSED_CALL_CONFIG.textBackMessage!;
      const smsBody = `${businessName}: ${message}`;

      const { sendSms } = await import("@/lib/twilio");
      const result = await sendSms({
        to: missedCall.callerNumber,
        from: phoneNumber.number,
        body: smsBody,
      });

      if (!result.success) {
        throw new Error(`Failed to send SMS: ${result.error}`);
      }

      await ctx.db.missedCall.update({
        where: { id: input.id },
        data: {
          textBackSent: true,
          textBackSentAt: new Date(),
          textBackMessage: smsBody,
        },
      });

      return { success: true };
    }),

  // Manually initiate a callback
  initiateCallback: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const missedCall = await ctx.db.missedCall.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: {
          agent: {
            select: {
              id: true,
              vapiAssistantId: true,
              phoneNumbers: { select: { vapiPhoneId: true }, take: 1 },
            },
          },
        },
      });

      if (!missedCall) {
        throw new Error("Missed call not found");
      }

      if (missedCall.callbackInitiated) {
        throw new Error("Callback already initiated for this missed call");
      }

      if (!missedCall.agent?.vapiAssistantId || !missedCall.agent.phoneNumbers[0]?.vapiPhoneId) {
        throw new Error("Agent is not configured for callbacks (missing voice system or phone number)");
      }

      const { createCall } = await import("@/lib/vapi");
      const vapiCall = await createCall({
        assistantId: missedCall.agent.vapiAssistantId,
        phoneNumberId: missedCall.agent.phoneNumbers[0].vapiPhoneId,
        customerNumber: missedCall.callerNumber,
        metadata: {
          organizationId: ctx.orgId,
          agentId: missedCall.agent.id,
          type: "missed_call_callback",
          missedCallId: missedCall.id,
        },
      });

      await ctx.db.missedCall.update({
        where: { id: input.id },
        data: {
          callbackInitiated: true,
          callbackCallId: vapiCall.id,
        },
      });

      return { success: true, callId: vapiCall.id };
    }),
});
