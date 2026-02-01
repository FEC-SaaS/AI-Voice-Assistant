import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  provisionPhoneNumber,
  releasePhoneNumber,
  importTwilioPhoneNumber,
  listPhoneNumbers as listVapiPhoneNumbers,
  searchPhoneNumbers,
  buyPhoneNumber,
} from "@/lib/vapi";
import { enforcePhoneNumberLimit } from "../trpc/middleware";

export const phoneNumbersRouter = router({
  // List all phone numbers
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

  // List available phone numbers from Vapi account
  listVapiNumbers: protectedProcedure.query(async () => {
    try {
      const vapiNumbers = await listVapiPhoneNumbers();
      return vapiNumbers;
    } catch (error) {
      console.error("Failed to list Vapi phone numbers:", error);
      return [];
    }
  }),

  // Search for available phone numbers to buy
  searchAvailable: protectedProcedure
    .input(
      z.object({
        countryCode: z.string().min(2).max(2).default("US"),
        areaCode: z.string().optional(),
        numberType: z.enum(["local", "toll-free", "mobile"]).default("local"),
      })
    )
    .query(async ({ input }) => {
      try {
        const numbers = await searchPhoneNumbers({
          countryCode: input.countryCode,
          areaCode: input.areaCode,
          numberType: input.numberType,
          limit: 20,
        });
        return numbers;
      } catch (error) {
        console.error("Failed to search phone numbers:", error);
        return [];
      }
    }),

  // Buy a specific phone number from Vapi
  buyNumber: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().optional(),
        countryCode: z.string().min(2).max(2).default("US"),
        areaCode: z.string().optional(),
        numberType: z.enum(["local", "toll-free", "mobile"]).default("local"),
        friendlyName: z.string().optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      let vapiPhone;
      try {
        vapiPhone = await buyPhoneNumber({
          phoneNumber: input.phoneNumber,
          countryCode: input.countryCode,
          areaCode: input.areaCode,
          numberType: input.numberType,
          name: input.friendlyName,
        });
      } catch (error) {
        console.error("Failed to buy phone number:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage || "Failed to buy phone number. Please check your Vapi account credits.",
        });
      }

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone.id,
          number: vapiPhone.number,
          friendlyName: input.friendlyName,
          type: input.numberType === "toll-free" ? "toll_free" : "local",
        },
      });

      return phoneNumber;
    }),

  // Import a Twilio phone number
  importTwilio: protectedProcedure
    .input(
      z.object({
        twilioAccountSid: z.string().min(1, "Twilio Account SID is required"),
        twilioAuthToken: z.string().min(1, "Twilio Auth Token is required"),
        phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +14155551234)"),
        friendlyName: z.string().optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      let vapiPhone;
      try {
        vapiPhone = await importTwilioPhoneNumber({
          twilioAccountSid: input.twilioAccountSid,
          twilioAuthToken: input.twilioAuthToken,
          phoneNumber: input.phoneNumber,
          name: input.friendlyName,
        });
      } catch (error) {
        console.error("Failed to import Twilio phone number:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("already exists")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This phone number is already imported in Vapi.",
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to import phone number. Please verify your Twilio credentials and phone number.",
        });
      }

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone.id,
          number: vapiPhone.number,
          friendlyName: input.friendlyName,
          type: "local",
        },
      });

      return phoneNumber;
    }),

  // Provision a new phone number (buy through Vapi)
  provision: protectedProcedure
    .input(
      z.object({
        areaCode: z.string().optional(),
        type: z.enum(["local", "toll_free"]).default("local"),
        friendlyName: z.string().optional(),
      })
    )
    .use(enforcePhoneNumberLimit)
    .mutation(async ({ ctx, input }) => {
      // Provision from Vapi
      let vapiPhone;
      try {
        vapiPhone = await provisionPhoneNumber({
          areaCode: input.areaCode,
        });
      } catch (error) {
        console.error("Failed to provision phone number:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Provide helpful error messages
        if (errorMessage.includes("Pro plan") || errorMessage.includes("credits") || errorMessage.includes("Twilio")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Direct phone number purchase is not available on the free Vapi plan. " +
              "Please import your own Twilio phone number instead, or upgrade your Vapi plan.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to provision phone number. Please try importing a Twilio number instead.",
        });
      }

      // Save to database
      const phoneNumber = await ctx.db.phoneNumber.create({
        data: {
          organizationId: ctx.orgId,
          vapiPhoneId: vapiPhone.id,
          number: vapiPhone.number,
          friendlyName: input.friendlyName,
          type: input.type,
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

      // If assigning to an agent, verify it exists
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
          await releasePhoneNumber(phoneNumber.vapiPhoneId);
        } catch (error) {
          console.error("Failed to release phone number from Vapi:", error);
        }
      }

      // Delete from database
      await ctx.db.phoneNumber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
