import { NextRequest, NextResponse } from "next/server";

// Dynamic import to avoid build-time issues
const getProcessScheduledCampaigns = async () => {
  const { processScheduledCampaigns } = await import("@/server/services/campaign-executor.service");
  return processScheduledCampaigns;
};

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

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized request to campaign executor");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting campaign execution job");

    const processScheduledCampaigns = await getProcessScheduledCampaigns();
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
      { error: "Campaign execution failed" },
      { status: 500 }
    );
  }
}

// Vercel Cron uses GET requests
export async function GET(req: NextRequest) {
  return POST(req);
}
