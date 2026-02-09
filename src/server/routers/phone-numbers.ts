import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("PhoneNumbers");
import { importTwilioPhoneNumber, releasePhoneNumber as releaseVapiPhoneNumber, updatePhoneNumber as updateVapiPhoneNumber } from "@/lib/vapi";
import {
  createSubaccount,
  searchAvailableNumbers,
  buyPhoneNumber as buyTwilioNumber,
  releasePhoneNumber as releaseTwilioNumber,
  SUPPORTED_COUNTRIES,
  getCountryNumberTypes,
  getNumberPrice,
} from "@/lib/twilio";
import { enforcePhoneNumberLimit } from "../trpc/middleware";

export const phoneNumbersRouter = router({
  // List all phone numbers for the organization
  list: protectedProcedure.query(async ({ ctx }) => {
    const phoneNumbers = await ctx.db.phoneNumber.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: { id: true, name: true },
        },
      },
    });
    return phoneNumbers;
  }),

  // Get a single phone number
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          agent: true,
        },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found",
        });
      }

      return phoneNumber;
    }),

  // Get supported countries for phone number purchase
  getSupportedCountries: protectedProcedure.query(() => {
    return SUPPORTED_COUNTRIES;
  }),

  // Get number types available for a country
  getCountryNumberTypes: protectedProcedure
    .input(z.object({ countryCode: z.string().length(2) }))
    .query(({ input }) => {
      return getCountryNumberTypes(input.countryCode);
    }),

  // Search available phone numbers to purchase
  searchAvailable: protectedProcedure
    .input(
      z.object({
        countryCode: z.string().length(2),
        type: z.enum(["local", "toll-free", "mobile"]).default("local"),
        areaCode: z.string().optional(),
        contains: z.string().optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get or create Twilio subaccount for this organization
        const org = await ctx.db.organization.findUnique({
          where: { id: ctx.orgId },
        });

        if (!org) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }

        // Search using master account (subaccount not needed for search)
        const numbers = await searchAvailableNumbers({
          countryCode: input.countryCode,
          type: input.type,
          areaCode: input.areaCode,
          contains: input.contains,
          limit: input.limit,
        });

        // Add pricing info
        const price = getNumberPrice(input.countryCode, input.type);

        return {
          numbers,
          pricing: {
            monthlyBase: price,
            monthlySaaS: Math.ceil(price * 1.5 * 100) / 100, // 50% markup for SaaS
            currency: "USD",
          },
        };
      } catch (error) {
        log.error("Failed to search available numbers:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("20003") || errorMessage.includes("Authentication")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Phone number service is not configured. Please contact support.",
          });
        }

        // Trial account limitation (error code 20008 = upgrade required)
        if (errorMessage.includes("20008") || errorMessage.includes("upgrade")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Phone number search requires an upgraded Twilio account. Please upgrade at twilio.com or use 'Import from Twilio' instead.",
          });
        }

        // No numbers found for the search criteria
        if (errorMessage.includes("21452") || errorMessage.includes("no phone numbers found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No phone numbers available matching your criteria. Try a different area code, country, or number type.",
          });
        }

        // Country/type not available
        if (errorMessage.includes("21601") || errorMessage.includes("not available")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Phone numbers of this type are not available in the selected country. Try a different number type.",
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to search numbers: ${errorMessage}`,
        });
      }
    }),

  // Buy a phone number (SaaS-managed via Twilio)
  buyNumber: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
        countryCode: z.string().length(2),
        type: z.enum(["local", "toll-free", "mobile"]).default("local"),
        friendlyName: z.string().optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      // Get organization and ensure Twilio subaccount exists
      let org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      // Create Twilio subaccount if it doesn't exist
      if (!org.twilioSubaccountSid) {
        try {
          log.info(`Creating subaccount for org ${org.name}`);
          const subaccount = await createSubaccount(`CallTone - ${org.name}`);

          org = await ctx.db.organization.update({
            where: { id: ctx.orgId },
            data: {
              twilioSubaccountSid: subaccount.sid,
              twilioAuthToken: subaccount.auth_token,
            },
          });

          log.info(`Created subaccount ${subaccount.sid}`);
        } catch (error) {
          log.error("Failed to create subaccount:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to set up phone service. Please try again.",
          });
        }
      }

      // Buy the number in the subaccount
      let twilioNumber;
      try {
        twilioNumber = await buyTwilioNumber({
          phoneNumber: input.phoneNumber,
          friendlyName: input.friendlyName || `${org.name} - ${input.type}`,
          accountSid: org.twilioSubaccountSid!,
          authToken: org.twilioAuthToken!,
        });

        log.info(`Purchased number ${twilioNumber.phone_number}`);
      } catch (error) {
        log.error("Failed to buy number:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("21422") || errorMessage.includes("not available")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This number is no longer available. Please select another.",
          });
        }

        if (errorMessage.includes("21215") || errorMessage.includes("Geographic")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This number type is not available in your region.",
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to purchase number: ${errorMessage}`,
        });
      }

      // Import the number to Vapi for voice AI use
      let vapiPhone;
      try {
        vapiPhone = await importTwilioPhoneNumber({
          twilioAccountSid: org.twilioSubaccountSid!,
          twilioAuthToken: org.twilioAuthToken!,
          phoneNumber: twilioNumber.phone_number,
          name: input.friendlyName || `${org.name} - ${input.type}`,
        });

        log.info(`Imported number ${twilioNumber.phone_number} as ${vapiPhone.id}`);
      } catch (error) {
        log.error("Failed to import number:", error);
        // Number was purchased but Vapi import failed - still save it
        // Can retry Vapi import later
      }

      // Calculate monthly cost with markup
      const basePrice = getNumberPrice(input.countryCode, input.type);
      const monthlyCost = Math.ceil(basePrice * 1.5 * 100); // 50% markup, in cents

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone?.id || null,
          twilioSid: twilioNumber.sid,
          number: twilioNumber.phone_number,
          friendlyName: input.friendlyName,
          type: input.type === "toll-free" ? "toll_free" : input.type,
          provider: "twilio-managed",
          countryCode: input.countryCode,
          monthlyCost,
        },
      });

      return phoneNumber;
    }),

  // Import a client's own Twilio phone number
  importTwilio: protectedProcedure
    .input(
      z.object({
        twilioAccountSid: z.string().min(1, "Twilio Account SID is required"),
        twilioAuthToken: z.string().min(1, "Twilio Auth Token is required"),
        phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format"),
        friendlyName: z.string().optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      // Import the number to Vapi
      let vapiPhone;
      try {
        vapiPhone = await importTwilioPhoneNumber({
          twilioAccountSid: input.twilioAccountSid,
          twilioAuthToken: input.twilioAuthToken,
          phoneNumber: input.phoneNumber,
          name: input.friendlyName,
        });
      } catch (error) {
        log.error("Failed to import Twilio phone number:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("already exists")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This phone number is already imported to the voice system.",
          });
        }

        if (errorMessage.includes("20003") || errorMessage.includes("Authentication")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Twilio credentials. Please verify your Account SID and Auth Token.",
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to import phone number. Please verify your Twilio credentials and phone number.",
        });
      }

      // Determine country code from phone number
      let countryCode = "US";
      if (input.phoneNumber.startsWith("+1")) countryCode = "US";
      else if (input.phoneNumber.startsWith("+44")) countryCode = "GB";
      else if (input.phoneNumber.startsWith("+233")) countryCode = "GH";
      // Add more as needed

      // Always store/refresh the user's Twilio credentials on the org for SMS
      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          twilioSubaccountSid: input.twilioAccountSid,
          twilioAuthToken: input.twilioAuthToken,
        },
      });

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone.id,
          number: vapiPhone.number || vapiPhone.phoneNumber || input.phoneNumber,
          friendlyName: input.friendlyName,
          type: "local",
          provider: "twilio-imported",
          countryCode,
          monthlyCost: 0, // Client pays Twilio directly
        },
      });

      return phoneNumber;
    }),

  // Assign phone number to agent
  assignToAgent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        agentId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found",
        });
      }

      // Get the agent's vapiAssistantId if assigning
      let vapiAssistantId: string | null = null;
      if (input.agentId) {
        const agent = await ctx.db.agent.findFirst({
          where: {
            id: input.agentId,
            organizationId: ctx.orgId,
          },
        });

        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        vapiAssistantId = agent.vapiAssistantId;

        // Warn if agent is not connected to voice system
        if (!vapiAssistantId) {
          log.warn(`Agent ${input.agentId} is not connected to voice system`);
        }
      }

      // Sync to Vapi if phone number has a Vapi ID
      if (phoneNumber.vapiPhoneId) {
        try {
          // Set serverUrl so Vapi sends assistant-request for inbound calls,
          // allowing dynamic greeting based on business hours for receptionist agents.
          // assistantId acts as fallback if serverUrl is unavailable.
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const serverUrl = vapiAssistantId ? `${baseUrl}/api/webhooks/vapi` : undefined;
          const serverUrlSecret = vapiAssistantId ? process.env.VAPI_WEBHOOK_SECRET : undefined;

          await updateVapiPhoneNumber(phoneNumber.vapiPhoneId, {
            assistantId: vapiAssistantId, // null will unassign in Vapi
            serverUrl: vapiAssistantId ? serverUrl : undefined,
            serverUrlSecret: vapiAssistantId ? serverUrlSecret : undefined,
          });
          log.info(`${vapiAssistantId ? 'Assigned' : 'Unassigned'} phone number ${phoneNumber.vapiPhoneId} ${vapiAssistantId ? `to assistant ${vapiAssistantId}` : ''}`);
        } catch (error) {
          log.error("Failed to sync phone number assignment:", error);
          // Don't throw - save locally even if Vapi sync fails
          // User can retry or it will work on next assignment
        }
      }

      const updated = await ctx.db.phoneNumber.update({
        where: { id: input.id },
        data: { agentId: input.agentId },
        include: { agent: true },
      });

      return updated;
    }),

  // Release/delete a phone number
  release: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found",
        });
      }

      // Release from Vapi
      if (phoneNumber.vapiPhoneId) {
        try {
          await releaseVapiPhoneNumber(phoneNumber.vapiPhoneId);
          log.info(`Released phone number ${phoneNumber.vapiPhoneId}`);
        } catch (error) {
          log.error("Failed to release phone number from Vapi:", error);
          // Continue anyway - may have already been deleted
        }
      }

      // Release from Twilio if SaaS-managed
      if (phoneNumber.provider === "twilio-managed" && phoneNumber.twilioSid) {
        const org = await ctx.db.organization.findUnique({
          where: { id: ctx.orgId },
        });

        if (org?.twilioSubaccountSid && org?.twilioAuthToken) {
          try {
            await releaseTwilioNumber(
              phoneNumber.twilioSid,
              org.twilioSubaccountSid,
              org.twilioAuthToken
            );
            log.info(`Released phone number ${phoneNumber.twilioSid}`);
          } catch (error) {
            log.error("Failed to release phone number from Twilio:", error);
            // Continue anyway - may have already been deleted
          }
        }
      }

      // Delete from database
      await ctx.db.phoneNumber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Retry Vapi import for a number (if initial import failed)
  retryVapiImport: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const phoneNumber = await ctx.db.phoneNumber.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!phoneNumber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Phone number not found",
        });
      }

      if (phoneNumber.vapiPhoneId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Phone number is already synced.",
        });
      }

      if (phoneNumber.provider !== "twilio-managed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only SaaS-managed numbers can be retried.",
        });
      }

      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.orgId },
      });

      if (!org?.twilioSubaccountSid || !org?.twilioAuthToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization Twilio account not configured.",
        });
      }

      // Try to import to Vapi
      let vapiPhone;
      try {
        vapiPhone = await importTwilioPhoneNumber({
          twilioAccountSid: org.twilioSubaccountSid,
          twilioAuthToken: org.twilioAuthToken,
          phoneNumber: phoneNumber.number,
          name: phoneNumber.friendlyName || undefined,
        });
      } catch (error) {
        log.error("Failed to sync phone number:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync phone number. Please try again.",
        });
      }

      // Update database
      const updated = await ctx.db.phoneNumber.update({
        where: { id: input.id },
        data: { vapiPhoneId: vapiPhone.id },
      });

      return updated;
    }),

  // Update organization's Twilio credentials (for SMS sending)
  updateTwilioCredentials: protectedProcedure
    .input(
      z.object({
        twilioAccountSid: z.string().min(1, "Twilio Account SID is required"),
        twilioAuthToken: z.string().min(1, "Twilio Auth Token is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the credentials are valid by listing numbers
      try {
        const { listPhoneNumbers } = await import("@/lib/twilio");
        await listPhoneNumbers(input.twilioAccountSid, input.twilioAuthToken);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Twilio credentials. Please verify your Account SID and Auth Token.",
        });
      }

      await ctx.db.organization.update({
        where: { id: ctx.orgId },
        data: {
          twilioSubaccountSid: input.twilioAccountSid,
          twilioAuthToken: input.twilioAuthToken,
        },
      });

      return { success: true };
    }),

  // Get organization's Twilio credential status (not the actual credentials)
  getTwilioStatus: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { twilioSubaccountSid: true },
    });

    return {
      hasCredentials: !!org?.twilioSubaccountSid,
    };
  }),
});
