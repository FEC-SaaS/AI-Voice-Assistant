import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Email settings schema
const emailSettingsSchema = z.object({
  emailBusinessName: z.string().optional(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailReplyTo: z.string().email().optional().nullable(),
  emailPrimaryColor: z.string().optional(),
  emailLogoUrl: z.string().url().optional().nullable(),
});

export const organizationRouter = router({
  // Get current organization details
  get: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        onboardingComplete: true,
        createdAt: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return org;
  }),

  // Get email settings
  getEmailSettings: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        name: true,
        settings: true,
      },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const settings = org.settings as Record<string, unknown> | null;

    return {
      // Default to org name if no business name set
      emailBusinessName: (settings?.emailBusinessName as string) || org.name,
      emailFromAddress: settings?.emailFromAddress as string | null,
      emailReplyTo: settings?.emailReplyTo as string | null,
      emailPrimaryColor: (settings?.emailPrimaryColor as string) || "#22c55e",
      emailLogoUrl: settings?.emailLogoUrl as string | null,
      // Info about the organization
      organizationName: org.name,
    };
  }),

  // Update email settings
  updateEmailSettings: adminProcedure
    .input(emailSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { settings: true },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const currentSettings = (org.settings as Record<string, unknown>) || {};

      // Merge new email settings with existing settings
      const updatedSettings = {
        ...currentSettings,
        emailBusinessName: input.emailBusinessName,
        emailFromAddress: input.emailFromAddress,
        emailReplyTo: input.emailReplyTo,
        emailPrimaryColor: input.emailPrimaryColor,
        emailLogoUrl: input.emailLogoUrl,
      };

      // Remove null/undefined values
      const cleanedSettings: Record<string, unknown> = {};
      Object.keys(updatedSettings).forEach((key) => {
        const value = updatedSettings[key as keyof typeof updatedSettings];
        if (value !== null && value !== undefined) {
          cleanedSettings[key] = value;
        }
      });

      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          settings: cleanedSettings as object,
        },
      });

      return { success: true };
    }),

  // Update organization name
  updateName: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: { name: input.name },
      });

      return { success: true };
    }),
});
