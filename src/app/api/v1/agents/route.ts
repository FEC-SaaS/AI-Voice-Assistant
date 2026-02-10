import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiKey, apiError, apiSuccess, checkRateLimit } from "@/lib/api-middleware";
import { db } from "@/lib/db";

/**
 * Get organization ID from either API key or Clerk session
 */
async function getOrgId(request: NextRequest): Promise<{ orgId: string } | { error: NextResponse }> {
  // First try API key authentication
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const apiAuth = await withApiKey(request);
    if ("context" in apiAuth) {
      return { orgId: apiAuth.context.organizationId };
    }
    return { error: apiAuth.error };
  }

  // Fall back to Clerk session auth
  const { orgId } = await auth();
  if (!orgId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Provide API key in Authorization header or use session auth." },
        { status: 401 }
      ),
    };
  }

  return { orgId };
}

/**
 * GET /api/v1/agents
 * List all agents for the organization
 */
export async function GET(request: NextRequest) {
  const authResult = await getOrgId(request);
  if ("error" in authResult) return authResult.error;

  const { orgId } = authResult;

  // Rate limiting for API key access
  if (request.headers.get("authorization")) {
    const rateLimit = checkRateLimit(orgId, 100, 60000);
    if (!rateLimit.allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }
  }

  try {
    const agents = await db.agent.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        voiceProvider: true,
        voiceId: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { calls: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        isActive: agent.isActive,
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
        language: agent.language,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        callCount: agent._count.calls,
      })),
    });
  } catch (error) {
    console.error("[API] GET /agents error:", error);
    return apiError("Failed to fetch agents", 500);
  }
}

/**
 * POST /api/v1/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  const authResult = await getOrgId(request);
  if ("error" in authResult) return authResult.error;

  const { orgId } = authResult;

  // Rate limiting
  if (request.headers.get("authorization")) {
    const rateLimit = checkRateLimit(orgId, 20, 60000);
    if (!rateLimit.allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return apiError("name is required", 400);
    }
    if (!body.systemPrompt || typeof body.systemPrompt !== "string") {
      return apiError("systemPrompt is required", 400);
    }

    const agent = await db.agent.create({
      data: {
        organizationId: orgId,
        name: body.name,
        description: body.description || null,
        systemPrompt: body.systemPrompt,
        firstMessage: body.firstMessage || null,
        voiceProvider: body.voiceProvider || "vapi",
        voiceId: body.voiceId || "Elliot",
        language: body.language || "en-US",
        modelProvider: body.modelProvider || "openai",
        model: body.model || "gpt-4o",
        isActive: body.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        voiceProvider: true,
        voiceId: true,
        language: true,
        createdAt: true,
      },
    });

    return apiSuccess({ agent }, 201);
  } catch (error) {
    console.error("[API] POST /agents error:", error);
    return apiError("Failed to create agent", 500);
  }
}
