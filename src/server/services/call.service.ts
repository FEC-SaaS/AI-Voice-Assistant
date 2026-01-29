import { db } from "@/lib/db";
import { createCall, getCall as getVapiCall } from "@/lib/vapi";
import { checkMinutesLimit, recordCallUsage } from "./billing.service";
import { TRPCError } from "@trpc/server";

export interface InitiateCallInput {
  organizationId: string;
  agentId: string;
  phoneNumber: string;
  campaignId?: string;
  contactId?: string;
  metadata?: Record<string, string>;
}

export interface CallWebhookData {
  callId: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  sentiment?: string;
}

/**
 * Initiate an outbound call
 */
export async function initiateCall(input: InitiateCallInput) {
  // Check minutes limit
  const limitCheck = await checkMinutesLimit(input.organizationId);
  if (!limitCheck.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: limitCheck.reason || "Minutes limit reached",
    });
  }

  // Get the agent with Vapi ID
  const agent = await db.agent.findFirst({
    where: { id: input.agentId, organizationId: input.organizationId },
  });

  if (!agent || !agent.vapiAssistantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Agent not found or not synced with Vapi",
    });
  }

  // Get a phone number for this organization
  const phoneNumber = await db.phoneNumber.findFirst({
    where: {
      organizationId: input.organizationId,
      isActive: true,
      vapiPhoneId: { not: null },
    },
  });

  if (!phoneNumber || !phoneNumber.vapiPhoneId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active phone number available",
    });
  }

  // Create call record first
  const call = await db.call.create({
    data: {
      organizationId: input.organizationId,
      agentId: input.agentId,
      campaignId: input.campaignId,
      contactId: input.contactId,
      direction: "outbound",
      status: "queued",
      toNumber: input.phoneNumber,
      fromNumber: phoneNumber.number,
    },
  });

  try {
    // Initiate call via Vapi
    const vapiCall = await createCall({
      assistantId: agent.vapiAssistantId,
      phoneNumberId: phoneNumber.vapiPhoneId,
      customerNumber: input.phoneNumber,
      metadata: {
        ...input.metadata,
        callId: call.id,
        organizationId: input.organizationId,
      },
    });

    // Update call with Vapi ID
    await db.call.update({
      where: { id: call.id },
      data: {
        vapiCallId: vapiCall.id,
        status: vapiCall.status || "queued",
      },
    });

    return {
      ...call,
      vapiCallId: vapiCall.id,
    };
  } catch (error) {
    // Mark call as failed
    await db.call.update({
      where: { id: call.id },
      data: { status: "failed" },
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to initiate call",
    });
  }
}

/**
 * Handle call webhook update
 */
export async function handleCallWebhook(data: CallWebhookData) {
  // Find call by Vapi ID
  const call = await db.call.findFirst({
    where: { vapiCallId: data.callId },
  });

  if (!call) {
    console.warn("[Call Service] Call not found for webhook:", data.callId);
    return null;
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: data.status,
  };

  if (data.startedAt) {
    updateData.startedAt = new Date(data.startedAt);
  }

  if (data.endedAt) {
    updateData.endedAt = new Date(data.endedAt);
  }

  if (data.durationSeconds !== undefined) {
    updateData.durationSeconds = data.durationSeconds;
  }

  if (data.transcript) {
    updateData.transcript = data.transcript;
  }

  if (data.recordingUrl) {
    updateData.recordingUrl = data.recordingUrl;
  }

  if (data.summary) {
    updateData.summary = data.summary;
  }

  if (data.sentiment) {
    updateData.sentiment = data.sentiment;
  }

  // Update call record
  const updatedCall = await db.call.update({
    where: { id: call.id },
    data: updateData,
  });

  // Record usage if call ended
  if (data.status === "completed" && data.durationSeconds) {
    await recordCallUsage(call.organizationId, data.durationSeconds, call.id);
  }

  // Update contact status if linked
  if (call.contactId && data.status) {
    const contactStatus = mapCallStatusToContactStatus(data.status);
    if (contactStatus) {
      await db.contact.update({
        where: { id: call.contactId },
        data: {
          status: contactStatus,
          lastCalledAt: new Date(),
          callAttempts: { increment: 1 },
        },
      });
    }
  }

  return updatedCall;
}

