import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const adminIntegrationsRouter = router({
  getIntegrationHealth: superAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.integration.groupBy({
      by: ["type", "status"],
      _count: { id: true },
      orderBy: { type: "asc" },
    });

    // Pivot into type -> { connected, error, disconnected }
    const byType: Record<string, { connected: number; error: number; disconnected: number }> = {};
    for (const row of rows) {
      if (!byType[row.type]) byType[row.type] = { connected: 0, error: 0, disconnected: 0 };
      const entry = byType[row.type]!;
      const s = row.status as "connected" | "error" | "disconnected";
      entry[s] = (entry[s] || 0) + row._count.id;
    }

    return Object.entries(byType).map(([type, counts]) => ({
      type,
      ...counts,
      total: counts.connected + counts.error + counts.disconnected,
    }));
  }),

  getWebhookDeliveryRates: superAdminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, successful] = await Promise.all([
      ctx.db.webhookLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.webhookLog.count({ where: { createdAt: { gte: thirtyDaysAgo }, success: true } }),
    ]);
    const rate = total > 0 ? Math.round((successful / total) * 100) : 100;

    // Per-endpoint breakdown (top 20)
    const endpoints = await ctx.db.webhookEndpoint.findMany({
      include: {
        _count: { select: { logs: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return { total, successful, rate, endpoints };
  }),

  getOAuthErrors: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.integration.findMany({
      where: { status: "error" },
      select: {
        id: true, type: true, status: true, errorMessage: true, updatedAt: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }),
});
