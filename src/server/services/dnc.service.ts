import { db } from "@/lib/db";

// US State calling hours restrictions
const STATE_CALLING_HOURS: Record<string, { start: number; end: number }> = {
  FL: { start: 8, end: 20 }, // Florida: 8am-8pm
  CA: { start: 8, end: 21 }, // California: 8am-9pm
  TX: { start: 8, end: 21 }, // Texas: 8am-9pm
  NY: { start: 8, end: 21 }, // New York: 8am-9pm
  DEFAULT: { start: 8, end: 21 }, // Federal default: 8am-9pm
};

// Two-party consent states (require explicit recording disclosure)
const TWO_PARTY_CONSENT_STATES = [
  "CA", "CT", "FL", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "PA", "VT", "WA",
];

// Opt-out phrases to detect during calls
const OPT_OUT_PHRASES = [
  "stop calling",
  "take me off your list",
  "do not call",
  "remove my number",
  "unsubscribe",
  "opt out",
  "don't call me",
  "remove me",
  "never call",
];

export interface DNCCheckResult {
  isBlocked: boolean;
  reason?: string;
  source?: "national" | "internal" | "verbal_request";
}

export interface CallingHoursResult {
  canCall: boolean;
  reason?: string;
  nextAvailableTime?: Date;
}

