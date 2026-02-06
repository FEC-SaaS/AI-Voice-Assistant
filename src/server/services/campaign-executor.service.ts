import { db } from "@/lib/db";
import { createCall } from "@/lib/vapi";
import { checkDNC, checkCallingHours, normalizePhoneNumber } from "./dnc.service";
import { getRemainingMinutes } from "@/constants/plans";
import { createLogger } from "@/lib/logger";
import { logAudit } from "./audit.service";

const log = createLogger("Campaign Executor");

// Campaign execution configuration
export interface CampaignExecutionConfig {
  campaignId: string;
  organizationId: string;
  maxConcurrentCalls?: number;
  delayBetweenCallsMs?: number;
}

export interface CallResult {
  contactId: string;
  success: boolean;
  callId?: string;
  error?: string;
  skippedReason?: string;
}

export interface CampaignExecutionResult {
  campaignId: string;
  totalContacts: number;
  callsAttempted: number;
  callsSucceeded: number;
  callsFailed: number;
  callsSkipped: number;
  results: CallResult[];
}

// State tracking for campaigns
const campaignStates = new Map<string, "running" | "paused" | "stopped">();

/**
 * Get campaign execution state
 */
export function getCampaignState(campaignId: string): "running" | "paused" | "stopped" | undefined {
  return campaignStates.get(campaignId);
}

/**
 * Stop campaign execution
 */
export function stopCampaign(campaignId: string): void {
  campaignStates.set(campaignId, "stopped");
}

/**
 * Pause campaign execution
 */
export function pauseCampaign(campaignId: string): void {
  campaignStates.set(campaignId, "paused");
}

/**
 * Resume campaign execution
 */
export function resumeCampaign(campaignId: string): void {
  campaignStates.set(campaignId, "running");
}

/**
 * Check if campaign should continue executing
 */
function shouldContinue(campaignId: string): boolean {
  const state = campaignStates.get(campaignId);
  return state === "running";
}

/**
 * Get timezone offset for a contact based on area code
 * Maps US area codes to approximate timezones
 */
function getTimezoneFromAreaCode(areaCode: string): string {
  // Common US area code to timezone mapping
  const areaCodeToTimezone: Record<string, string> = {
    // Eastern Time
    "201": "America/New_York", "202": "America/New_York", "203": "America/New_York",
    "212": "America/New_York", "215": "America/New_York", "301": "America/New_York",
    "302": "America/New_York", "305": "America/New_York",
    "404": "America/New_York", "407": "America/New_York", "410": "America/New_York",
    // Central Time
    "214": "America/Chicago", "312": "America/Chicago", "314": "America/Chicago",
    "469": "America/Chicago", "512": "America/Chicago", "713": "America/Chicago",
    // Mountain Time
    "303": "America/Denver", "480": "America/Denver", "602": "America/Denver",
    "720": "America/Denver", "801": "America/Denver",
    // Pacific Time
    "206": "America/Los_Angeles", "213": "America/Los_Angeles", "310": "America/Los_Angeles",
    "323": "America/Los_Angeles", "408": "America/Los_Angeles", "415": "America/Los_Angeles",
    "503": "America/Los_Angeles", "510": "America/Los_Angeles", "619": "America/Los_Angeles",
    "650": "America/Los_Angeles", "702": "America/Los_Angeles", "818": "America/Los_Angeles",
    "858": "America/Los_Angeles",
  };

  return areaCodeToTimezone[areaCode] || "America/New_York";
}

/**
 * Get state from area code (simplified mapping)
 */
function getStateFromAreaCode(areaCode: string): string {
  const areaCodeToState: Record<string, string> = {
    "201": "NJ", "202": "DC", "203": "CT", "205": "AL", "206": "WA",
    "207": "ME", "208": "ID", "209": "CA", "210": "TX", "212": "NY",
    "213": "CA", "214": "TX", "215": "PA", "216": "OH", "217": "IL",
    "301": "MD", "302": "DE", "303": "CO", "304": "WV", "305": "FL",
    "310": "CA", "312": "IL", "313": "MI", "314": "MO", "315": "NY",
    "323": "CA", "404": "GA", "407": "FL", "408": "CA", "410": "MD",
    "412": "PA", "415": "CA", "469": "TX", "480": "AZ", "503": "OR",
    "510": "CA", "512": "TX", "602": "AZ", "619": "CA", "650": "CA",
    "702": "NV", "713": "TX", "714": "CA", "718": "NY", "720": "CO",
    "801": "UT", "818": "CA", "858": "CA", "917": "NY",
  };

  return areaCodeToState[areaCode] || "NY";
}

