import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createApiKey, revokeApiKey, listApiKeys } from "@/lib/api-keys";

export const apiKeysRouter = router({
  // List all API keys for the organization
  list: adminProcedure.query(async ({ ctx }) => {
    const keys = await listApiKeys(ctx.orgId);
    return keys;
  }),

  // Create a new API key
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check key limit based on plan (optional)
      const existingKeys = await ctx.db.apiKey.count({
        where: {
          organizationId: ctx.orgId,
          revokedAt: null,
        },
      });

      // Limit to 10 API keys per organization
      if (existingKeys >= 10) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Maximum of 10 API keys allowed per organization",
        });
      }

      const result = await createApiKey(ctx.orgId, input.name, ctx.userId);

      return {
        id: result.id,
        key: result.key, // Only returned once!
        keyPrefix: result.keyPrefix,
      };
    }),

  // Revoke an API key
  revoke: adminProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await revokeApiKey(ctx.orgId, input.keyId);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return { success: true };
    }),
});
