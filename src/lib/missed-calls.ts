/**
 * Missed Call Service
 * Handles missed call detection, text-back, auto-callback, lead capture, and deduplication
 */

import { db } from "./db";
import { createLogger } from "./logger";

const log = createLogger("MissedCalls");

// ============================================
// Types
// ============================================

export interface MissedCallConfig {
  enableMissedCallTextBack: boolean;
  textBackMessage?: string;
  afterHoursMessage?: string;
  enableAutoCallback: boolean;
  callbackDelayMinutes: number;
  autoCreateLead: boolean;
  dedupWindowMinutes: number;
}

export const DEFAULT_MISSED_CALL_CONFIG: MissedCallConfig = {
  enableMissedCallTextBack: false,
  textBackMessage: "Hi! We missed your call. Reply YES if you'd like us to call you back, or let us know a good time to reach you.",
  afterHoursMessage: "Thanks for calling! We're currently closed but will return your call during business hours.",
  enableAutoCallback: false,
  callbackDelayMinutes: 5,
  autoCreateLead: true,
  dedupWindowMinutes: 30,
};

interface ProcessMissedCallInput {
  organizationId: string;
  agentId?: string;
  callerNumber: string;
  calledNumber?: string;
  reason: string;
  vapiCallId?: string;
}

// ============================================
// Core Functions
// ============================================

/**
 * Check if a missed call is a duplicate within the dedup window
 */
export async function checkDuplicate(
  organizationId: string,
  callerNumber: string,
  dedupWindowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - dedupWindowMinutes * 60 * 1000);

  const existing = await db.missedCall.findFirst({
    where: {
      organizationId,
      callerNumber,
      createdAt: { gte: windowStart },
      isDuplicate: false,
    },
  });

  return !!existing;
}

/**
 * Check if a number is on the DNC list
 */
export async function checkDNC(
  organizationId: string,
  phoneNumber: string
): Promise<boolean> {
  const entry = await db.dNCEntry.findFirst({
    where: {
      organizationId,
      phoneNumber,
    },
  });

  return !!entry;
}

/**
 * Get missed call config from agent settings
 */
export function getMissedCallConfig(agentSettings: Record<string, unknown>): MissedCallConfig {
  return {
    enableMissedCallTextBack: (agentSettings.enableMissedCallTextBack as boolean) || false,
    textBackMessage: (agentSettings.missedCallTextBackMessage as string) || DEFAULT_MISSED_CALL_CONFIG.textBackMessage,
    afterHoursMessage: (agentSettings.missedCallAfterHoursMessage as string) || DEFAULT_MISSED_CALL_CONFIG.afterHoursMessage,
    enableAutoCallback: (agentSettings.enableMissedCallAutoCallback as boolean) || false,
    callbackDelayMinutes: (agentSettings.missedCallCallbackDelay as number) || DEFAULT_MISSED_CALL_CONFIG.callbackDelayMinutes,
    autoCreateLead: (agentSettings.missedCallAutoCreateLead as boolean) ?? DEFAULT_MISSED_CALL_CONFIG.autoCreateLead,
    dedupWindowMinutes: (agentSettings.missedCallDedupWindow as number) || DEFAULT_MISSED_CALL_CONFIG.dedupWindowMinutes,
  };
}

/**
 * Process a missed call — main entry point
 * Called from Vapi webhook when a call ends with no answer / short duration
 */
export async function processMissedCall(input: ProcessMissedCallInput): Promise<void> {
  const { organizationId, agentId, callerNumber, calledNumber, reason, vapiCallId } = input;

  try {
    // Get agent settings for missed call config
    let config = DEFAULT_MISSED_CALL_CONFIG;
    if (agentId) {
      const agent = await db.agent.findUnique({
        where: { id: agentId },
        select: { settings: true },
      });
      if (agent) {
        const settings = (agent.settings as Record<string, unknown>) || {};
        config = getMissedCallConfig(settings);
      }
    }

    // If missed call text-back is not enabled, skip everything
    if (!config.enableMissedCallTextBack) {
      log.debug("Missed call text-back not enabled for agent, skipping", { agentId });
      return;
    }

    // Check DNC
    const isDNC = await checkDNC(organizationId, callerNumber);
    if (isDNC) {
      log.info("Caller is on DNC list, skipping text-back", { callerNumber });
      return;
    }

    // Check dedup
    const isDuplicate = await checkDuplicate(
      organizationId,
      callerNumber,
      config.dedupWindowMinutes
    );

    // Create missed call record
    const missedCall = await db.missedCall.create({
      data: {
        organizationId,
        agentId,
        callerNumber,
        calledNumber,
        reason,
        vapiCallId,
        isDuplicate,
      },
    });

    // If duplicate, don't send another text-back
    if (isDuplicate) {
      log.info("Duplicate missed call, skipping text-back", { callerNumber, missedCallId: missedCall.id });
      return;
    }

    // Send text-back SMS
    await sendTextBack(missedCall.id, organizationId, callerNumber, config);

    // Auto-create lead/contact
    if (config.autoCreateLead) {
      await createLeadFromMissedCall(missedCall.id, organizationId, callerNumber);
    }

    // Schedule auto-callback (if enabled)
    if (config.enableAutoCallback) {
      await scheduleAutoCallback(missedCall.id, organizationId, agentId, callerNumber, config.callbackDelayMinutes);
    }

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId,
        action: "missed_call.processed",
        entityType: "MissedCall",
        entityId: missedCall.id,
        details: {
          callerNumber,
          reason,
          textBackSent: !isDuplicate,
          autoCallback: config.enableAutoCallback,
          leadCreated: config.autoCreateLead,
        },
      },
    }).catch((err) => log.error("Failed to create audit log:", err));

  } catch (error) {
    log.error("Error processing missed call:", error);
  }
}

