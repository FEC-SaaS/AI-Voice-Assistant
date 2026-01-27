import { TRPCError } from "@trpc/server";
import { middleware } from "./index";
import { getPlan, canAddAgent, canAddCampaign, canAddPhoneNumber } from "@/constants/plans";
import { db } from "@/lib/db";

// Rate limiting middleware (simple in-memory, use Redis for production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (limit: number, windowMs: number) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const key = ctx.userId;
    const now = Date.now();
    const record = rateLimits.get(key);

    if (!record || now > record.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= limit) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Please try again later.",
      });
    } else {
      record.count++;
    }

    return next();
  });

// Plan limit enforcement middleware
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

// Logging middleware
export const logger = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  console.log(`[tRPC] ${type} ${path} - ${duration}ms`);

  return result;
});
