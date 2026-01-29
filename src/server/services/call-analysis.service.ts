import { db } from "@/lib/db";
import { analyzeTranscript, TranscriptAnalysis } from "@/lib/openai";
import { detectOptOut, handleOptOutRequest } from "./dnc.service";

export interface CallAnalysisResult {
  callId: string;
  success: boolean;
  analysis?: TranscriptAnalysis;
  error?: string;
  optOutDetected?: boolean;
}

/**
 * Analyze a single call transcript
 */
export async function analyzeCall(callId: string): Promise<CallAnalysisResult> {
  try {
    // Get call with transcript
    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        contact: true,
      },
    });

    if (!call) {
      return {
        callId,
        success: false,
        error: "Call not found",
      };
    }

    if (!call.transcript) {
      return {
        callId,
        success: false,
        error: "No transcript available",
      };
    }

    // Check for opt-out in transcript
    const optOutDetected = detectOptOut(call.transcript);

    if (optOutDetected && call.toNumber && call.organizationId) {
      // Handle opt-out request
      await handleOptOutRequest(
        call.toNumber,
        call.organizationId,
        callId,
        call.transcript
      );

      console.log(`[Call Analysis] Opt-out detected for call ${callId}`);
    }

    // Analyze transcript with OpenAI
    const analysis = await analyzeTranscript(call.transcript);

    // Update call with analysis results
    await db.call.update({
      where: { id: callId },
      data: {
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        leadScore: analysis.leadScore,
        analysis: {
          keyPoints: analysis.keyPoints,
          objections: analysis.objections,
          buyingSignals: analysis.buyingSignals,
          actionItems: analysis.actionItems,
          analyzedAt: new Date().toISOString(),
          optOutDetected,
        },
      },
    });

    // Update contact status based on call outcome
    if (call.contactId) {
      const newStatus = optOutDetected
        ? "dnc"
        : analysis.leadScore >= 70
          ? "completed"
          : "called";

      await db.contact.update({
        where: { id: call.contactId },
        data: { status: newStatus },
      });
    }

    return {
      callId,
      success: true,
      analysis,
      optOutDetected,
    };
  } catch (error) {
    console.error(`[Call Analysis] Error analyzing call ${callId}:`, error);

    return {
      callId,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Analyze multiple calls in batch
 */
export async function analyzeCallsBatch(callIds: string[]): Promise<CallAnalysisResult[]> {
  const results: CallAnalysisResult[] = [];

  for (const callId of callIds) {
    const result = await analyzeCall(callId);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Get unanalyzed calls that need processing
 */
export async function getUnanalyzedCalls(limit: number = 10): Promise<string[]> {
  const calls = await db.call.findMany({
    where: {
      transcript: { not: null },
      status: "completed",
      sentiment: null, // Not yet analyzed
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return calls.map((c) => c.id);
}

/**
 * Process all unanalyzed calls (to be called by cron job)
 */
export async function processUnanalyzedCalls(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const callIds = await getUnanalyzedCalls(20);

  if (callIds.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[Call Analysis] Processing ${callIds.length} unanalyzed calls`);

  const results = await analyzeCallsBatch(callIds);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[Call Analysis] Completed: ${succeeded} succeeded, ${failed} failed`);

  return {
    processed: callIds.length,
    succeeded,
    failed,
  };
}

/**
 * Get call analysis summary for an organization
 */
export async function getAnalyticsSummary(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCalls: number;
  analyzedCalls: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  averageLeadScore: number;
  optOutRate: number;
  topObjections: Array<{ objection: string; count: number }>;
}> {
  // Get all calls in date range
  const calls = await db.call.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      sentiment: true,
      leadScore: true,
      analysis: true,
    },
  });

  const totalCalls = calls.length;
  const analyzedCalls = calls.filter((c) => c.sentiment !== null).length;

  // Sentiment breakdown
  const sentimentBreakdown = {
    positive: calls.filter((c) => c.sentiment === "positive").length,
    neutral: calls.filter((c) => c.sentiment === "neutral").length,
    negative: calls.filter((c) => c.sentiment === "negative").length,
  };

  // Average lead score
  const scoresOnly = calls.filter((c) => c.leadScore !== null).map((c) => c.leadScore!);
  const averageLeadScore = scoresOnly.length > 0
    ? Math.round(scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length)
    : 0;

  // Opt-out rate
  const optOuts = calls.filter((c) => {
    const analysis = c.analysis as Record<string, unknown> | null;
    return analysis?.optOutDetected === true;
  }).length;
  const optOutRate = totalCalls > 0 ? (optOuts / totalCalls) * 100 : 0;

  // Top objections (aggregate from all calls)
  const objectionCounts = new Map<string, number>();
  for (const call of calls) {
    const analysis = call.analysis as Record<string, unknown> | null;
    const objections = (analysis?.objections as string[]) || [];
    for (const objection of objections) {
      const normalized = objection.toLowerCase().trim();
      objectionCounts.set(normalized, (objectionCounts.get(normalized) || 0) + 1);
    }
  }

  const topObjections = Array.from(objectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([objection, count]) => ({ objection, count }));

  return {
    totalCalls,
    analyzedCalls,
    sentimentBreakdown,
    averageLeadScore,
    optOutRate: Math.round(optOutRate * 10) / 10,
    topObjections,
  };
}
