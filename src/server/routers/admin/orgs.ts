import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure, logAdminAction } from "../../trpc/admin-middleware";

export const orgsRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        planId: z.string().optional(),
        suspended: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { slug: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.planId) where.planId = input.planId;
      if (input.suspended === true) where.suspendedAt = { not: null };
      if (input.suspended === false) where.suspendedAt = null;

      const [orgs, total] = await Promise.all([
        ctx.db.organization.findMany({
          where,
          include: {
            _count: {
              select: { users: true, calls: true, agents: true, campaigns: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
        ctx.db.organization.count({ where }),
      ]);

      return {
        orgs,
        total,
        pages: Math.ceil(total / input.pageSize),
        page: input.page,
      };
    }),

  getOne: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          users: { orderBy: { createdAt: "asc" } },
          agents: { select: { id: true, name: true, isActive: true, createdAt: true } },
          campaigns: { select: { id: true, name: true, status: true, createdAt: true }, take: 10, orderBy: { createdAt: "desc" } },
          _count: {
            select: {
              users: true,
              agents: true,
              calls: true,
              contacts: true,
              phoneNumbers: true,
              appointments: true,
              apiKeys: true,
              integrations: true,
            },
          },
          auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
      if (!org) return null;

      // Call stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [callsThisMonth, totalMinutes] = await Promise.all([
        ctx.db.call.count({ where: { organizationId: input.orgId, createdAt: { gte: startOfMonth } } }),
        ctx.db.call.aggregate({
          where: { organizationId: input.orgId },
          _sum: { durationSeconds: true },
        }),
      ]);

      return {
        ...org,
        callsThisMonth,
        totalMinutesAllTime: Math.round((totalMinutes._sum.durationSeconds || 0) / 60),
      };
    }),

  suspendOrg: superAdminProcedure
    .input(z.object({ orgId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: input.orgId },
        data: { suspendedAt: new Date() },
      });
      await logAdminAction(ctx.db, {
        adminClerkId: ctx.userId!,
        action: "suspend_org",
        targetType: "Organization",
        targetId: input.orgId,
        details: { reason: input.reason, orgName: org.name },
      });
      return { success: true };
    }),

  unsuspendOrg: superAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: input.orgId },
        data: { suspendedAt: null },
      });
      await logAdminAction(ctx.db, {
        adminClerkId: ctx.userId!,
        action: "unsuspend_org",
        targetType: "Organization",
        targetId: input.orgId,
        details: { orgName: org.name },
      });
      return { success: true };
    }),

  extendTrial: superAdminProcedure
    .input(z.object({ orgId: z.string(), days: z.number().int().min(1).max(365) }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({ where: { id: input.orgId } });
      if (!org) throw new Error("Organization not found");
      const base = org.trialExpiresAt && org.trialExpiresAt > new Date() ? org.trialExpiresAt : new Date();
      const newExpiry = new Date(base.getTime() + input.days * 24 * 60 * 60 * 1000);
      await ctx.db.organization.update({
        where: { id: input.orgId },
        data: { trialExpiresAt: newExpiry },
      });
      await logAdminAction(ctx.db, {
        adminClerkId: ctx.userId!,
        action: "extend_trial",
        targetType: "Organization",
        targetId: input.orgId,
        details: { days: input.days, newExpiry: newExpiry.toISOString() },
      });
      return { success: true, newExpiry };
    }),

  changePlan: superAdminProcedure
    .input(z.object({ orgId: z.string(), planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: input.orgId },
        data: { planId: input.planId },
      });
      await logAdminAction(ctx.db, {
        adminClerkId: ctx.userId!,
        action: "change_plan",
        targetType: "Organization",
        targetId: input.orgId,
        details: { newPlan: input.planId, orgName: org.name },
      });
      return { success: true };
    }),
});
