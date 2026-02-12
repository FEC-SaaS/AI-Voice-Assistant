import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("PhoneNumbers");
import { importTwilioPhoneNumber, releasePhoneNumber as releaseVapiPhoneNumber, updatePhoneNumber as updateVapiPhoneNumber } from "@/lib/vapi";
import {
  createSubaccount,
  searchAvailableNumbers,
  buyPhoneNumber as buyTwilioNumber,
  releasePhoneNumber as releaseTwilioNumber,
  updatePhoneNumber as updateTwilioNumber,
  listPhoneNumbers as listTwilioNumbers,
  listMessagingServiceNumbers,
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

        // Search using master account credentials (subaccount not needed for search)
        const masterSid = process.env.TWILIO_ACCOUNT_SID;
        const masterToken = process.env.TWILIO_AUTH_TOKEN;

        if (!masterSid || !masterToken) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Phone number service is not configured. Please contact support.",
          });
        }

        const numbers = await searchAvailableNumbers({
          countryCode: input.countryCode,
          type: input.type,
          areaCode: input.areaCode,
          contains: input.contains,
          limit: input.limit,
          accountSid: masterSid,
          authToken: masterToken,
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
        callerIdName: z.string().max(15, "Caller ID name must be 15 characters or fewer").optional(),
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
          friendlyName: input.callerIdName || input.friendlyName || `${org.name} - ${input.type}`,
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
          callerIdName: input.callerIdName || null,
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
        callerIdName: z.string().max(15, "Caller ID name must be 15 characters or fewer").optional(),
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

      // Update Twilio FriendlyName if callerIdName is provided
      if (input.callerIdName) {
        try {
          // List the numbers on the client's account to find the SID
          const { listPhoneNumbers } = await import("@/lib/twilio");
          const numbers = await listPhoneNumbers(input.twilioAccountSid, input.twilioAuthToken);
          const matched = numbers.find(
            (n) => n.phone_number === input.phoneNumber
          );
          if (matched) {
            await updateTwilioNumber(
              matched.sid,
              { friendlyName: input.callerIdName },
              input.twilioAccountSid,
              input.twilioAuthToken
            );
            log.info(`Set caller ID name "${input.callerIdName}" on ${input.phoneNumber}`);
          }
        } catch (error) {
          log.warn("Could not update Twilio caller ID name:", error);
          // Non-fatal — continue saving
        }
      }

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone.id,
          number: vapiPhone.number || vapiPhone.phoneNumber || input.phoneNumber,
          friendlyName: input.friendlyName,
          callerIdName: input.callerIdName || null,
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

      // Pool numbers: return to the pool instead of deleting from Twilio
      if (phoneNumber.provider === "pool" && phoneNumber.twilioSid) {
        await ctx.db.phoneNumberPool.updateMany({
          where: { twilioSid: phoneNumber.twilioSid },
          data: {
            status: "available",
            organizationId: null,
            assignedAt: null,
          },
        });
        log.info(`Returned pool number ${phoneNumber.twilioSid} to available pool`);
      } else if (phoneNumber.provider === "twilio-managed" && phoneNumber.twilioSid) {
        // Release from Twilio if SaaS-managed
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

      if (!["twilio-managed", "pool"].includes(phoneNumber.provider)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only managed and pool numbers can be retried.",
        });
      }

      // Pool numbers use parent account credentials; managed use subaccount
      let twilioAccountSid: string;
      let twilioAuthToken: string;

      if (phoneNumber.provider === "pool") {
        const parentSid = process.env.TWILIO_ACCOUNT_SID;
        const parentToken = process.env.TWILIO_AUTH_TOKEN;
        if (!parentSid || !parentToken) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Twilio parent account not configured.",
          });
        }
        twilioAccountSid = parentSid;
        twilioAuthToken = parentToken;
      } else {
        const org = await ctx.db.organization.findUnique({
          where: { id: ctx.orgId },
        });
        if (!org?.twilioSubaccountSid || !org?.twilioAuthToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization Twilio account not configured.",
          });
        }
        twilioAccountSid = org.twilioSubaccountSid;
        twilioAuthToken = org.twilioAuthToken;
      }

      // Try to import to Vapi
      let vapiPhone;
      try {
        vapiPhone = await importTwilioPhoneNumber({
          twilioAccountSid,
          twilioAuthToken,
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

  // Update caller ID name (CNAM) for a phone number
  updateCallerIdName: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        callerIdName: z.string().max(15, "Caller ID name must be 15 characters or fewer"),
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

      // Propagate to Twilio if we have the SID and credentials
      if (phoneNumber.twilioSid) {
        const org = await ctx.db.organization.findUnique({
          where: { id: ctx.orgId },
        });

        if (org?.twilioSubaccountSid && org?.twilioAuthToken) {
          try {
            await updateTwilioNumber(
              phoneNumber.twilioSid,
              { friendlyName: input.callerIdName },
              org.twilioSubaccountSid,
              org.twilioAuthToken
            );
            log.info(`Updated caller ID name for ${phoneNumber.number} to "${input.callerIdName}"`);
          } catch (error) {
            log.error("Failed to update Twilio caller ID name:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update caller ID on Twilio. Please try again.",
            });
          }
        }
      }

      // For imported numbers without a twilioSid, try to find and update
      if (!phoneNumber.twilioSid && phoneNumber.provider === "twilio-imported") {
        const org = await ctx.db.organization.findUnique({
          where: { id: ctx.orgId },
        });

        if (org?.twilioSubaccountSid && org?.twilioAuthToken) {
          try {
            const { listPhoneNumbers } = await import("@/lib/twilio");
            const numbers = await listPhoneNumbers(org.twilioSubaccountSid, org.twilioAuthToken);
            const matched = numbers.find(
              (n) => n.phone_number === phoneNumber.number
            );
            if (matched) {
              await updateTwilioNumber(
                matched.sid,
                { friendlyName: input.callerIdName },
                org.twilioSubaccountSid,
                org.twilioAuthToken
              );
              // Store the twilioSid for future updates
              await ctx.db.phoneNumber.update({
                where: { id: input.id },
                data: { twilioSid: matched.sid },
              });
              log.info(`Updated caller ID name for ${phoneNumber.number} to "${input.callerIdName}"`);
            }
          } catch (error) {
            log.warn("Could not update Twilio caller ID for imported number:", error);
            // Non-fatal for imported numbers — save locally anyway
          }
        }
      }

      const updated = await ctx.db.phoneNumber.update({
        where: { id: input.id },
        data: { callerIdName: input.callerIdName },
        include: { agent: true },
      });

      return updated;
    }),

  // ================================================================
  // Messaging Service Numbers (primary provisioning flow)
  // ================================================================

  // List available numbers from the Twilio Messaging Service
  // These are pre-registered A2P-compliant numbers ready for SMS
  listServiceNumbers: protectedProcedure.query(async ({ ctx }) => {
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (!messagingServiceSid) {
      return { numbers: [], hasService: false };
    }

    try {
      // Fetch all numbers in the Messaging Service
      const serviceNumbers = await listMessagingServiceNumbers(messagingServiceSid);

      // Get all numbers already assigned to any org in the DB
      const assignedNumbers = await ctx.db.phoneNumber.findMany({
        select: { number: true },
      });
      const assignedSet = new Set(assignedNumbers.map((n) => n.number));

      // Filter out already-assigned numbers
      const available = serviceNumbers
        .filter((sn) => !assignedSet.has(sn.phone_number))
        .map((sn) => {
          // Extract area code from US/CA numbers
          let areaCode: string | undefined;
          if (sn.phone_number.startsWith("+1") && sn.phone_number.length === 12) {
            areaCode = sn.phone_number.slice(2, 5);
          }

          // Determine type
          let type = "local";
          const num = sn.phone_number;
          if (num.startsWith("+1800") || num.startsWith("+1888") || num.startsWith("+1877") ||
              num.startsWith("+1866") || num.startsWith("+1855") || num.startsWith("+1844") ||
              num.startsWith("+1833") || num.startsWith("+1822")) {
            type = "toll_free";
          }

          return {
            sid: sn.sid,
            phoneNumber: sn.phone_number,
            countryCode: sn.country_code || "US",
            capabilities: sn.capabilities || [],
            areaCode,
            type,
          };
        });

      return { numbers: available, hasService: true };
    } catch (error) {
      log.error("Failed to list Messaging Service numbers:", error);
      return { numbers: [], hasService: true };
    }
  }),

  // Claim a number from the Messaging Service for the org
  claimServiceNumber: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
        twilioSid: z.string(), // The SID from the Messaging Service listing
        friendlyName: z.string().optional(),
        callerIdName: z.string().max(15, "Caller ID name must be 15 characters or fewer").optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      // Check if this number is already claimed
      const existing = await ctx.db.phoneNumber.findFirst({
        where: { number: input.phoneNumber },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This number is no longer available. Please select another.",
        });
      }

      // Import to Vapi for voice using parent account credentials
      const parentSid = process.env.TWILIO_ACCOUNT_SID;
      const parentToken = process.env.TWILIO_AUTH_TOKEN;

      let vapiPhone;
      if (parentSid && parentToken) {
        try {
          vapiPhone = await importTwilioPhoneNumber({
            twilioAccountSid: parentSid,
            twilioAuthToken: parentToken,
            phoneNumber: input.phoneNumber,
            name: input.friendlyName || undefined,
          });
          log.info(`Imported service number ${input.phoneNumber} to Vapi as ${vapiPhone.id}`);
        } catch (error) {
          log.error("Failed to import service number to Vapi:", error);
          // Non-fatal — number is claimed, Vapi import can be retried
        }
      }

      // Determine type and area code
      let type = "local";
      let areaCode: string | undefined;
      const num = input.phoneNumber;
      if (num.startsWith("+1800") || num.startsWith("+1888") || num.startsWith("+1877") ||
          num.startsWith("+1866") || num.startsWith("+1855") || num.startsWith("+1844") ||
          num.startsWith("+1833") || num.startsWith("+1822")) {
        type = "toll_free";
      } else if (num.startsWith("+1") && num.length === 12) {
        areaCode = num.slice(2, 5);
      }

      let countryCode = "US";
      if (num.startsWith("+44")) countryCode = "GB";
      else if (num.startsWith("+1")) countryCode = "US";

      const basePrice = getNumberPrice(countryCode, type === "toll_free" ? "toll-free" : "local");
      const monthlyCost = Math.ceil(basePrice * 1.5 * 100); // 50% markup, in cents

      // Create PhoneNumber record
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone?.id || null,
          twilioSid: input.twilioSid,
          number: input.phoneNumber,
          friendlyName: input.friendlyName || null,
          callerIdName: input.callerIdName || null,
          type,
          provider: "pool", // Uses parent account, A2P compliant
          countryCode,
          monthlyCost,
        },
      });

      return phoneNumber;
    }),

  // ================================================================
  // Pool Number Procedures
  // ================================================================

  // Check if any pool numbers are available (drives UI tab visibility)
  hasPoolNumbers: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.phoneNumberPool.count({
      where: { status: "available" },
    });
    return { available: count > 0, count };
  }),

  // Browse available pool numbers with optional filters
  listPoolNumbers: protectedProcedure
    .input(
      z.object({
        countryCode: z.string().length(2).optional(),
        type: z.string().optional(),
        areaCode: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { status: "available" };
      if (input?.countryCode) where.countryCode = input.countryCode;
      if (input?.type) where.type = input.type;
      if (input?.areaCode) where.areaCode = input.areaCode;

      const numbers = await ctx.db.phoneNumberPool.findMany({
        where,
        orderBy: [{ countryCode: "asc" }, { areaCode: "asc" }, { number: "asc" }],
      });
      return numbers;
    }),

  // Atomically claim a pool number for the org
  claimPoolNumber: protectedProcedure
    .input(
      z.object({
        poolNumberId: z.string(),
        friendlyName: z.string().optional(),
        callerIdName: z.string().max(15).optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      // Atomic claim: only update if still available
      const { count } = await ctx.db.phoneNumberPool.updateMany({
        where: {
          id: input.poolNumberId,
          status: "available",
        },
        data: {
          status: "assigned",
          organizationId: ctx.orgId,
          assignedAt: new Date(),
        },
      });

      if (count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This number is no longer available. Please select another.",
        });
      }

      // Fetch the claimed pool number
      const poolNumber = await ctx.db.phoneNumberPool.findUnique({
        where: { id: input.poolNumberId },
      });

      if (!poolNumber) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve claimed number.",
        });
      }

      // Import to Vapi for voice using parent account credentials
      const parentSid = process.env.TWILIO_ACCOUNT_SID;
      const parentToken = process.env.TWILIO_AUTH_TOKEN;

      let vapiPhone;
      if (parentSid && parentToken) {
        try {
          vapiPhone = await importTwilioPhoneNumber({
            twilioAccountSid: parentSid,
            twilioAuthToken: parentToken,
            phoneNumber: poolNumber.number,
            name: input.friendlyName || poolNumber.friendlyName || undefined,
          });
          log.info(`Imported pool number ${poolNumber.number} to Vapi as ${vapiPhone.id}`);
        } catch (error) {
          log.error("Failed to import pool number to Vapi:", error);
          // Non-fatal — number is claimed, Vapi import can be retried
        }
      }

      // Create PhoneNumber record for the org
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone?.id || null,
          twilioSid: poolNumber.twilioSid,
          number: poolNumber.number,
          friendlyName: input.friendlyName || poolNumber.friendlyName,
          callerIdName: input.callerIdName || null,
          type: poolNumber.type,
          provider: "pool",
          countryCode: poolNumber.countryCode,
          monthlyCost: poolNumber.saasMonthlyCost,
        },
      });

      return phoneNumber;
    }),

  // Admin: seed pool numbers from the parent Twilio account
  seedPoolNumbers: adminProcedure
    .input(
      z.object({
        twilioSids: z.array(z.string()).optional(), // Specific SIDs to add, or all if empty
      }).optional()
    )
    .mutation(async ({ ctx }) => {
      const parentSid = process.env.TWILIO_ACCOUNT_SID;
      const parentToken = process.env.TWILIO_AUTH_TOKEN;

      if (!parentSid || !parentToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Twilio parent account not configured.",
        });
      }

      // List all numbers on the parent account
      const twilioNumbers = await listTwilioNumbers(parentSid, parentToken);

      let added = 0;
      let skipped = 0;

      for (const tn of twilioNumbers) {
        // Skip if already in pool
        const exists = await ctx.db.phoneNumberPool.findUnique({
          where: { twilioSid: tn.sid },
        });
        if (exists) {
          skipped++;
          continue;
        }

        // Also skip if already assigned to an org as a regular PhoneNumber
        const assignedAsPhoneNumber = await ctx.db.phoneNumber.findFirst({
          where: { twilioSid: tn.sid },
        });
        if (assignedAsPhoneNumber) {
          skipped++;
          continue;
        }

        // Determine type and area code from the number
        let type = "local";
        let areaCode: string | undefined;
        const num = tn.phone_number;

        if (num.startsWith("+1800") || num.startsWith("+1888") || num.startsWith("+1877") ||
            num.startsWith("+1866") || num.startsWith("+1855") || num.startsWith("+1844") ||
            num.startsWith("+1833") || num.startsWith("+1822")) {
          type = "toll_free";
        } else if (num.startsWith("+1") && num.length === 12) {
          areaCode = num.slice(2, 5);
        }

        const basePrice = getNumberPrice("US", type === "toll_free" ? "toll-free" : "local");

        await ctx.db.phoneNumberPool.create({
          data: {
            twilioSid: tn.sid,
            number: tn.phone_number,
            friendlyName: tn.friendly_name,
            type,
            countryCode: "US",
            areaCode,
            status: "available",
            monthlyCost: Math.ceil(basePrice * 100),
            saasMonthlyCost: Math.ceil(basePrice * 1.5 * 100),
          },
        });
        added++;
      }

      log.info(`Seeded pool: ${added} added, ${skipped} skipped`);
      return { added, skipped, total: twilioNumbers.length };
    }),
});
