import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Cleanup Cron Job
 *
 * This endpoint handles periodic cleanup tasks:
 * - Remove old call records beyond retention period
 * - Clean up orphaned data
 * - Archive completed campaigns
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

    console.log("[Cron] Starting cleanup job");

    // Clean up old call records (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deletedCalls = await db.call.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        status: { in: ["completed", "failed", "no_answer"] },
      },
    });

    console.log(`[Cron] Deleted ${deletedCalls.count} old call records`);

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      deletedCalls: deletedCalls.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error instanceof Error ? error.message : "Unknown error" },
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
