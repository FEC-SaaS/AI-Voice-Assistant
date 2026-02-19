import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const securityRouter = router({
  getAuditLogs: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        orgId: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.orgId) where.organizationId = input.orgId;
      if (input.action) where.action = { contains: input.action, mode: "insensitive" };

      const [logs, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          include: {
            organization: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
        ctx.db.auditLog.count({ where }),
      ]);

      return { logs, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getDNCStats: superAdminProcedure.query(async ({ ctx }) => {
    const [total, bySource] = await Promise.all([
      ctx.db.dNCEntry.count(),
      ctx.db.dNCEntry.groupBy({
        by: ["source"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);
    return {
      total,
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
    };
  }),

  getApiKeyStats: superAdminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, active, recentlyUsed, revoked] = await Promise.all([
      ctx.db.apiKey.count(),
      ctx.db.apiKey.count({ where: { revokedAt: null } }),
      ctx.db.apiKey.count({ where: { lastUsedAt: { gte: thirtyDaysAgo } } }),
      ctx.db.apiKey.count({ where: { revokedAt: { not: null } } }),
    ]);

    // Top recently used
    const topKeys = await ctx.db.apiKey.findMany({
      where: { revokedAt: null, lastUsedAt: { not: null } },
      orderBy: { lastUsedAt: "desc" },
      take: 20,
      select: {
        id: true, keyPrefix: true, lastUsedAt: true, createdAt: true,
        organization: { select: { id: true, name: true } },
      },
    });

    return { total, active, recentlyUsed, revoked, topKeys };
  }),
});
