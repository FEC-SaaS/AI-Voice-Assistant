import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { provisionPhoneNumber, releasePhoneNumber } from "@/lib/vapi";
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

  // Provision a new phone number
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
          type: input.type,
        });
      } catch (error) {
        console.error("Failed to provision phone number:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to provision phone number. Please try again.",
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
