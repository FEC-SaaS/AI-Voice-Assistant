import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createAssistant, updateAssistant, deleteAssistant, createCall } from "@/lib/vapi";
import { enforceAgentLimit } from "../trpc/middleware";

const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  firstMessage: z.string().optional(),
  voiceProvider: z.string().default("vapi"),
  voiceId: z.string().default("luna"),
  language: z.string().default("en-US"),
  modelProvider: z.string().default("openai"),
  model: z.string().default("gpt-4o"),
});

export const agentsRouter = router({
  // List all agents for the organization
  list: protectedProcedure.query(async ({ ctx }) => {
    const agents = await ctx.db.agent.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { calls: true, campaigns: true },
        },
      },
    });
    return agents;
  }),

  // Get a single agent
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          phoneNumbers: true,
          _count: {
            select: { calls: true, campaigns: true },
          },
        },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return agent;
    }),

  // Create a new agent
  create: protectedProcedure
    .input(agentSchema)
    .use(enforceAgentLimit)
    .mutation(async ({ ctx, input }) => {
      // Create assistant in Vapi
      let vapiAssistantId: string | null = null;

      try {
        const vapiAssistant = await createAssistant({
          name: input.name,
          systemPrompt: input.systemPrompt,
          firstMessage: input.firstMessage,
          voiceProvider: input.voiceProvider,
          voiceId: input.voiceId,
          modelProvider: input.modelProvider,
          model: input.model,
        });
        vapiAssistantId = vapiAssistant.id;
      } catch (error) {
        console.error("Failed to create Vapi assistant:", error);
        // Continue without Vapi ID - can sync later
      }

      // Create agent in database
      const agent = await ctx.db.agent.create({
        data: {
          organizationId: ctx.orgId,
          vapiAssistantId,
          name: input.name,
          description: input.description,
          systemPrompt: input.systemPrompt,
          firstMessage: input.firstMessage,
          voiceProvider: input.voiceProvider,
          voiceId: input.voiceId,
          language: input.language,
          modelProvider: input.modelProvider,
          model: input.model,
        },
      });

      return agent;
    }),

  // Update an agent
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: agentSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, verify the agent exists and belongs to the org
      const existingAgent = await ctx.db.agent.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      // Update in Vapi if we have an assistant ID
      if (existingAgent.vapiAssistantId) {
        try {
          await updateAssistant(existingAgent.vapiAssistantId, input.data);
        } catch (error) {
          console.error("Failed to update Vapi assistant:", error);
          // Continue with local update
        }
      }

      // Update in database
      const agent = await ctx.db.agent.update({
        where: { id: input.id },
        data: input.data,
      });

      return agent;
    }),

  // Delete an agent
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      // Delete from Vapi if we have an assistant ID
      if (agent.vapiAssistantId) {
        try {
          await deleteAssistant(agent.vapiAssistantId);
        } catch (error) {
          console.error("Failed to delete Vapi assistant:", error);
        }
      }

      // Delete from database
      await ctx.db.agent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Make a test call with this agent
  testCall: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        phoneNumber: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.agentId,
          organizationId: ctx.orgId,
        },
        include: { phoneNumbers: true },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      if (!agent.vapiAssistantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is not synced with Vapi. Please edit and save the agent first.",
        });
      }

      // Use the agent's first assigned phone number, or throw
      const phoneNumber = agent.phoneNumbers[0];
      if (!phoneNumber?.vapiPhoneId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No phone number assigned to this agent. Assign one first in Phone Numbers.",
        });
      }

      // Initiate call via Vapi
      const vapiCall = await createCall({
        assistantId: agent.vapiAssistantId,
        phoneNumberId: phoneNumber.vapiPhoneId,
        customerNumber: input.phoneNumber,
        metadata: {
          organizationId: ctx.orgId,
          agentId: agent.id,
          type: "test",
        },
      });

      // Create call record
      const call = await ctx.db.call.create({
        data: {
          organizationId: ctx.orgId,
          agentId: agent.id,
          vapiCallId: vapiCall.id,
          direction: "outbound",
          status: "queued",
          toNumber: input.phoneNumber,
          fromNumber: phoneNumber.number,
        },
      });

      return { callId: call.id, vapiCallId: vapiCall.id, status: vapiCall.status };
    }),

  // Toggle agent active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      const updated = await ctx.db.agent.update({
        where: { id: input.id },
        data: { isActive: !agent.isActive },
      });

      return updated;
    }),
});
