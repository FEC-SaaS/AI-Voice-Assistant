import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Public API: List campaigns for the organization
 * GET /api/v1/campaigns
 */
export async function GET(_req: NextRequest) {
  try {
    const { orgId } = auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await db.campaign.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        scheduleStart: true,
        scheduleEnd: true,
        createdAt: true,
        agent: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            contacts: true,
            calls: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[API] Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
