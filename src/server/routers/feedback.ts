import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        type: z.enum(["nps", "feature_request", "bug_report", "general"]),
        score: z.number().int().min(0).max(10).optional(),
        message: z.string().max(2000).optional(),
        category: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.feedback.create({
        data: {
          organizationId: ctx.orgId,
          userClerkId: ctx.userId,
          type: input.type,
          score: input.score,
          message: input.message,
          category: input.category,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      return { success: true };
    }),
});
