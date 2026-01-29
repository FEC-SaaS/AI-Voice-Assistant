import { db } from "@/lib/db";
import {
  createAssistant,
  updateAssistant,
  getAssistant,
  VapiAssistant,
} from "@/lib/vapi";

/**
 * Sync all agents for an organization to Vapi
 */
export async function syncAllAgentsToVapi(organizationId: string) {
  const agents = await db.agent.findMany({
    where: {
      organizationId,
      vapiAssistantId: null,
      isActive: true,
    },
  });

  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const agent of agents) {
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

      await db.agent.update({
        where: { id: agent.id },
        data: { vapiAssistantId: vapiAssistant.id },
      });

      results.synced++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Agent ${agent.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return results;
}

/**
 * Sync agent from Vapi to local database
 */
export async function syncAgentFromVapi(
  vapiAssistantId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const vapiAssistant = await getAssistant(vapiAssistantId);

    // Check if agent exists locally
    const existingAgent = await db.agent.findFirst({
      where: { vapiAssistantId, organizationId },
    });

    if (existingAgent) {
      // Update local agent with Vapi data
      await db.agent.update({
        where: { id: existingAgent.id },
        data: {
          name: vapiAssistant.name,
          systemPrompt: vapiAssistant.model.systemPrompt,
          voiceProvider: vapiAssistant.voice.provider,
          voiceId: vapiAssistant.voice.voiceId,
          modelProvider: vapiAssistant.model.provider,
          model: vapiAssistant.model.model,
          firstMessage: vapiAssistant.firstMessage,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("[Vapi Sync] Failed to sync from Vapi:", error);
    return false;
  }
}

/**
 * Push local agent changes to Vapi
 */
export async function pushAgentToVapi(agentId: string): Promise<boolean> {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    return false;
  }

  try {
    if (agent.vapiAssistantId) {
      // Update existing assistant
      await updateAssistant(agent.vapiAssistantId, {
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.firstMessage || undefined,
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
        modelProvider: agent.modelProvider,
        model: agent.model,
      });
    } else {
      // Create new assistant
      const vapiAssistant = await createAssistant({
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.firstMessage || undefined,
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
        modelProvider: agent.modelProvider,
        model: agent.model,
      });

      await db.agent.update({
        where: { id: agentId },
        data: { vapiAssistantId: vapiAssistant.id },
      });
    }

    return true;
  } catch (error) {
    console.error("[Vapi Sync] Failed to push to Vapi:", error);
    return false;
  }
}

/**
 * Verify agent sync status
 */
export async function verifyAgentSync(agentId: string): Promise<{
  isSynced: boolean;
  needsUpdate: boolean;
  vapiData?: VapiAssistant;
}> {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || !agent.vapiAssistantId) {
    return { isSynced: false, needsUpdate: true };
  }

  try {
    const vapiAssistant = await getAssistant(agent.vapiAssistantId);

    // Check if data matches
    const needsUpdate =
      vapiAssistant.name !== agent.name ||
      vapiAssistant.model.systemPrompt !== agent.systemPrompt ||
      vapiAssistant.voice.voiceId !== agent.voiceId ||
      vapiAssistant.firstMessage !== agent.firstMessage;

    return {
      isSynced: true,
      needsUpdate,
      vapiData: vapiAssistant,
    };
  } catch {
    // Vapi assistant might have been deleted
    return { isSynced: false, needsUpdate: true };
  }
}

/**
 * Handle webhook updates from Vapi
 */
export async function handleVapiWebhookUpdate(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    case "assistant.updated":
      if (typeof data.id === "string") {
        const agent = await db.agent.findFirst({
          where: { vapiAssistantId: data.id },
        });
        if (agent) {
          await syncAgentFromVapi(data.id, agent.organizationId);
        }
      }
      break;

    case "assistant.deleted":
      if (typeof data.id === "string") {
        // Mark agent as desynced
        await db.agent.updateMany({
          where: { vapiAssistantId: data.id },
          data: { vapiAssistantId: null },
        });
      }
      break;

    default:
      // Unknown event type
      break;
  }
}

/**
 * Get sync status for all agents in organization
 */
export async function getOrganizationSyncStatus(organizationId: string) {
  const agents = await db.agent.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      vapiAssistantId: true,
    },
  });

  return {
    total: agents.length,
    synced: agents.filter((a) => a.vapiAssistantId).length,
    unsynced: agents.filter((a) => !a.vapiAssistantId).length,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      isSynced: !!a.vapiAssistantId,
    })),
  };
}
