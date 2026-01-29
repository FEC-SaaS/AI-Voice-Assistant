import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Public API: List calls for the organization
 * GET /api/v1/calls
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const agentId = searchParams.get("agentId");

    const where = {
      organizationId: orgId,
      ...(status && { status }),
      ...(agentId && { agentId }),
    };

    const [calls, total] = await Promise.all([
      db.call.findMany({
        where,
        select: {
          id: true,
          status: true,
          direction: true,
          toNumber: true,
          fromNumber: true,
          durationSeconds: true,
          sentiment: true,
          createdAt: true,
          agent: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.call.count({ where }),
    ]);

    return NextResponse.json({
      calls,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + calls.length < total,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}
