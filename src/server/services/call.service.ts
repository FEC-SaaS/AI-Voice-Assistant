import { db } from "@/lib/db";
import { createCall, getCall as getVapiCall } from "@/lib/vapi";
import { checkMinutesLimit, recordCallUsage } from "./billing.service";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("CallService");

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

  // Get the agent with Vapi ID and org name for outbound context
  const agent = await db.agent.findFirst({
    where: { id: input.agentId, organizationId: input.organizationId },
    include: { organization: { select: { name: true } } },
  });

  if (!agent || !agent.vapiAssistantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Agent not found or not connected to voice system",
    });
  }

  // Fetch knowledge base content for this agent
  const knowledgeDocs = await db.knowledgeDocument.findMany({
    where: {
      agentId: input.agentId,
      organizationId: input.organizationId,
      isActive: true,
    },
  });

  let knowledgeContent = "";
  if (knowledgeDocs.length > 0) {
    knowledgeContent = "\n\n--- KNOWLEDGE BASE ---\n" +
      knowledgeDocs.map(d => `=== ${d.name} ===\n${d.content || ""}`).join("\n\n") +
      "\n--- END KNOWLEDGE BASE ---";
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
    // Build outbound-specific overrides for the assistant
    const contactName = input.metadata?.contactName;
    const businessName = agent.organization.name;
    // Always use the agent's configured name
    const agentName = agent.name;
    // Avoid redundant "X from X" when agent name = business name
    const showFromBusiness = agentName.toLowerCase() !== businessName.toLowerCase();
    const outboundFirstMessage = contactName
      ? `Hi ${contactName}, this is ${agentName}${showFromBusiness ? ` from ${businessName}` : ""}. Do you have a moment to talk?`
      : `Hi there, this is ${agentName}${showFromBusiness ? ` from ${businessName}` : ""} calling. Do you have a moment to talk?`;

    const vapiCall = await createCall({
      assistantId: agent.vapiAssistantId,
      phoneNumberId: phoneNumber.vapiPhoneId,
      customerNumber: input.phoneNumber,
      metadata: {
        ...input.metadata,
        callId: call.id,
        organizationId: input.organizationId,
        direction: "outbound",
        fromNumber: phoneNumber.number,
        agentId: input.agentId,
      },
      assistantOverrides: {
        firstMessage: outboundFirstMessage,
        firstMessageMode: "assistant-speaks-first",
        model: {
          provider: agent.modelProvider || "openai",
          model: agent.model || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `${agent.systemPrompt}${knowledgeContent}

IMPORTANT CONTEXT — OUTBOUND CALL:
You are calling on behalf of ${businessName}. YOU initiated this call, the customer did NOT call you.
Your name is ${agentName}. ALWAYS use this name when introducing yourself or when asked your name. NEVER use any other name.

CALL GUIDELINES:
1. OPENING: Introduce yourself and the business naturally. State the purpose of your call clearly and concisely within the first 15 seconds.
2. KNOWLEDGE-DRIVEN CONVERSATION: Your conversation MUST be strictly based on the knowledge base content provided above. ONLY discuss products, services, and offerings that are described in the knowledge base. NEVER invent, fabricate, or assume products/services that are not in the knowledge base.
3. DISCOVERY: Ask open-ended questions to understand the customer's needs, challenges, and goals. Listen actively and acknowledge their responses.
4. VALUE PROPOSITION: Based on what you learn, position relevant products/services from the knowledge base as solutions. Explain specific benefits that address their stated needs.
5. OBJECTION HANDLING: When facing objections, acknowledge concerns, ask clarifying questions, and provide evidence-based responses from the knowledge base.
6. CLOSING: Guide the conversation toward a clear next step — scheduling a meeting, sending information, or a follow-up call.
7. PROFESSIONALISM: Be warm, confident, and respectful of the customer's time. If they're busy, offer to call back at a convenient time.
8. If the customer is not interested, thank them politely and end the call gracefully.

STRICT RULES:
- NEVER say "Thank you for calling" or "How can I help you today?" — YOU are the one calling THEM.
- NEVER discuss products, services, or offers that are NOT in the knowledge base.
- Keep your responses concise and conversational — avoid long monologues.
- Use the customer's name naturally throughout the conversation when known.`,
            },
          ],
        },
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
    log.warn("Call not found for webhook:", data.callId);
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
    log.error("Failed to sync from Vapi:", error);
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
