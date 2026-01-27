import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

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

      await ctx.db.knowledgeDocument.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