/**
 * Check if we can make calls based on usage limits
 */
async function checkUsageLimits(organizationId: string): Promise<{ canCall: boolean; reason?: string }> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    return { canCall: false, reason: "Organization not found" };
  }

  // Get current month usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await db.call.aggregate({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      durationSeconds: true,
    },
  });

  const usedMinutes = Math.ceil((usage._sum.durationSeconds || 0) / 60);
  const remainingMinutes = getRemainingMinutes(usedMinutes, org.planId);

  if (remainingMinutes <= 0) {
    return {
      canCall: false,
      reason: "Monthly minute limit reached. Please upgrade your plan.",
    };
  }

  return { canCall: true };
}

/**
 * Process a single contact for calling
 */
async function processContact(
  contact: {
    id: string;
    phoneNumber: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationId: string;
  },
  campaign: {
    id: string;
    agentId: string;
    organizationId: string;
    callingHours: { start: string; end: string };
  },
  agent: {
    id: string;
    vapiAssistantId: string | null;
    name: string;
    phoneNumbers: Array<{ vapiPhoneId: string | null }>;
  }
): Promise<CallResult> {
  const phoneNumber = normalizePhoneNumber(contact.phoneNumber);
  const areaCode = phoneNumber.replace(/^\+1/, "").substring(0, 3);
  const state = getStateFromAreaCode(areaCode);
  const timezone = getTimezoneFromAreaCode(areaCode);

  // Check DNC list
  const dncCheck = await checkDNC(phoneNumber, contact.organizationId);
  if (dncCheck.isBlocked) {
    // Update contact status to DNC
    await db.contact.update({
      where: { id: contact.id },
      data: { status: "dnc" },
    });

    await logAudit({
      organizationId: contact.organizationId,
      action: "call.blocked",
      entityType: "contact",
      entityId: contact.id,
      details: { reason: dncCheck.reason, phoneNumber },
    });

    return {
      contactId: contact.id,
      success: false,
      skippedReason: `DNC: ${dncCheck.reason}`,
    };
  }

  // Check calling hours
  const hoursCheck = checkCallingHours(state, timezone);
  if (!hoursCheck.canCall) {
    return {
      contactId: contact.id,
      success: false,
      skippedReason: hoursCheck.reason,
    };
  }

  // Check if agent has phone number
  const agentPhoneNumberId = agent.phoneNumbers[0]?.vapiPhoneId;
  if (!agent.phoneNumbers.length || !agentPhoneNumberId) {
    return {
      contactId: contact.id,
      success: false,
      error: "Agent has no phone number assigned",
    };
  }

  // Check if agent has voice system assistant ID
  const assistantId = agent.vapiAssistantId;
  if (!assistantId) {
    return {
      contactId: contact.id,
      success: false,
      error: "Agent is not connected to voice system",
    };
  }

  try {
    // Update contact status to "called"
    await db.contact.update({
      where: { id: contact.id },
      data: {
        status: "called",
        callAttempts: { increment: 1 },
        lastCalledAt: new Date(),
      },
    });

    // Create the call via Vapi
    const vapiCall = await createCall({
      assistantId,
      phoneNumberId: agentPhoneNumberId,
      customerNumber: phoneNumber,
      metadata: {
        campaignId: campaign.id,
        contactId: contact.id,
        organizationId: campaign.organizationId,
        contactName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
      },
    });

    // Create call record in database
    const call = await db.call.create({
      data: {
        organizationId: campaign.organizationId,
        agentId: agent.id,
        campaignId: campaign.id,
        contactId: contact.id,
        vapiCallId: vapiCall.id,
        direction: "outbound",
        status: "queued",
        toNumber: phoneNumber,
      },
    });

    return {
      contactId: contact.id,
      success: true,
      callId: call.id,
    };
  } catch (error) {
    log.error(`Failed to call contact ${contact.id}:`, error);

    // Update contact status to failed
    await db.contact.update({
      where: { id: contact.id },
      data: { status: "failed" },
    });

    return {
      contactId: contact.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a campaign - processes all pending contacts
 */
export async function executeCampaign(
  config: CampaignExecutionConfig
): Promise<CampaignExecutionResult> {
  const { campaignId, organizationId, delayBetweenCallsMs = 5000 } = config;

  // Set campaign state to running
  campaignStates.set(campaignId, "running");

  await logAudit({
    organizationId,
    action: "campaign.started",
    entityType: "campaign",
    entityId: campaignId,
  });

  const result: CampaignExecutionResult = {
    campaignId,
    totalContacts: 0,
    callsAttempted: 0,
    callsSucceeded: 0,
    callsFailed: 0,
    callsSkipped: 0,
    results: [],
  };

  try {
    // Get campaign with agent and phone numbers
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
      include: {
        agent: {
          include: {
            phoneNumbers: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (!campaign.agent.vapiAssistantId) {
      throw new Error("Agent is not connected to voice system");
    }

    const callingHours = campaign.callingHours as { start: string; end: string };

    // Get pending contacts
    const contacts = await db.contact.findMany({
      where: {
        campaignId,
        organizationId,
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
    });

    result.totalContacts = contacts.length;

    // Process contacts
    for (let i = 0; i < contacts.length; i++) {
      // Check if campaign should continue
      if (!shouldContinue(campaignId)) {
        log.info(`Campaign ${campaignId} stopped or paused`);
        break;
      }

      // Check usage limits
      const usageLimits = await checkUsageLimits(organizationId);
      if (!usageLimits.canCall) {
        log.info(`Usage limit reached: ${usageLimits.reason}`);
        break;
      }

      const contact = contacts[i];
      if (!contact) continue; // TypeScript safety check

      result.callsAttempted++;

      const callResult = await processContact(
        contact,
        { ...campaign, callingHours },
        campaign.agent
      );

      result.results.push(callResult);

      if (callResult.success) {
        result.callsSucceeded++;
      } else if (callResult.skippedReason) {
        result.callsSkipped++;
      } else {
        result.callsFailed++;
      }

      // Delay between calls to avoid rate limiting
      if (i < contacts.length - 1 && shouldContinue(campaignId)) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenCallsMs));
      }
    }

    // Update campaign stats
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        stats: {
          lastExecutedAt: new Date().toISOString(),
          callsAttempted: result.callsAttempted,
          callsSucceeded: result.callsSucceeded,
          callsFailed: result.callsFailed,
          callsSkipped: result.callsSkipped,
        },
      },
    });

    // Check if campaign is complete
    const remainingContacts = await db.contact.count({
      where: {
        campaignId,
        organizationId,
        status: "pending",
      },
    });

    if (remainingContacts === 0) {
      await db.campaign.update({
        where: { id: campaignId },
        data: {
          status: "completed",
          stats: {
            ...((campaign.stats as object) || {}),
            completedAt: new Date().toISOString(),
          },
        },
      });
    }

  } catch (error) {
    log.error(`Error executing campaign ${campaignId}:`, error);

    // Update campaign status to paused on error
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "paused" },
    });

    throw error;
  } finally {
    // Clear campaign state
    campaignStates.delete(campaignId);
  }

  return result;
}

