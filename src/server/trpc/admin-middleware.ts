import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { publicProcedure } from "./index";
import type { Context } from "./context";

export function isSuperAdmin(userId: string | null): boolean {
  if (!userId) return false;
  const allowed = (process.env.ADMIN_CLERK_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(userId);
}

// Inline into .use() to avoid MiddlewareBuilder return-type inference issues
export const superAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !isSuperAdmin(ctx.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super-admin access required.",
    });
  }
  return next();
});

/** Fire-and-forget: log an admin action to AdminActivityLog */
export async function logAdminAction(
  db: Context["db"],
  params: {
    adminClerkId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }
) {
  try {
    await db.adminActivityLog.create({
      data: {
        adminClerkId: params.adminClerkId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        // Cast to Prisma's InputJsonValue — Record<string, unknown> isn't directly assignable
        details: (params.details ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    // Non-fatal — never block the main operation
  }
}
