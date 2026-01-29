import { NextRequest, NextResponse } from "next/server";
import { processScheduledCampaigns } from "@/server/services/campaign-executor.service";

/**
 * Campaign Executor Cron Job
 *
 * This endpoint should be called by a cron job (e.g., Vercel Cron, Upstash QStash)
 * every 1-5 minutes to process scheduled campaigns.
 *
 * Configuration:
 * - Vercel: Add to vercel.json under "crons"
 * - Upstash QStash: Create a scheduled job pointing to this endpoint
 *
 * Security:
 * - Protected by CRON_SECRET header validation
 * - Only accepts POST requests
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
  try {
    // Validate cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized request to campaign executor");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting campaign execution job");

    await processScheduledCampaigns();

    console.log("[Cron] Campaign execution job completed");

    return NextResponse.json({
      success: true,
      message: "Campaign execution completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Campaign execution error:", error);
    return NextResponse.json(
      { error: "Campaign execution failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Also allow GET for testing in development
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  return POST(req);
}
