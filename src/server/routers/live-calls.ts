import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";
import { sendCallControl } from "@/lib/vapi";

const log = createLogger("Live Calls");

export const liveCallsRouter = router({
  getActiveCalls: protectedProcedure.query(async ({ ctx }) => {
    // Auto-clean stale calls: any call older than 4 hours still in active status
    // is clearly stuck — mark it as completed
    const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const staleCalls = await ctx.db.call.findMany({
      where: {
        organizationId: ctx.orgId,
        status: { in: ["in-progress", "ringing", "queued"] },
        OR: [
          { startedAt: { lt: staleThreshold } },
          { startedAt: null, createdAt: { lt: staleThreshold } },
        ],
      },
      select: { id: true, status: true },
    });

    if (staleCalls.length > 0) {
      log.info(`Cleaning up ${staleCalls.length} stale calls`);
      await ctx.db.call.updateMany({
        where: {
          id: { in: staleCalls.map((c) => c.id) },
        },
        data: {
          status: "completed",
          endedAt: new Date(),
        },
      });
    }

    const calls = await ctx.db.call.findMany({
      where: {
        organizationId: ctx.orgId,
        status: { in: ["in-progress", "ringing", "queued"] },
      },
      include: {
        agent: { select: { id: true, name: true } },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phoneNumber: true,
          },
        },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return calls.map((call) => ({
      id: call.id,
      vapiCallId: call.vapiCallId,
      status: call.status,
      direction: call.direction,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      startedAt: call.startedAt,
      agentName: call.agent?.name ?? null,
      agentId: call.agent?.id ?? null,
      contactName: call.contact
        ? `${call.contact.firstName ?? ""} ${call.contact.lastName ?? ""}`.trim() || null
        : null,
      contactCompany: call.contact?.company ?? null,
      contactPhone: call.contact?.phoneNumber ?? call.toNumber,
      campaignName: call.campaign?.name ?? null,
    }));
  }),

  getLiveTranscript: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.callId,
          organizationId: ctx.orgId,
        },
        select: {
          id: true,
          transcript: true,
          status: true,
          startedAt: true,
        },
      });

      if (!call) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Call not found" });
      }

      return {
        callId: call.id,
        transcript: call.transcript,
        status: call.status,
        startedAt: call.startedAt,
      };
    }),

  bargeIn: managerProcedure
    .input(
      z.object({
        callId: z.string(),
        message: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.callId,
          organizationId: ctx.orgId,
          status: "in-progress",
        },
        select: { vapiCallId: true },
      });

      if (!call?.vapiCallId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active call not found",
        });
      }

      try {
        await sendCallControl(call.vapiCallId, {
          type: "say",
          content: input.message,
          endCallAfterSpoken: false,
        });
        log.info(`Barge-in sent to call ${call.vapiCallId}`);
        return { success: true };
      } catch (error) {
        log.error("Barge-in failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message to call",
        });
      }
    }),

  whisper: managerProcedure
    .input(
      z.object({
        callId: z.string(),
        message: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.callId,
          organizationId: ctx.orgId,
          status: "in-progress",
        },
        select: { vapiCallId: true },
      });

      if (!call?.vapiCallId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active call not found",
        });
      }

      try {
        // Use add-message with system role to whisper coaching to the AI
        // (only the assistant sees system messages, not the customer)
        await sendCallControl(call.vapiCallId, {
          type: "add-message",
          message: {
            role: "system",
            content: `[Coaching from supervisor]: ${input.message}`,
          },
          triggerResponseEnabled: true,
        });
        log.info(`Whisper sent to call ${call.vapiCallId}`);
        return { success: true };
      } catch (error) {
        log.error("Whisper failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send coaching message",
        });
      }
    }),

  endCall: managerProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.callId,
          organizationId: ctx.orgId,
          status: { in: ["in-progress", "ringing", "queued"] },
        },
        select: { vapiCallId: true },
      });

      if (!call?.vapiCallId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active call not found",
        });
      }

      try {
        await sendCallControl(call.vapiCallId, {
          type: "end-call",
        });
        log.info(`Ended call ${call.vapiCallId}`);
        return { success: true };
      } catch (error) {
        log.error("End call failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to end call",
        });
      }
    }),
});