export interface ConsentResult {
  hasConsent: boolean;
  consentType?: string;
  expiresAt?: Date;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return digits.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Get area code from phone number
 */
export function getAreaCode(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  const match = normalized.match(/^\+1(\d{3})/);
  return match?.[1] ?? null;
}

/**
 * Check if a phone number is on the DNC list
 */
export async function checkDNC(
  phoneNumber: string,
  organizationId: string
): Promise<DNCCheckResult> {
  const normalized = normalizePhoneNumber(phoneNumber);

  const dncEntry = await db.dNCEntry.findFirst({
    where: {
      organizationId,
      phoneNumber: normalized,
    },
  });

  if (dncEntry) {
    return {
      isBlocked: true,
      reason: dncEntry.reason || "Number is on Do Not Call list",
      source: dncEntry.source as "national" | "internal" | "verbal_request",
    };
  }

  return { isBlocked: false };
}

/**
 * Bulk check multiple phone numbers against DNC list
 */
export async function bulkCheckDNC(
  phoneNumbers: string[],
  organizationId: string
): Promise<Map<string, DNCCheckResult>> {
  const normalized = phoneNumbers.map(normalizePhoneNumber);

  const dncEntries = await db.dNCEntry.findMany({
    where: {
      organizationId,
      phoneNumber: { in: normalized },
    },
  });

  const dncMap = new Map<string, DNCCheckResult>();

  // Initialize all as not blocked
  for (const phone of normalized) {
    dncMap.set(phone, { isBlocked: false });
  }

  // Mark blocked numbers
  for (const entry of dncEntries) {
    dncMap.set(entry.phoneNumber, {
      isBlocked: true,
      reason: entry.reason || "Number is on Do Not Call list",
      source: entry.source as "national" | "internal" | "verbal_request",
    });
  }

  return dncMap;
}

/**
 * Add a phone number to the DNC list
 */
export async function addToDNC(
  phoneNumber: string,
  organizationId: string,
  source: "national" | "internal" | "verbal_request",
  reason?: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db.dNCEntry.upsert({
    where: {
      organizationId_phoneNumber: {
        organizationId,
        phoneNumber: normalized,
      },
    },
    create: {
      organizationId,
      phoneNumber: normalized,
      source,
      reason,
    },
    update: {
      source,
      reason,
      addedAt: new Date(),
    },
  });
}

/**
 * Remove a phone number from the DNC list
 */
export async function removeFromDNC(
  phoneNumber: string,
  organizationId: string
): Promise<boolean> {
  const normalized = normalizePhoneNumber(phoneNumber);

  try {
    await db.dNCEntry.delete({
      where: {
        organizationId_phoneNumber: {
          organizationId,
          phoneNumber: normalized,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if calling is allowed based on time restrictions
 */
export function checkCallingHours(
  state: string,
  timezone: string
): CallingHoursResult {
  // Default rules - federal standard: 8am-9pm
  const defaultRules = { start: 8, end: 21 };
  const stateRules = STATE_CALLING_HOURS[state];
  const startHour = stateRules?.start ?? defaultRules.start;
  const endHour = stateRules?.end ?? defaultRules.end;

  // Get current time in the contact's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });

  const currentHour = parseInt(formatter.format(now), 10);

  if (currentHour >= startHour && currentHour < endHour) {
    return { canCall: true };
  }

  // Calculate next available time
  const nextAvailable = new Date(now);
  if (currentHour >= endHour) {
    // Next day at start time
    nextAvailable.setDate(nextAvailable.getDate() + 1);
  }
  nextAvailable.setHours(startHour, 0, 0, 0);

  return {
    canCall: false,
    reason: `Calling hours are ${startHour}:00 - ${endHour}:00 in ${state || "local"} time`,
    nextAvailableTime: nextAvailable,
  };
}

/**
 * Check if state requires two-party consent for recording
 */
export function requiresTwoPartyConsent(state: string): boolean {
  return TWO_PARTY_CONSENT_STATES.includes(state.toUpperCase());
}

/**
 * Check consent status for a phone number
 */
export async function checkConsent(
  phoneNumber: string,
  organizationId: string
): Promise<ConsentResult> {
  const normalized = normalizePhoneNumber(phoneNumber);

  const consent = await db.consent.findFirst({
    where: {
      organizationId,
      contactPhone: normalized,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { timestamp: "desc" },
  });

  if (!consent) {
    return { hasConsent: false };
  }

  return {
    hasConsent: true,
    consentType: consent.consentType,
    expiresAt: consent.expiresAt || undefined,
  };
}

/**
 * Record consent for a phone number
 */
export async function recordConsent(
  phoneNumber: string,
  organizationId: string,
  consentType: "PEWC" | "EXPRESS" | "EBR",
  consentMethod: "web_form" | "verbal" | "paper",
  consentText: string,
  ipAddress?: string,
  expiresAt?: Date
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db.consent.create({
    data: {
      organizationId,
      contactPhone: normalized,
      consentType,
      consentMethod,
      consentText,
      ipAddress,
      expiresAt,
    },
  });
}

/**
 * Revoke consent for a phone number
 */
export async function revokeConsent(
  phoneNumber: string,
  organizationId: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);

  await db.consent.updateMany({
    where: {
      organizationId,
      contactPhone: normalized,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

/**
 * Detect opt-out phrases in transcript
 */
export function detectOptOut(transcript: string): boolean {
  const lowerTranscript = transcript.toLowerCase();
  return OPT_OUT_PHRASES.some((phrase) => lowerTranscript.includes(phrase));
}

/**
 * Handle opt-out request from a call
 */
export async function handleOptOutRequest(
  phoneNumber: string,
  organizationId: string,
  callId?: string,
  transcript?: string
): Promise<void> {
  // Add to DNC list
  await addToDNC(phoneNumber, organizationId, "verbal_request", "Opt-out requested during call");

  // Revoke any existing consent
  await revokeConsent(phoneNumber, organizationId);

  // Update any contacts with this number
  await db.contact.updateMany({
    where: {
      organizationId,
      phoneNumber: normalizePhoneNumber(phoneNumber),
    },
    data: {
      status: "dnc",
    },
  });
}

/**
 * Get AI disclosure text (required by FTC)
 */
export function getAIDisclosure(companyName: string, state?: string): string {
  let disclosure = `Hello, this is an AI assistant calling on behalf of ${companyName}.`;

  // Add recording disclosure for two-party consent states
  if (state && requiresTwoPartyConsent(state)) {
    disclosure += " This call may be recorded for quality assurance purposes.";
  }

  return disclosure;
}

/**
 * Scrub a list of contacts against DNC and return clean list
 */
export async function scrubContacts(
  phoneNumbers: string[],
  organizationId: string
): Promise<{
  clean: string[];
  blocked: Array<{ phone: string; reason: string }>;
}> {
  const dncResults = await bulkCheckDNC(phoneNumbers, organizationId);

  const clean: string[] = [];
  const blocked: Array<{ phone: string; reason: string }> = [];

  for (const phone of phoneNumbers) {
    const normalized = normalizePhoneNumber(phone);
    const result = dncResults.get(normalized);

    if (result?.isBlocked) {
      blocked.push({ phone, reason: result.reason || "On DNC list" });
    } else {
      clean.push(phone);
    }
  }

  return { clean, blocked };
}
