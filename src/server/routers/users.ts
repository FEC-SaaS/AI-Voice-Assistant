import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findFirst({
      where: {
        clerkId: ctx.userId,
        organizationId: ctx.orgId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
            onboardingComplete: true,
            settings: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  // List team members
  list: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "asc" },
    });
    return users;
  }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "manager", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: {
          id: input.userId,
          organizationId: ctx.orgId,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Cannot change owner's role
      if (user.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the owner's role",
        });
      }

      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return updated;
    }),

  // Remove team member (admin only)
  remove: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: {
          id: input.userId,
          organizationId: ctx.orgId,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Cannot remove owner
      if (user.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the organization owner",
        });
      }

      // Cannot remove yourself
      if (user.clerkId === ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove yourself",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
    }),

  // Update organization settings
  updateOrganization: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.settings && { settings: input.settings as Prisma.InputJsonValue }),
        },
      });

      return org;
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const org = await ctx.db.organization.update({
      where: { id: ctx.orgId },
      data: { onboardingComplete: true },
    });

    return org;
  }),
});
