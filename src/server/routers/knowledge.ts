import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { updateAssistant } from "@/lib/vapi";

// Helper function to sync knowledge to agent's voice assistant
async function syncKnowledgeToAgent(
  db: typeof import("@/lib/db").db,
  agentId: string,
  orgId: string
) {
  // Get the agent
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId: orgId },
  });

  if (!agent || !agent.vapiAssistantId) {
    return; // Can't sync if no agent or no voice assistant ID
  }

  // Get all knowledge documents for this agent
  const knowledgeDocs = await db.knowledgeDocument.findMany({
    where: {
      agentId: agentId,
      organizationId: orgId,
      isActive: true,
    },
  });

  // Build the full system prompt with knowledge
  let knowledgeContent = "";
  if (knowledgeDocs.length > 0) {
    knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
      knowledgeDocs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
      "\n--- END KNOWLEDGE BASE ---";
  }

  const fullSystemPrompt = agent.systemPrompt + knowledgeContent;

  // Update the voice assistant
  try {
    await updateAssistant(agent.vapiAssistantId, {
      systemPrompt: fullSystemPrompt,
    });
    console.log(`[Knowledge] Auto-synced ${knowledgeDocs.length} documents to agent ${agentId}`);
  } catch (error) {
    console.error("[Knowledge] Failed to auto-sync to voice assistant:", error);
    // Don't throw - knowledge is saved, sync just failed
  }
}

export const knowledgeRouter = router({
  // List all knowledge documents
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const documents = await ctx.db.knowledgeDocument.findMany({
        where: {
          organizationId: ctx.orgId,
          ...(input.agentId && { agentId: input.agentId }),
        },
        orderBy: { createdAt: "desc" },
      });
      return documents;
    }),

  // Get a single document
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.knowledgeDocument.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  // Create a new document
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum(["pdf", "docx", "url", "manual"]),
        agentId: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If agentId is provided, verify it exists
      if (input.agentId) {
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
      }

      const document = await ctx.db.knowledgeDocument.create({
        data: {
          organizationId: ctx.orgId,
          agentId: input.agentId,
          name: input.name,
          type: input.type,
          sourceUrl: input.sourceUrl,
          content: input.content,
        },
      });

      return document;
    }),

  // Update a document
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          content: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.knowledgeDocument.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const document = await ctx.db.knowledgeDocument.update({
        where: { id: input.id },
        data: input.data,
      });

      // Auto-sync to agent if this document is assigned to one
      if (document.agentId) {
        await syncKnowledgeToAgent(ctx.db, document.agentId, ctx.orgId);
      }

      return document;
    }),

  // Delete a document
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.knowledgeDocument.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Store agentId before deletion
      const agentId = document.agentId;

      await ctx.db.knowledgeDocument.delete({
        where: { id: input.id },
      });

      // Auto-sync to agent to remove this document from knowledge base
      if (agentId) {
        await syncKnowledgeToAgent(ctx.db, agentId, ctx.orgId);
      }

      return { success: true };
    }),

  // Assign document to agent
  assignToAgent: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        agentId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.knowledgeDocument.findFirst({
        where: {
          id: input.documentId,
          organizationId: ctx.orgId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Track the previous agent to sync it as well (if removing from an agent)
      const previousAgentId = document.agentId;

      if (input.agentId) {
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
      }

      const updated = await ctx.db.knowledgeDocument.update({
        where: { id: input.documentId },
        data: { agentId: input.agentId },
      });

      // Auto-sync knowledge to the new agent (if assigned)
      if (input.agentId) {
        await syncKnowledgeToAgent(ctx.db, input.agentId, ctx.orgId);
      }

      // Also sync the previous agent (if it had this document and we're removing it)
      if (previousAgentId && previousAgentId !== input.agentId) {
        await syncKnowledgeToAgent(ctx.db, previousAgentId, ctx.orgId);
      }

      return updated;
    }),

  // Get combined knowledge content for an agent
  getAgentKnowledge: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const documents = await ctx.db.knowledgeDocument.findMany({
        where: {
          organizationId: ctx.orgId,
          agentId: input.agentId,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Combine all knowledge content into a formatted string
      if (documents.length === 0) {
        return { documents: [], combinedContent: "" };
      }

      const combinedContent = documents
        .map((doc) => {
          const header = `=== ${doc.name} ===`;
          const content = doc.content || "(No content)";
          return `${header}\n${content}`;
        })
        .join("\n\n");

      return {
        documents,
        combinedContent: `\n\n--- KNOWLEDGE BASE ---\n${combinedContent}\n--- END KNOWLEDGE BASE ---`,
      };
    }),
});
