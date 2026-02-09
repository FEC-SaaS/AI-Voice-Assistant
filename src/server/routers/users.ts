import { z } from "zod";
import { Prisma } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("Users");

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

  // Invite team member (admin only)
  inviteMember: adminProcedure
    .input(
      z.object({
        email: z.string().email("Please enter a valid email address"),
        role: z.enum(["admin", "manager", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the organization's Clerk org ID
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { clerkOrgId: true, name: true },
      });

      if (!org?.clerkOrgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization not properly configured",
        });
      }

      try {
        // Get the Clerk client
        const clerk = await clerkClient();

        // Create an organization invitation via Clerk
        const invitation = await clerk.organizations.createOrganizationInvitation({
          organizationId: org.clerkOrgId,
          emailAddress: input.email,
          role: "org:member", // Clerk role, we'll map our role separately
          inviterUserId: ctx.userId,
        });

        // Store the pending invitation with our custom role in database
        await ctx.db.pendingInvitation.create({
          data: {
            organizationId: ctx.orgId,
            email: input.email,
            role: input.role,
            clerkInvitationId: invitation.id,
            invitedById: ctx.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        return { success: true, invitationId: invitation.id };
      } catch (error) {
        log.error("Failed to create invitation:", error);

        // Handle specific Clerk errors
        if (error instanceof Error) {
          if (error.message.includes("already been invited")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This email has already been invited",
            });
          }
          if (error.message.includes("already a member")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This user is already a member of the organization",
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation. Please try again.",
        });
      }
    }),

  // List pending invitations (admin only)
  listInvitations: adminProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.pendingInvitation.findMany({
      where: {
        organizationId: ctx.orgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations;
  }),

  // Revoke invitation (admin only)
  revokeInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.pendingInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.orgId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      try {
        // Revoke in Clerk if we have the Clerk invitation ID
        if (invitation.clerkInvitationId) {
          const org = await ctx.db.organization.findUnique({
            where: { id: ctx.orgId },
            select: { clerkOrgId: true },
          });

          if (org?.clerkOrgId) {
            const clerk = await clerkClient();
            await clerk.organizations.revokeOrganizationInvitation({
              organizationId: org.clerkOrgId,
              invitationId: invitation.clerkInvitationId,
              requestingUserId: ctx.userId,
            });
          }
        }
      } catch (error) {
        log.error("Failed to revoke Clerk invitation:", error);
        // Continue to mark as revoked in our DB even if Clerk fails
      }

      // Mark as revoked in our database
      await ctx.db.pendingInvitation.update({
        where: { id: input.invitationId },
        data: { revokedAt: new Date() },
      });

      return { success: true };
    }),

  // Resend invitation (admin only)
  resendInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.pendingInvitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId: ctx.orgId,
          acceptedAt: null,
          revokedAt: null,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Revoke the old Clerk invitation and create a new one
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { clerkOrgId: true },
      });

      if (org?.clerkOrgId) {
        try {
          const clerk = await clerkClient();

          // Revoke old Clerk invitation if it exists
          if (invitation.clerkInvitationId) {
            try {
              await clerk.organizations.revokeOrganizationInvitation({
                organizationId: org.clerkOrgId,
                invitationId: invitation.clerkInvitationId,
                requestingUserId: ctx.userId,
              });
            } catch {
              // Old invitation may have already expired in Clerk — continue
            }
          }

          // Create a fresh Clerk invitation
          const newClerkInvitation = await clerk.organizations.createOrganizationInvitation({
            organizationId: org.clerkOrgId,
            emailAddress: invitation.email,
            role: "org:member",
            inviterUserId: ctx.userId,
          });

          // Update our DB record with new Clerk ID and extended expiration
          await ctx.db.pendingInvitation.update({
            where: { id: input.invitationId },
            data: {
              clerkInvitationId: newClerkInvitation.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        } catch (error) {
          log.error("Failed to resend invitation via Clerk:", error);
          // Fall back to just extending expiration
          await ctx.db.pendingInvitation.update({
            where: { id: input.invitationId },
            data: {
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      } else {
        // No Clerk org — just extend expiration
        await ctx.db.pendingInvitation.update({
          where: { id: input.invitationId },
          data: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return { success: true };
    }),
});
