import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";
import { db } from "@/lib/db";
import {
  createCustomerProfile,
  getCustomerProfile,
  createEndUser,
  assignEntityToProfile,
  submitProfileForEvaluation,
  createTrustProduct,
  getTrustProduct,
  assignToTrustProduct,
  assignPhoneToTrustProduct,
  submitTrustProductForEvaluation,
} from "@/lib/twilio-trust-hub";

const log = createLogger("CNAM");

const businessProfileSchema = z.object({
  businessName: z.string().min(1).max(100),
  businessType: z.enum([
    "sole_proprietorship",
    "partnership",
    "llc",
    "corporation",
  ]),
  ein: z.string().max(20).optional(),
  businessAddress: z.string().min(1).max(200),
  businessCity: z.string().min(1).max(100),
  businessState: z.string().min(1).max(100),
  businessZip: z.string().min(1).max(20),
  businessCountry: z.string().length(2).default("US"),
  contactFirstName: z.string().min(1).max(50),
  contactLastName: z.string().min(1).max(50),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1).max(20),
});

async function getOrgTwilioCreds(
  prisma: typeof db,
  orgId: string
) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { twilioSubaccountSid: true, twilioAuthToken: true },
  });
  if (!org?.twilioSubaccountSid || !org?.twilioAuthToken) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Twilio account not configured. Please buy or import a phone number first.",
    });
  }
  return {
    accountSid: org.twilioSubaccountSid,
    authToken: org.twilioAuthToken,
  };
}

