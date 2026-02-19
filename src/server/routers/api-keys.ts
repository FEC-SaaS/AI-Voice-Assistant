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

  // Rotate an API key: create a new one and revoke the old atomically
  rotate: adminProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the key belongs to this org and is not already revoked
      const existingKey = await ctx.db.apiKey.findFirst({
        where: {
          id: input.keyId,
          organizationId: ctx.orgId,
          revokedAt: null,
        },
      });

      if (!existingKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found or already revoked",
        });
      }

      // Create a new key with the same name (appended with " (rotated)")
      const newKey = await createApiKey(
        ctx.orgId,
        existingKey.name + " (rotated)",
        ctx.userId
      );

      // Revoke the old key
      await revokeApiKey(ctx.orgId, input.keyId);

      return {
        id: newKey.id,
        key: newKey.key, // Only returned once!
        keyPrefix: newKey.keyPrefix,
      };
    }),

  // Update IP allowlist for an API key
  updateIpAllowlist: adminProcedure
    .input(
      z.object({
        keyId: z.string(),
        ips: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.apiKey.findFirst({
        where: {
          id: input.keyId,
          organizationId: ctx.orgId,
          revokedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      await ctx.db.apiKey.update({
        where: { id: input.keyId },
        data: { ipAllowlist: input.ips },
      });

      return { success: true };
    }),
});
