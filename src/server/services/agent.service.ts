import { db } from "@/lib/db";
import {
  createAssistant,
  updateAssistant,
  deleteAssistant,
  AssistantConfig,
} from "@/lib/vapi";
import { checkAgentLimit } from "./billing.service";
import { TRPCError } from "@trpc/server";

export interface CreateAgentInput {
  organizationId: string;
  name: string;
  description?: string;
  systemPrompt: string;
  firstMessage?: string;
  voiceProvider?: string;
  voiceId?: string;
  modelProvider?: string;
  model?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  firstMessage?: string;
  voiceProvider?: string;
  voiceId?: string;
  modelProvider?: string;
  model?: string;
  isActive?: boolean;
}

/**
 * Create a new agent with Vapi sync
 */
export async function createAgent(input: CreateAgentInput) {
  // Check plan limits
  const limitCheck = await checkAgentLimit(input.organizationId);
  if (!limitCheck.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: limitCheck.reason || "Agent limit reached",
    });
  }

  // Create assistant in Vapi
  let vapiAssistantId: string | null = null;

  try {
    const vapiConfig: AssistantConfig = {
      name: input.name,
      systemPrompt: input.systemPrompt,
      firstMessage: input.firstMessage,
      voiceProvider: input.voiceProvider || "vapi",
      voiceId: input.voiceId || "luna",
      modelProvider: input.modelProvider || "openai",
      model: input.model || "gpt-4o",
    };

    const vapiAssistant = await createAssistant(vapiConfig);
    vapiAssistantId = vapiAssistant.id;
  } catch (error) {
    console.error("[Agent Service] Failed to create Vapi assistant:", error);
    // Continue without Vapi - we can sync later
  }

  // Create agent in database
  const agent = await db.agent.create({
    data: {
      organizationId: input.organizationId,
      vapiAssistantId,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      firstMessage: input.firstMessage,
      voiceProvider: input.voiceProvider || "vapi",
      voiceId: input.voiceId || "luna",
      modelProvider: input.modelProvider || "openai",
      model: input.model || "gpt-4o",
    },
  });

  return agent;
}

/**
 * Update an agent with Vapi sync
 */
export async function updateAgent(
  agentId: string,
  organizationId: string,
  input: UpdateAgentInput
) {
  // Get existing agent
  const existingAgent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent not found",
    });
  }

  // Update Vapi assistant if it exists
  if (existingAgent.vapiAssistantId) {
    try {
      await updateAssistant(existingAgent.vapiAssistantId, {
        name: input.name,
        systemPrompt: input.systemPrompt,
        firstMessage: input.firstMessage,
        voiceProvider: input.voiceProvider,
        voiceId: input.voiceId,
        modelProvider: input.modelProvider,
        model: input.model,
      });
    } catch (error) {
      console.error("[Agent Service] Failed to update Vapi assistant:", error);
      // Continue with local update
    }
  }

  // Update in database
  const agent = await db.agent.update({
    where: { id: agentId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.systemPrompt && { systemPrompt: input.systemPrompt }),
      ...(input.firstMessage !== undefined && { firstMessage: input.firstMessage }),
      ...(input.voiceProvider && { voiceProvider: input.voiceProvider }),
      ...(input.voiceId && { voiceId: input.voiceId }),
      ...(input.modelProvider && { modelProvider: input.modelProvider }),
      ...(input.model && { model: input.model }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  return agent;
}

/**
 * Delete an agent with Vapi cleanup
 */
export async function deleteAgent(agentId: string, organizationId: string) {
  // Get existing agent
  const existingAgent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent not found",
    });
  }

  // Delete from Vapi if it exists
  if (existingAgent.vapiAssistantId) {
    try {
      await deleteAssistant(existingAgent.vapiAssistantId);
    } catch (error) {
      console.error("[Agent Service] Failed to delete Vapi assistant:", error);
      // Continue with local deletion
    }
  }

  // Delete from database
  await db.agent.delete({
    where: { id: agentId },
  });

  return { success: true };
}

/**
 * Sync agent to Vapi (create if missing)
 */
export async function syncAgentToVapi(agentId: string, organizationId: string) {
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent not found",
    });
  }

  // Already synced
  if (agent.vapiAssistantId) {
    return agent;
  }

  // Create in Vapi
  try {
    const vapiAssistant = await createAssistant({
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      firstMessage: agent.firstMessage || undefined,
      voiceProvider: agent.voiceProvider,
      voiceId: agent.voiceId,
      modelProvider: agent.modelProvider,
      model: agent.model,
    });

    // Update with Vapi ID
    return await db.agent.update({
      where: { id: agentId },
      data: { vapiAssistantId: vapiAssistant.id },
    });
  } catch (error) {
    console.error("[Agent Service] Failed to sync agent to Vapi:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to sync agent to Vapi",
    });
  }
}

/**
 * Duplicate an agent
 */
export async function duplicateAgent(agentId: string, organizationId: string) {
  // Check limits first
  const limitCheck = await checkAgentLimit(organizationId);
  if (!limitCheck.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: limitCheck.reason || "Agent limit reached",
    });
  }

  const existingAgent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  });

  if (!existingAgent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent not found",
    });
  }

  // Create new agent with copy of settings
  return createAgent({
    organizationId,
    name: `${existingAgent.name} (Copy)`,
    description: existingAgent.description || undefined,
    systemPrompt: existingAgent.systemPrompt,
    firstMessage: existingAgent.firstMessage || undefined,
    voiceProvider: existingAgent.voiceProvider,
    voiceId: existingAgent.voiceId,
    modelProvider: existingAgent.modelProvider,
    model: existingAgent.model,
  });
}

/**
 * Get agent stats
 */
export async function getAgentStats(agentId: string, organizationId: string) {
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  });

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent not found",
    });
  }

  // Get call stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalls, completedCalls, totalMinutes, avgSentiment] = await Promise.all([
    db.call.count({
      where: { agentId, createdAt: { gte: thirtyDaysAgo } },
    }),
    db.call.count({
      where: { agentId, status: "completed", createdAt: { gte: thirtyDaysAgo } },
    }),
    db.call.aggregate({
      where: { agentId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { durationSeconds: true },
    }),
    db.call.groupBy({
      by: ["sentiment"],
      where: { agentId, sentiment: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
  ]);

  const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
  const minutes = Math.round((totalMinutes._sum.durationSeconds || 0) / 60);

  // Calculate sentiment breakdown
  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  avgSentiment.forEach((s) => {
    if (s.sentiment && s.sentiment in sentimentBreakdown) {
      sentimentBreakdown[s.sentiment as keyof typeof sentimentBreakdown] = s._count;
    }
  });

  return {
    totalCalls,
    completedCalls,
    successRate: Math.round(successRate),
    totalMinutes: minutes,
    sentimentBreakdown,
  };
}
