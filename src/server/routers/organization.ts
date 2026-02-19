import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  addDomain,
  getDomain,
  verifyDomain,
  removeDomain,
} from "@/lib/resend-domains";
import { canHidePoweredBy } from "@/lib/plan-features";

// Email settings schema
const emailSettingsSchema = z.object({
  emailBusinessName: z.string().optional(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailPrimaryColor: z.string().optional(),
  emailLogoUrl: z.string().url().optional().nullable(),
});

// Branding settings schema
const brandingSettingsSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  brandLogoUrl: z.string().url().optional().nullable(),
  brandFaviconUrl: z.string().url().optional().nullable(),
  brandPrimaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  brandAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  poweredByHidden: z.boolean().optional(),
});

export const organizationRouter = router({
  // Get branding settings
  getBranding: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        name: true,
        planId: true,
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
      brandName: (settings?.brandName as string) || org.name,
      brandLogoUrl: (settings?.brandLogoUrl as string) || null,
      brandFaviconUrl: (settings?.brandFaviconUrl as string) || null,
      brandPrimaryColor: (settings?.brandPrimaryColor as string) || null,
      brandAccentColor: (settings?.brandAccentColor as string) || null,
      poweredByHidden: (settings?.poweredByHidden as boolean) || false,
      planId: org.planId,
    };
  }),

  // Update branding settings
  updateBranding: adminProcedure
    .input(brandingSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { settings: true, planId: true },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Gate "powered by" hiding behind plan tier
      if (input.poweredByHidden === true && !canHidePoweredBy(org.planId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Hiding 'Powered by CallTone' requires a Business plan or higher.",
        });
      }

      const currentSettings = (org.settings as Record<string, unknown>) || {};

      const updatedSettings: Record<string, unknown> = { ...currentSettings };

      // Merge only provided fields
      if (input.brandName !== undefined)
        updatedSettings.brandName = input.brandName;
      if (input.brandLogoUrl !== undefined)
        updatedSettings.brandLogoUrl = input.brandLogoUrl;
      if (input.brandFaviconUrl !== undefined)
        updatedSettings.brandFaviconUrl = input.brandFaviconUrl;
      if (input.brandPrimaryColor !== undefined)
        updatedSettings.brandPrimaryColor = input.brandPrimaryColor;
      if (input.brandAccentColor !== undefined)
        updatedSettings.brandAccentColor = input.brandAccentColor;
      if (input.poweredByHidden !== undefined)
        updatedSettings.poweredByHidden = input.poweredByHidden;

      // Remove null values
      Object.keys(updatedSettings).forEach((key) => {
        if (updatedSettings[key] === null) {
          delete updatedSettings[key];
        }
      });

      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          settings: updatedSettings as object,
        },
      });

      return { success: true };
    }),

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

  // ============ Custom Email Domain Management ============

  // Get custom domain status
  getCustomDomain: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const domainId = settings?.customDomainId as string | null;
    const domainName = settings?.customDomainName as string | null;

    if (!domainId) {
      return {
        hasCustomDomain: false,
        domain: null,
      };
    }

    // Get latest status from Resend
    const result = await getDomain(domainId);

    if (!result.success || !result.domain) {
      return {
        hasCustomDomain: true,
        domain: {
          id: domainId,
          name: domainName || "Unknown",
          status: "failed" as const,
          records: [],
        },
        error: result.error,
      };
    }

    return {
      hasCustomDomain: true,
      domain: result.domain,
    };
  }),

  // Add a custom domain
  addCustomDomain: adminProcedure
    .input(
      z.object({
        domain: z.string().min(3).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate domain format (basic validation)
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(input.domain)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain format. Example: mail.yourbusiness.com",
        });
      }

      // Check if org already has a domain
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { settings: true },
      });

      const settings = org?.settings as Record<string, unknown> | null;
      if (settings?.customDomainId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A custom domain is already configured. Remove it first before adding a new one.",
        });
      }

      // Add domain to Resend
      const result = await addDomain(input.domain);

      if (!result.success || !result.domain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to add domain to email provider",
        });
      }

      // Save domain info to organization settings
      const currentSettings = (org?.settings as Record<string, unknown>) || {};
      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          settings: {
            ...currentSettings,
            customDomainId: result.domain.id,
            customDomainName: result.domain.name,
            customDomainStatus: result.domain.status,
          } as object,
        },
      });

      return {
        success: true,
        domain: result.domain,
      };
    }),

  // Verify custom domain DNS records
  verifyCustomDomain: adminProcedure.mutation(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const domainId = settings?.customDomainId as string | null;

    if (!domainId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No custom domain configured",
      });
    }

    // Trigger verification in Resend
    const result = await verifyDomain(domainId);

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error || "Failed to verify domain",
      });
    }

    // Get updated domain info
    const domainResult = await getDomain(domainId);

    // Update status in settings
    if (domainResult.success && domainResult.domain) {
      const currentSettings = (org?.settings as Record<string, unknown>) || {};
      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          settings: {
            ...currentSettings,
            customDomainStatus: domainResult.domain.status,
            // Auto-set from address if verified
            ...(domainResult.domain.status === "verified" && {
              emailFromAddress: `noreply@${domainResult.domain.name}`,
            }),
          } as object,
        },
      });
    }

    return {
      success: true,
      status: result.status,
      domain: domainResult.domain,
    };
  }),

  // Get notification preferences
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const s = (org?.settings as Record<string, unknown>) ?? {};

    return {
      notifyCallCompleted:   (s.notifyCallCompleted   as boolean) ?? true,
      notifyDailyDigest:     (s.notifyDailyDigest     as boolean) ?? true,
      notifyCampaignCompleted:(s.notifyCampaignCompleted as boolean) ?? true,
      notifyWeeklyReport:    (s.notifyWeeklyReport    as boolean) ?? false,
      notifyAgentErrors:     (s.notifyAgentErrors     as boolean) ?? true,
      notifyBillingAlerts:   (s.notifyBillingAlerts   as boolean) ?? true,
    };
  }),

  // Update notification preferences (any member can update their org prefs)
  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        notifyCallCompleted:    z.boolean().optional(),
        notifyDailyDigest:      z.boolean().optional(),
        notifyCampaignCompleted:z.boolean().optional(),
        notifyWeeklyReport:     z.boolean().optional(),
        notifyAgentErrors:      z.boolean().optional(),
        notifyBillingAlerts:    z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { settings: true },
      });

      const current = (org?.settings as Record<string, unknown>) ?? {};
      const updated = { ...current };

      if (input.notifyCallCompleted    !== undefined) updated.notifyCallCompleted    = input.notifyCallCompleted;
      if (input.notifyDailyDigest      !== undefined) updated.notifyDailyDigest      = input.notifyDailyDigest;
      if (input.notifyCampaignCompleted!== undefined) updated.notifyCampaignCompleted= input.notifyCampaignCompleted;
      if (input.notifyWeeklyReport     !== undefined) updated.notifyWeeklyReport     = input.notifyWeeklyReport;
      if (input.notifyAgentErrors      !== undefined) updated.notifyAgentErrors      = input.notifyAgentErrors;
      if (input.notifyBillingAlerts    !== undefined) updated.notifyBillingAlerts    = input.notifyBillingAlerts;

      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: { settings: updated as object },
      });

      return { success: true };
    }),

  // Remove custom domain
  removeCustomDomain: adminProcedure.mutation(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { settings: true },
    });

    const settings = org?.settings as Record<string, unknown> | null;
    const domainId = settings?.customDomainId as string | null;

    if (!domainId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No custom domain configured",
      });
    }

    // Remove from Resend
    const result = await removeDomain(domainId);

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error || "Failed to remove domain",
      });
    }

    // Remove from organization settings
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const {
      customDomainId: _id,
      customDomainName: _name,
      customDomainStatus: _status,
      emailFromAddress: _from,
      ...restSettings
    } = currentSettings;

    await ctx.db.organization.update({
      where: { id: ctx.orgId },
      data: {
        settings: restSettings as object,
      },
    });

    return { success: true };
  }),
});