/**
 * Send text-back SMS to the missed caller
 */
async function sendTextBack(
  missedCallId: string,
  organizationId: string,
  callerNumber: string,
  config: MissedCallConfig
): Promise<void> {
  try {
    const { sendMissedCallFollowUpSms } = await import("./sms");

    // Use custom message if set
    const message = config.textBackMessage || DEFAULT_MISSED_CALL_CONFIG.textBackMessage!;

    // Get org settings for branding
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });
    const settings = (org?.settings as Record<string, unknown>) || {};
    const businessName = (settings.emailBusinessName as string) || org?.name || "CallTone";

    // Build the SMS body with the custom message
    const smsBody = `${businessName}: ${message}`;

    // Get org SMS number
    const phoneNumber = await db.phoneNumber.findFirst({
      where: { organizationId, isActive: true },
      select: { number: true },
      orderBy: { createdAt: "asc" },
    });

    if (!phoneNumber) {
      log.warn("No SMS number configured for org", { organizationId });
      return;
    }

    const { sendSms } = await import("./twilio");
    const result = await sendSms({
      to: callerNumber,
      from: phoneNumber.number,
      body: smsBody,
    });

    if (result.success) {
      await db.missedCall.update({
        where: { id: missedCallId },
        data: {
          textBackSent: true,
          textBackSentAt: new Date(),
          textBackMessage: smsBody,
        },
      });
      log.info("Text-back sent", { missedCallId, callerNumber });
    } else {
      log.error("Failed to send text-back:", result.error);
    }
  } catch (error) {
    log.error("Error sending text-back:", error);
  }
}

/**
 * Create a contact/lead from a missed call
 */
async function createLeadFromMissedCall(
  missedCallId: string,
  organizationId: string,
  callerNumber: string
): Promise<void> {
  try {
    // Check if contact already exists
    const existingContact = await db.contact.findFirst({
      where: {
        organizationId,
        phoneNumber: callerNumber,
      },
    });

    if (existingContact) {
      await db.missedCall.update({
        where: { id: missedCallId },
        data: { contactCreated: false, contactId: existingContact.id },
      });
      return;
    }

    // Create new contact
    const contact = await db.contact.create({
      data: {
        organizationId,
        phoneNumber: callerNumber,
        status: "pending",
        customData: {
          source: "missed_call",
          missedCallId,
        },
      },
    });

    await db.missedCall.update({
      where: { id: missedCallId },
      data: { contactCreated: true, contactId: contact.id },
    });

    log.info("Lead created from missed call", { contactId: contact.id, callerNumber });
  } catch (error) {
    log.error("Error creating lead from missed call:", error);
  }
}

/**
 * Schedule an auto-callback
 * In production, this would use a job queue. For now, we mark it for the cron job to pick up.
 */
async function scheduleAutoCallback(
  missedCallId: string,
  organizationId: string,
  agentId: string | undefined,
  callerNumber: string,
  delayMinutes: number
): Promise<void> {
  try {
    const callbackAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await db.missedCall.update({
      where: { id: missedCallId },
      data: {
        callbackAt,
      },
    });

    log.info("Auto-callback scheduled", { missedCallId, callbackAt, callerNumber });
  } catch (error) {
    log.error("Error scheduling auto-callback:", error);
  }
}

/**
 * Execute pending auto-callbacks (called by cron job)
 */
export async function executePendingCallbacks(): Promise<number> {
  const now = new Date();

  const pendingCallbacks = await db.missedCall.findMany({
    where: {
      callbackAt: { lte: now },
      callbackInitiated: false,
      isDuplicate: false,
    },
    include: {
      agent: {
        select: {
          id: true,
          vapiAssistantId: true,
          phoneNumbers: { select: { vapiPhoneId: true, number: true }, take: 1 },
        },
      },
    },
    take: 50,
  });

  let executed = 0;

  for (const mc of pendingCallbacks) {
    try {
      if (!mc.agent?.vapiAssistantId || !mc.agent.phoneNumbers[0]?.vapiPhoneId) {
        log.warn("Agent not configured for callback, skipping", { missedCallId: mc.id });
        continue;
      }

      // Check DNC again before callback
      const isDNC = await checkDNC(mc.organizationId, mc.callerNumber);
      if (isDNC) {
        log.info("Caller now on DNC, skipping callback", { callerNumber: mc.callerNumber });
        await db.missedCall.update({
          where: { id: mc.id },
          data: { callbackInitiated: true },
        });
        continue;
      }

      const { createCall } = await import("./vapi");
      const vapiCall = await createCall({
        assistantId: mc.agent.vapiAssistantId,
        phoneNumberId: mc.agent.phoneNumbers[0].vapiPhoneId,
        customerNumber: mc.callerNumber,
        metadata: {
          organizationId: mc.organizationId,
          agentId: mc.agent.id,
          type: "missed_call_callback",
          missedCallId: mc.id,
        },
      });

      await db.missedCall.update({
        where: { id: mc.id },
        data: {
          callbackInitiated: true,
          callbackCallId: vapiCall.id,
        },
      });

      executed++;
      log.info("Auto-callback executed", { missedCallId: mc.id, vapiCallId: vapiCall.id });
    } catch (error) {
      log.error("Failed to execute callback:", { missedCallId: mc.id, error });
    }
  }

  return executed;
}
