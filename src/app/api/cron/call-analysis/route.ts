import { NextRequest, NextResponse } from "next/server";

// Dynamic import to avoid build-time issues
const getProcessUnanalyzedCalls = async () => {
  const { processUnanalyzedCalls } = await import("@/server/services/call-analysis.service");
  return processUnanalyzedCalls;
};

/**
 * Call Analysis Cron Job
 *
 * This endpoint should be called by a cron job every 1-5 minutes
 * to process completed calls and analyze transcripts with OpenAI.
 *
 * Security:
 * - Protected by CRON_SECRET header validation
 * - Only accepts POST requests
 */

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes max

export async function POST(req: NextRequest) {
  try {
    // Validate cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron] Unauthorized request to call analysis");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting call analysis job");

    const processUnanalyzedCalls = await getProcessUnanalyzedCalls();
    const result = await processUnanalyzedCalls();

    console.log("[Cron] Call analysis job completed:", result);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Call analysis error:", error);
    return NextResponse.json(
      { error: "Call analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
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
