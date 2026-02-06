import { z } from "zod";
import { router, protectedProcedure, managerProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("Live Calls");

const VAPI_API_URL = "https://api.vapi.ai";

async function vapiPost(path: string, body: unknown) {
  const res = await fetch(`${VAPI_API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi API error: ${res.status} - ${text}`);
  }
  return res.json();
}

export const liveCallsRouter = router({
  getActiveCalls: protectedProcedure.query(async ({ ctx }) => {
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
        await vapiPost(`/call/${call.vapiCallId}/speak`, {
          message: input.message,
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
        await vapiPost(`/call/${call.vapiCallId}/speak`, {
          message: `[Coaching] ${input.message}`,
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
        const res = await fetch(`${VAPI_API_URL}/call/${call.vapiCallId}/stop`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Vapi returned ${res.status}`);
        }
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
