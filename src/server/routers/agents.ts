import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("Agents");
import { createAssistant, updateAssistant, deleteAssistant, createCall, getAssistant } from "@/lib/vapi";
import { getAgentTools, getAppointmentSystemPromptAddition } from "@/lib/vapi-tools";
import { enforceAgentLimit } from "../trpc/middleware";

// Get the webhook URL for Vapi tool calls
function getVapiWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/webhooks/vapi`;
}

const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  firstMessage: z.string().optional(),
  voiceProvider: z.string().default("vapi"),
  voiceId: z.string().default("Elliot"),
  language: z.string().default("en-US"),
  modelProvider: z.string().default("openai"),
  model: z.string().default("gpt-4o"),
  enableAppointments: z.boolean().default(false),
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

  // Check if agent is synced with voice system (Vapi)
  // Returns sync status without exposing "Vapi" name to UI
  checkSyncStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
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

      // No voice system ID - not connected
      if (!agent.vapiAssistantId) {
        return {
          synced: false,
          connected: false,
          reason: "Agent is not connected to voice system",
          action: "Click 'Create New' or 'Link Existing' to connect",
        };
      }

      // Try to fetch the assistant from Vapi to verify it exists
      try {
        await getAssistant(agent.vapiAssistantId);
        return {
          synced: true,
          connected: true,
          reason: null,
          action: null,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.info(`Agent ${agent.id} has stale voice system ID:`, errorMessage);

        // Check if it's a 404 error (assistant deleted in Vapi)
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          return {
            synced: false,
            connected: false,
            reason: "Voice assistant was deleted externally",
            action: "Click 'Create New' to recreate the voice assistant",
          };
        }

        // Other errors (API issues, etc.)
        return {
          synced: false,
          connected: true, // ID exists but couldn't verify
          reason: "Could not verify voice system connection",
          action: "Try again later or click 'Sync' to refresh",
        };
      }
    }),

  // Create a new agent
  create: protectedProcedure
    .input(agentSchema.extend({
      knowledgeDocumentIds: z.array(z.string()).optional(),
    }))
    .use(enforceAgentLimit)
    .mutation(async ({ ctx, input }) => {
      // Get knowledge content if document IDs provided
      let knowledgeContent = "";
      if (input.knowledgeDocumentIds?.length) {
        const docs = await ctx.db.knowledgeDocument.findMany({
          where: {
            id: { in: input.knowledgeDocumentIds },
            organizationId: ctx.orgId,
            isActive: true,
          },
        });
        if (docs.length > 0) {
          knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
            docs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
            "\n--- END KNOWLEDGE BASE ---";
        }
      }

      // Combine system prompt with knowledge and appointment capabilities
      let fullSystemPrompt = input.systemPrompt + knowledgeContent;

      // Add appointment scheduling instructions if enabled
      if (input.enableAppointments) {
        fullSystemPrompt += getAppointmentSystemPromptAddition();
      }

      // Get tools for this agent
      const tools = getAgentTools(input.enableAppointments);

      // Create assistant in voice system (Vapi) - this is required
      let vapiAssistantId: string;

      try {
        const vapiAssistant = await createAssistant({
          name: input.name,
          systemPrompt: fullSystemPrompt,
          firstMessage: input.firstMessage,
          voiceProvider: input.voiceProvider,
          voiceId: input.voiceId,
          modelProvider: input.modelProvider,
          model: input.model,
          tools: tools.length > 0 ? tools : undefined,
          serverUrl: tools.length > 0 ? getVapiWebhookUrl() : undefined,
          serverUrlSecret: tools.length > 0 ? process.env.VAPI_WEBHOOK_SECRET : undefined,
        });
        vapiAssistantId = vapiAssistant.id;
      } catch (error) {
        log.error("Failed to create agent in voice system:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create agent: ${errorMessage}`,
        });
      }

      // Create agent in database (store original prompt, not with knowledge)
      // Store enableAppointments in settings JSON field
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
          settings: {
            enableAppointments: input.enableAppointments,
          },
        },
      });

      // Update knowledge documents to link to this agent
      if (input.knowledgeDocumentIds?.length) {
        await ctx.db.knowledgeDocument.updateMany({
          where: {
            id: { in: input.knowledgeDocumentIds },
            organizationId: ctx.orgId,
          },
          data: { agentId: agent.id },
        });
      }

      return agent;
    }),

  // Update an agent
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: agentSchema.partial(),
        knowledgeDocumentIds: z.array(z.string()).optional(),
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

      // Get knowledge content for Vapi sync
      let knowledgeContent = "";
      const knowledgeDocs = await ctx.db.knowledgeDocument.findMany({
        where: {
          agentId: input.id,
          organizationId: ctx.orgId,
          isActive: true,
        },
      });
      if (knowledgeDocs.length > 0) {
        knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
          knowledgeDocs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
          "\n--- END KNOWLEDGE BASE ---";
      }

      // Determine enableAppointments - check if it's being updated or use existing
      const existingSettings = (existingAgent.settings as Record<string, unknown>) || {};
      const enableAppointments = input.data.enableAppointments !== undefined
        ? input.data.enableAppointments
        : (existingSettings.enableAppointments as boolean) || false;

      // Prepare the full system prompt for Vapi (with knowledge and appointment capabilities)
      const systemPrompt = input.data.systemPrompt || existingAgent.systemPrompt;
      let fullSystemPrompt = systemPrompt + knowledgeContent;

      if (enableAppointments) {
        fullSystemPrompt += getAppointmentSystemPromptAddition();
      }

      // Get tools for this agent
      const tools = getAgentTools(enableAppointments);

      // Update in Vapi if we have an assistant ID
      if (existingAgent.vapiAssistantId) {
        try {
          await updateAssistant(existingAgent.vapiAssistantId, {
            ...input.data,
            systemPrompt: fullSystemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            serverUrl: tools.length > 0 ? getVapiWebhookUrl() : undefined,
            serverUrlSecret: tools.length > 0 ? process.env.VAPI_WEBHOOK_SECRET : undefined,
          });
        } catch (error) {
          log.error("Failed to update Vapi assistant:", error);
          // Continue with local update
        }
      }

      // Prepare update data, including settings if enableAppointments changed
      const updateData: Record<string, unknown> = { ...input.data };
      delete updateData.enableAppointments; // Remove from direct data since it goes in settings

      if (input.data.enableAppointments !== undefined) {
        updateData.settings = {
          ...existingSettings,
          enableAppointments: input.data.enableAppointments,
        };
      }

      // Update in database (store original prompt, not with knowledge)
      const agent = await ctx.db.agent.update({
        where: { id: input.id },
        data: updateData,
      });

      // Update knowledge document assignments if provided
      if (input.knowledgeDocumentIds !== undefined) {
        // First, unassign all documents from this agent
        await ctx.db.knowledgeDocument.updateMany({
          where: {
            agentId: input.id,
            organizationId: ctx.orgId,
          },
          data: { agentId: null },
        });

        // Then assign the new ones
        if (input.knowledgeDocumentIds.length > 0) {
          await ctx.db.knowledgeDocument.updateMany({
            where: {
              id: { in: input.knowledgeDocumentIds },
              organizationId: ctx.orgId,
            },
            data: { agentId: input.id },
          });
        }
      }

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
          log.error("Failed to delete Vapi assistant:", error);
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
          message: "Agent is not connected to voice system. Please click 'Create New' to connect it first.",
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

  // Sync agent knowledge to Vapi
  syncKnowledge: protectedProcedure
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

      if (!agent.vapiAssistantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is not connected to voice system yet",
        });
      }

      // Get knowledge content
      const knowledgeDocs = await ctx.db.knowledgeDocument.findMany({
        where: {
          agentId: input.id,
          organizationId: ctx.orgId,
          isActive: true,
        },
      });

      // Get enableAppointments from agent settings
      const agentSettings = (agent.settings as Record<string, unknown>) || {};
      const enableAppointments = (agentSettings.enableAppointments as boolean) || false;

      let knowledgeContent = "";
      if (knowledgeDocs.length > 0) {
        knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
          knowledgeDocs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
          "\n--- END KNOWLEDGE BASE ---";
      }

      let fullSystemPrompt = agent.systemPrompt + knowledgeContent;
      if (enableAppointments) {
        fullSystemPrompt += getAppointmentSystemPromptAddition();
      }

      // Get tools
      const tools = getAgentTools(enableAppointments);

      // Update Vapi
      await updateAssistant(agent.vapiAssistantId, {
        systemPrompt: fullSystemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        serverUrl: tools.length > 0 ? getVapiWebhookUrl() : undefined,
        serverUrlSecret: tools.length > 0 ? process.env.VAPI_WEBHOOK_SECRET : undefined,
      });

      return { success: true, documentsIncluded: knowledgeDocs.length };
    }),

  // Sync agent to Vapi (create or update)
  syncToVapi: protectedProcedure
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

      // Get enableAppointments from agent settings
      const agentSettings = (agent.settings as Record<string, unknown>) || {};
      const enableAppointments = (agentSettings.enableAppointments as boolean) || false;

      // Get knowledge content
      const knowledgeDocs = await ctx.db.knowledgeDocument.findMany({
        where: {
          agentId: input.id,
          organizationId: ctx.orgId,
          isActive: true,
        },
      });

      let knowledgeContent = "";
      if (knowledgeDocs.length > 0) {
        knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
          knowledgeDocs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
          "\n--- END KNOWLEDGE BASE ---";
      }

      let fullSystemPrompt = agent.systemPrompt + knowledgeContent;
      if (enableAppointments) {
        fullSystemPrompt += getAppointmentSystemPromptAddition();
      }

      // Get tools
      const tools = getAgentTools(enableAppointments);

      // If agent doesn't have a Vapi ID, create the assistant
      if (!agent.vapiAssistantId) {
        try {
          const vapiAssistant = await createAssistant({
            name: agent.name,
            systemPrompt: fullSystemPrompt,
            firstMessage: agent.firstMessage || undefined,
            voiceProvider: agent.voiceProvider,
            voiceId: agent.voiceId,
            modelProvider: agent.modelProvider,
            model: agent.model,
            tools: tools.length > 0 ? tools : undefined,
            serverUrl: tools.length > 0 ? getVapiWebhookUrl() : undefined,
            serverUrlSecret: tools.length > 0 ? process.env.VAPI_WEBHOOK_SECRET : undefined,
          });

          // Update agent with Vapi ID
          await ctx.db.agent.update({
            where: { id: input.id },
            data: { vapiAssistantId: vapiAssistant.id },
          });

          return {
            success: true,
            created: true,
            vapiAssistantId: vapiAssistant.id,
            documentsIncluded: knowledgeDocs.length,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          log.error("Failed to create voice assistant:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to connect agent: ${errorMessage}`,
          });
        }
      }

      // If agent has a Vapi ID, update the assistant
      try {
        await updateAssistant(agent.vapiAssistantId, {
          name: agent.name,
          systemPrompt: fullSystemPrompt,
          firstMessage: agent.firstMessage || undefined,
          voiceProvider: agent.voiceProvider,
          voiceId: agent.voiceId,
          modelProvider: agent.modelProvider,
          model: agent.model,
          tools: tools.length > 0 ? tools : undefined,
          serverUrl: tools.length > 0 ? getVapiWebhookUrl() : undefined,
          serverUrlSecret: tools.length > 0 ? process.env.VAPI_WEBHOOK_SECRET : undefined,
        });

        return {
          success: true,
          created: false,
          vapiAssistantId: agent.vapiAssistantId,
          documentsIncluded: knowledgeDocs.length,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Failed to update voice assistant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update agent: ${errorMessage}`,
        });
      }
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

  // Import an existing voice assistant ID to link it to this agent
  // Use this when the assistant was created externally
  importVapiId: protectedProcedure
    .input(z.object({
      id: z.string(), // VoxForge agent ID
      vapiAssistantId: z.string().min(1, "Voice System ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the agent exists and belongs to this org
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

      // Check if this Vapi ID is already used by another agent
      const existingAgent = await ctx.db.agent.findFirst({
        where: {
          vapiAssistantId: input.vapiAssistantId,
          id: { not: input.id },
        },
      });

      if (existingAgent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This Voice System ID is already linked to another agent",
        });
      }

      // Update the agent with the Vapi ID
      const updated = await ctx.db.agent.update({
        where: { id: input.id },
        data: { vapiAssistantId: input.vapiAssistantId },
      });

      return {
        success: true,
        agent: updated,
        message: `Voice assistant has been linked to agent "${agent.name}"`,
      };
    }),
});
