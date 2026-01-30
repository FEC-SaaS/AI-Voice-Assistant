import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Dynamic import to avoid build-time database connection
const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

/**
 * Public API: List agents for the organization
 * GET /api/v1/agents
 */
export async function GET(_req: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const agents = await db.agent.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        voiceId: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { calls: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("[API] Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