/**
 * Map call status to contact status
 */
function mapCallStatusToContactStatus(callStatus: string): string | null {
  switch (callStatus) {
    case "completed":
      return "completed";
    case "failed":
    case "no-answer":
      return "failed";
    default:
      return null;
  }
}

/**
 * Get call details with related data
 */
export async function getCallDetails(callId: string, organizationId: string) {
  const call = await db.call.findFirst({
    where: { id: callId, organizationId },
    include: {
      agent: {
        select: { id: true, name: true },
      },
      campaign: {
        select: { id: true, name: true },
      },
      contact: {
        select: { id: true, firstName: true, lastName: true, company: true },
      },
    },
  });

  if (!call) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Call not found",
    });
  }

  return call;
}

/**
 * Sync call status from Vapi
 */
export async function syncCallFromVapi(callId: string): Promise<boolean> {
  const call = await db.call.findUnique({
    where: { id: callId },
  });

  if (!call || !call.vapiCallId) {
    return false;
  }

  try {
    const vapiCall = await getVapiCall(call.vapiCallId);

    await db.call.update({
      where: { id: callId },
      data: {
        status: vapiCall.status,
        transcript: vapiCall.transcript,
        recordingUrl: vapiCall.recordingUrl,
        startedAt: vapiCall.startedAt ? new Date(vapiCall.startedAt) : undefined,
        endedAt: vapiCall.endedAt ? new Date(vapiCall.endedAt) : undefined,
      },
    });

    return true;
  } catch (error) {
    console.error("[Call Service] Failed to sync from Vapi:", error);
    return false;
  }
}

/**
 * Get call statistics for a period
 */
export async function getCallStats(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  const [totalCalls, statusBreakdown, minutesAgg, sentimentBreakdown] = await Promise.all([
    db.call.count({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    db.call.groupBy({
      by: ["status"],
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    }),
    db.call.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { durationSeconds: true },
      _avg: { durationSeconds: true },
    }),
    db.call.groupBy({
      by: ["sentiment"],
      where: {
        organizationId,
        sentiment: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    }),
  ]);

  const statusMap: Record<string, number> = {};
  statusBreakdown.forEach((s) => {
    if (s.status) statusMap[s.status] = s._count;
  });

  const sentimentMap: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  sentimentBreakdown.forEach((s) => {
    if (s.sentiment) sentimentMap[s.sentiment] = s._count;
  });

  const completed = statusMap["completed"] || 0;
  const failed = (statusMap["failed"] || 0) + (statusMap["no-answer"] || 0);

  return {
    totalCalls,
    completed,
    failed,
    successRate: totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0,
    totalMinutes: Math.round((minutesAgg._sum.durationSeconds || 0) / 60),
    avgDuration: Math.round(minutesAgg._avg.durationSeconds || 0),
    statusBreakdown: statusMap,
    sentimentBreakdown: sentimentMap,
  };
}

/**
 * Make a test call
 */
export async function makeTestCall(
  agentId: string,
  phoneNumber: string,
  organizationId: string
) {
  return initiateCall({
    organizationId,
    agentId,
    phoneNumber,
    metadata: {
      type: "test_call",
    },
  });
}

/**
 * Retry a failed call
 */
export async function retryCall(callId: string, organizationId: string) {
  const originalCall = await db.call.findFirst({
    where: {
      id: callId,
      organizationId,
      status: { in: ["failed", "no-answer"] },
    },
  });

  if (!originalCall) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Call not found or cannot be retried",
    });
  }

  if (!originalCall.agentId || !originalCall.toNumber) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Call missing required data for retry",
    });
  }

  return initiateCall({
    organizationId,
    agentId: originalCall.agentId,
    phoneNumber: originalCall.toNumber,
    campaignId: originalCall.campaignId || undefined,
    contactId: originalCall.contactId || undefined,
    metadata: {
      retryOf: callId,
    },
  });
}
