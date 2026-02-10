import { TRPCError } from "@trpc/server";
import { middleware } from "./index";
import { getPlan, canAddAgent, canAddCampaign, canAddPhoneNumber } from "@/constants/plans";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("Rate Limit");
const trpcLog = createLogger("tRPC");

/**
 * Redis-based rate limiting middleware
 *
 * Uses Upstash Redis for distributed rate limiting across serverless functions.
 * Falls back to allowing requests if Redis is unavailable.
 *
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 */
export const rateLimit = (limit: number, windowSeconds: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
      // Check if Redis is configured
      const redisUrl = process.env.UPSTASH_REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_TOKEN;

      if (!redisUrl || !redisToken) {
        if (process.env.NODE_ENV === "development") {
          log.warn("Redis not configured, skipping rate limit check");
          return next();
        }
        // In production, reject requests when rate limiting is unavailable
        log.error("Redis not configured in production — blocking request");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Service temporarily unavailable. Please try again later.",
        });
      }

      const result = await checkRateLimit(
        `user:${ctx.userId}`,
        limit,
        windowSeconds
      );

      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Please try again in ${windowSeconds} seconds. Remaining: ${result.remaining}`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      log.error("Redis error:", error);
      if (process.env.NODE_ENV === "development") {
        return next();
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Service temporarily unavailable. Please try again later.",
      });
    }
  });

/**
 * Organization-scoped rate limiting
 * Useful for limiting API calls per organization
 */
export const orgRateLimit = (limit: number, windowSeconds: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.orgId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
      const redisUrl = process.env.UPSTASH_REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_TOKEN;

      if (!redisUrl || !redisToken) {
        if (process.env.NODE_ENV === "development") {
          return next();
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Service temporarily unavailable. Please try again later.",
        });
      }

      const result = await checkRateLimit(
        `org:${ctx.orgId}`,
        limit,
        windowSeconds
      );

      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Organization rate limit exceeded. Please try again later.`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      log.error("Redis error:", error);
      if (process.env.NODE_ENV === "development") {
        return next();
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Service temporarily unavailable. Please try again later.",
      });
    }
  });

/**
 * Action-specific rate limiting
 * For limiting specific expensive operations
 */
export const actionRateLimit = (action: string, limit: number, windowSeconds: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
      const redisUrl = process.env.UPSTASH_REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_TOKEN;

      if (!redisUrl || !redisToken) {
        if (process.env.NODE_ENV === "development") {
          return next();
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Service temporarily unavailable. Please try again later.",
        });
      }

      const result = await checkRateLimit(
        `action:${action}:${ctx.userId}`,
        limit,
        windowSeconds
      );

      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many ${action} requests. Please try again later.`,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      log.error("Redis error:", error);
      if (process.env.NODE_ENV === "development") {
        return next();
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Service temporarily unavailable. Please try again later.",
      });
    }
  });

/**
 * Plan limit enforcement middleware - Agents
 */
export const enforceAgentLimit = middleware(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    include: {
      _count: {
        select: { agents: true },
      },
    },
  });

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  if (!canAddAgent(org._count.agents, org.planId)) {
    const plan = getPlan(org.planId);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've reached the limit of ${plan.agents} agents on your ${plan.name} plan. Upgrade to add more agents.`,
    });
  }

  return next();
});

/**
 * Plan limit enforcement middleware - Campaigns
 */
export const enforceCampaignLimit = middleware(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    include: {
      _count: {
        select: { campaigns: true },
      },
    },
  });

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  if (!canAddCampaign(org._count.campaigns, org.planId)) {
    const plan = getPlan(org.planId);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've reached the limit of ${plan.campaigns} campaigns on your ${plan.name} plan. Upgrade to add more campaigns.`,
    });
  }

  return next();
});

/**
 * Plan limit enforcement middleware - Phone Numbers
 */
export const enforcePhoneNumberLimit = middleware(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
    include: {
      _count: {
        select: { phoneNumbers: true },
      },
    },
  });

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  if (!canAddPhoneNumber(org._count.phoneNumbers, org.planId)) {
    const plan = getPlan(org.planId);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've reached the limit of ${plan.phoneNumbers} phone numbers on your ${plan.name} plan. Upgrade to add more.`,
    });
  }

  return next();
});

/**
 * Minutes usage enforcement middleware
 * Checks if organization has remaining minutes
 */
export const enforceMinutesLimit = middleware(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.orgId },
  });

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  const plan = getPlan(org.planId);

  // Unlimited plans can always proceed
  if (plan.minutesPerMonth === -1) {
    return next();
  }

  // Get current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await db.call.aggregate({
    where: {
      organizationId: ctx.orgId,
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      durationSeconds: true,
    },
  });

  const usedMinutes = Math.ceil((usage._sum.durationSeconds || 0) / 60);

  if (usedMinutes >= plan.minutesPerMonth) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've used all ${plan.minutesPerMonth} minutes included in your ${plan.name} plan this month. Upgrade to continue making calls.`,
    });
  }

  return next();
});

/**
 * Logging middleware
 * Logs all tRPC procedure calls with timing
 */
export const logger = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  trpcLog.debug(`${type} ${path} - ${duration}ms`);

  return result;
});

/**
 * Permission-based middleware
 * Checks if user has required permission
 */
export const requirePermission = (permission: string) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.orgId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const user = await db.user.findFirst({
      where: {
        id: ctx.userId,
        organizationId: ctx.orgId,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Define role permissions
    const rolePermissions: Record<string, string[]> = {
      owner: ["*"],
      admin: [
        "agents:*", "campaigns:*", "calls:*", "analytics:*",
        "knowledge:*", "phone_numbers:*", "integrations:*",
        "team:read", "team:invite", "settings:read", "settings:write",
      ],
      manager: [
        "agents:*", "campaigns:*", "calls:*", "analytics:*",
        "knowledge:*", "phone_numbers:read", "integrations:read",
        "team:read", "settings:read",
      ],
      member: [
        "agents:read", "campaigns:read", "calls:read", "calls:create",
        "analytics:read", "knowledge:read",
      ],
      viewer: [
        "agents:read", "campaigns:read", "calls:read", "analytics:read",
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];

    // Check for wildcard permission
    if (userPermissions.includes("*")) {
      return next();
    }

    // Check for exact match
    if (userPermissions.includes(permission)) {
      return next();
    }

    // Check for resource wildcard (e.g., "agents:*" matches "agents:create")
    const [resource] = permission.split(":");
    if (userPermissions.includes(`${resource}:*`)) {
      return next();
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to perform this action. Required: ${permission}`,
    });
  });

/**
 * Owner-only middleware
 * Only allows organization owners
 */
export const requireOwner = middleware(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.user.findFirst({
    where: {
      id: ctx.userId,
      organizationId: ctx.orgId,
    },
  });

  if (!user || user.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners can perform this action.",
    });
  }

  return next();
});

/**
 * Admin-only middleware
 * Only allows admins and owners
 */
export const requireAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.user.findFirst({
    where: {
      id: ctx.userId,
      organizationId: ctx.orgId,
    },
  });

  if (!user || !["owner", "admin"].includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action.",
    });
  }

  return next();
});
