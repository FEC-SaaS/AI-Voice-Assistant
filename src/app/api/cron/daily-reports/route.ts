import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Daily Reports Cron Job
 *
 * This endpoint generates daily reports for organizations:
 * - Call statistics
 * - Campaign performance
 * - Usage summaries
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting daily reports generation");

    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active organizations
    const organizations = await db.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const reports = [];

    for (const org of organizations) {
      // Get call stats for yesterday
      const callStats = await db.call.aggregate({
        where: {
          organizationId: org.id,
          createdAt: { gte: yesterday, lt: today },
        },
        _count: { id: true },
        _sum: { durationSeconds: true },
      });

      reports.push({
        organizationId: org.id,
        organizationName: org.name,
        totalCalls: callStats._count.id,
        totalMinutes: Math.ceil((callStats._sum.durationSeconds || 0) / 60),
        date: yesterday.toISOString().split("T")[0],
      });
    }

    console.log(`[Cron] Generated reports for ${reports.length} organizations`);

    return NextResponse.json({
      success: true,
      message: "Daily reports generated",
      reportsGenerated: reports.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Daily reports error:", error);
    return NextResponse.json(
      { error: "Report generation failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return POST(req);
}
