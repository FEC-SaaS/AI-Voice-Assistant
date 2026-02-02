import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "./api-keys";
import { db } from "./db";

export interface ApiContext {
  organizationId: string;
  apiKeyId?: string;
}

/**
 * Middleware to validate API key from Authorization header
 * Returns organization context if valid, or error response if invalid
 */
export async function withApiKey(
  request: NextRequest
): Promise<{ context: ApiContext } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      error: NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      ),
    };
  }

  // Support "Bearer <token>" format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  const result = await validateApiKey(token);

  if (!result.valid || !result.organizationId) {
    return {
      error: NextResponse.json(
        { error: result.error || "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  return {
    context: {
      organizationId: result.organizationId,
    },
  };
}

/**
 * Helper to get the database with organization context
 */
export function getOrgDb(organizationId: string) {
  return {
    db,
    organizationId,
    // Helper to scope queries to the organization
    scopedQuery: <T extends { organizationId: string }>(
      where: Omit<T, "organizationId">
    ): T => ({
      ...where,
      organizationId,
    } as T),
  };
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Rate limiting helper (simple in-memory, use Redis for production)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Reset the counter
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