/**
 * Execute a batch of calls for a campaign (used for incremental execution)
 */
export async function executeCampaignBatch(
  campaignId: string,
  organizationId: string,
  _batchSize: number = 10
): Promise<CampaignExecutionResult> {
  return executeCampaign({
    campaignId,
    organizationId,
    maxConcurrentCalls: 1,
    delayBetweenCallsMs: 3000,
  });
}

/**
 * Get campaigns that are scheduled to run
 */
export async function getScheduledCampaigns(): Promise<Array<{ id: string; organizationId: string }>> {
  const now = new Date();

  const campaigns = await db.campaign.findMany({
    where: {
      status: "running",
      OR: [
        { scheduleStart: null },
        { scheduleStart: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { scheduleEnd: null },
            { scheduleEnd: { gte: now } },
          ],
        },
      ],
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  return campaigns;
}

/**
 * Process all scheduled campaigns (to be called by cron job)
 */
export async function processScheduledCampaigns(): Promise<void> {
  const campaigns = await getScheduledCampaigns();

  log.info(`Processing ${campaigns.length} scheduled campaigns`);

  for (const campaign of campaigns) {
    try {
      // Check if campaign is already being executed
      if (getCampaignState(campaign.id)) {
        log.info(`Campaign ${campaign.id} is already running`);
        continue;
      }

      await executeCampaignBatch(campaign.id, campaign.organizationId, 10);
    } catch (error) {
      log.error(`Failed to process campaign ${campaign.id}:`, error);
    }
  }
}