export const cnamRouter = router({
  // Get current CNAM profile for the organization
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.cnamProfile.findUnique({
      where: { organizationId: ctx.orgId! },
    });

    // Also get phone numbers with their CNAM status
    const phoneNumbers = await ctx.db.phoneNumber.findMany({
      where: { organizationId: ctx.orgId! },
      select: {
        id: true,
        number: true,
        friendlyName: true,
        callerIdName: true,
        cnamStatus: true,
        cnamSid: true,
        twilioSid: true,
        countryCode: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { profile, phoneNumbers };
  }),

  // Create or update the business profile
  createProfile: adminProcedure
    .input(businessProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.cnamProfile.findUnique({
        where: { organizationId: ctx.orgId! },
      });

      if (existing && existing.status === "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Business profile is already approved. Cannot modify.",
        });
      }

      // Upsert the profile locally
      const profile = await ctx.db.cnamProfile.upsert({
        where: { organizationId: ctx.orgId! },
        create: {
          organizationId: ctx.orgId!,
          ...input,
          status: "draft",
        },
        update: {
          ...input,
          status: "draft",
          rejectionReason: null,
        },
      });

      log.info(
        `Business profile ${existing ? "updated" : "created"} for org ${ctx.orgId}`
      );
      return profile;
    }),

  // Submit business profile to Twilio for verification
  submitForReview: adminProcedure.mutation(async ({ ctx }) => {
    const profile = await ctx.db.cnamProfile.findUnique({
      where: { organizationId: ctx.orgId! },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No business profile found. Create one first.",
      });
    }

    if (profile.status === "approved") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Profile is already approved.",
      });
    }

    if (
      profile.status === "pending_review" ||
      profile.status === "in_review"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Profile is already under review.",
      });
    }

    const { accountSid, authToken } = await getOrgTwilioCreds(
      ctx.db,
      ctx.orgId!
    );

    try {
      // Step 1: Create Customer Profile (if not already created)
      let customerProfileSid = profile.customerProfileSid;
      if (!customerProfileSid) {
        const cp = await createCustomerProfile(
          `${profile.businessName} - CNAM`,
          profile.contactEmail,
          accountSid,
          authToken
        );
        customerProfileSid = cp.sid;
        log.info(`Created Customer Profile ${cp.sid}`);
      }

      // Step 2: Create End User (if not already created)
      let endUserSid = profile.endUserSid;
      if (!endUserSid) {
        const eu = await createEndUser(
          {
            friendlyName: profile.businessName,
            businessName: profile.businessName,
            businessType: profile.businessType,
            ein: profile.ein || undefined,
            address: profile.businessAddress,
            city: profile.businessCity,
            state: profile.businessState,
            zip: profile.businessZip,
            country: profile.businessCountry,
          },
          accountSid,
          authToken
        );
        endUserSid = eu.sid;
        log.info(`Created End User ${eu.sid}`);
      }

      // Step 3: Assign End User to Customer Profile
      await assignEntityToProfile(
        customerProfileSid,
        endUserSid,
        accountSid,
        authToken
      ).catch((err) => {
        // May already be assigned from a previous attempt
        if (!String(err).includes("already exists")) throw err;
        log.info("End User already assigned to Customer Profile");
      });

      // Step 4: Submit for evaluation
      const evaluation = await submitProfileForEvaluation(
        customerProfileSid,
        accountSid,
        authToken
      );

      const newStatus =
        evaluation.status === "compliant" ? "approved" : "pending_review";

      // Update profile with Twilio SIDs and status
      const updated = await ctx.db.cnamProfile.update({
        where: { organizationId: ctx.orgId! },
        data: {
          customerProfileSid,
          endUserSid,
          status: newStatus,
          approvedAt: newStatus === "approved" ? new Date() : null,
        },
      });

      log.info(
        `Profile submitted for org ${ctx.orgId}, evaluation: ${evaluation.status}`
      );
      return { profile: updated, evaluation };
    } catch (error) {
      log.error("Failed to submit profile for review:", error);

      // Save partial progress (SIDs) even if submission fails
      await ctx.db.cnamProfile.update({
        where: { organizationId: ctx.orgId! },
        data: {
          status: "failed",
          rejectionReason:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit profile for review",
      });
    }
  }),

  // Check/refresh profile status from Twilio
  refreshStatus: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await ctx.db.cnamProfile.findUnique({
      where: { organizationId: ctx.orgId! },
    });

    if (!profile?.customerProfileSid) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No submitted profile found.",
      });
    }

    const { accountSid, authToken } = await getOrgTwilioCreds(
      ctx.db,
      ctx.orgId!
    );

    const cp = await getCustomerProfile(
      profile.customerProfileSid,
      accountSid,
      authToken
    );

    // Map Twilio status to our status
    let status: string;
    switch (cp.status) {
      case "twilio-approved":
        status = "approved";
        break;
      case "twilio-rejected":
        status = "rejected";
        break;
      case "in-review":
        status = "in_review";
        break;
      case "pending-review":
        status = "pending_review";
        break;
      default:
        status = "draft";
    }

    const updated = await ctx.db.cnamProfile.update({
      where: { organizationId: ctx.orgId! },
      data: {
        status,
        approvedAt:
          status === "approved" && !profile.approvedAt ? new Date() : profile.approvedAt,
      },
    });

    log.info(`Refreshed profile status for org ${ctx.orgId}: ${status}`);
    return updated;
  }),

  // Register CNAM for a specific phone number (requires approved profile)
  registerNumber: adminProcedure
    .input(
      z.object({
        phoneNumberId: z.string(),
        callerIdName: z
          .string()
          .min(1)
          .max(15, "CNAM must be 15 characters or fewer"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify profile is approved
      const profile = await ctx.db.cnamProfile.findUnique({
        where: { organizationId: ctx.orgId! },
      });

      if (!profile || profile.status !== "approved") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Business profile must be approved before registering CNAM.",
        });
      }

      // Get the phone number
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: { id: input.phoneNumberId, organizationId: ctx.orgId! },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found.",
        });
      }

      if (!phoneNumber.twilioSid) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Phone number must be a Twilio-managed number to register CNAM.",
        });
      }

      // Only US/CA numbers support CNAM
      const country = phoneNumber.countryCode || "US";
      if (!["US", "CA"].includes(country)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CNAM registration is only available for US and Canada numbers.",
        });
      }

      const { accountSid, authToken } = await getOrgTwilioCreds(
        ctx.db,
        ctx.orgId!
      );

      try {
        // Create Trust Product if not exists
        let trustProductSid = profile.trustProductSid;
        if (!trustProductSid) {
          const tp = await createTrustProduct(
            `${profile.businessName} - CNAM Numbers`,
            profile.contactEmail,
            accountSid,
            authToken
          );
          trustProductSid = tp.sid;

          // Assign the customer profile to the trust product
          await assignToTrustProduct(
            trustProductSid,
            profile.customerProfileSid!,
            accountSid,
            authToken
          ).catch((err) => {
            if (!String(err).includes("already exists")) throw err;
          });

          await ctx.db.cnamProfile.update({
            where: { organizationId: ctx.orgId! },
            data: { trustProductSid },
          });

          log.info(`Created Trust Product ${trustProductSid}`);
        }

        // Assign the phone number to the trust product
        const assignment = await assignPhoneToTrustProduct(
          trustProductSid,
          phoneNumber.twilioSid,
          accountSid,
          authToken
        );

        // Submit trust product for evaluation
        const evaluation = await submitTrustProductForEvaluation(
          trustProductSid,
          accountSid,
          authToken
        );

        const cnamStatus =
          evaluation.status === "compliant" ? "registered" : "pending";

        // Update phone number with CNAM status
        const updated = await ctx.db.phoneNumber.update({
          where: { id: input.phoneNumberId },
          data: {
            callerIdName: input.callerIdName,
            cnamStatus,
            cnamSid: assignment.sid,
          },
        });

        log.info(
          `Registered CNAM for ${phoneNumber.number}: "${input.callerIdName}" (${cnamStatus})`
        );
        return updated;
      } catch (error) {
        log.error("Failed to register CNAM:", error);

        // Mark as failed
        await ctx.db.phoneNumber.update({
          where: { id: input.phoneNumberId },
          data: {
            callerIdName: input.callerIdName,
            cnamStatus: "failed",
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to register CNAM",
        });
      }
    }),
});
