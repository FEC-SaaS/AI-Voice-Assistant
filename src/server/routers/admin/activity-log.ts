import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure, logAdminAction } from "../../trpc/admin-middleware";

export const activityLogRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        adminClerkId: z.string().optional(),
        action: z.string().optional(),
        targetType: z.string().optional(),
        since: z.string().optional(), // ISO date string
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.adminClerkId) where.adminClerkId = input.adminClerkId;
      if (input.action) where.action = { contains: input.action, mode: "insensitive" };
      if (input.targetType) where.targetType = input.targetType;
      if (input.since) where.createdAt = { gte: new Date(input.since) };

      const [logs, total] = await Promise.all([
        ctx.db.adminActivityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
        ctx.db.adminActivityLog.count({ where }),
      ]);

      return { logs, total, pages: Math.ceil(total / input.pageSize) };
    }),

  logAction: superAdminProcedure
    .input(
      z.object({
        action: z.string(),
        targetType: z.string().optional(),
        targetId: z.string().optional(),
        details: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await logAdminAction(ctx.db, {
        adminClerkId: ctx.userId!,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: input.details as Record<string, unknown>,
      });
      return { success: true };
    }),
});
