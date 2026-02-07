// Twilio API client for phone number management
// This handles buying numbers from the SaaS's master Twilio account

const TWILIO_API_URL = "https://api.twilio.com/2010-04-01";

interface TwilioRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: Record<string, string>;
  accountSid?: string; // Use subaccount SID if provided
  authToken?: string; // Use subaccount auth token if provided
}

function getAuthHeader(accountSid?: string, authToken?: string): string {
  const sid = accountSid || process.env.TWILIO_ACCOUNT_SID!;
  const token = authToken || process.env.TWILIO_AUTH_TOKEN!;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

async function twilioRequest<T>(options: TwilioRequestOptions): Promise<T> {
  const { method, path, body, accountSid, authToken } = options;
  const sid = accountSid || process.env.TWILIO_ACCOUNT_SID!;

  // Separate path from query string so .json goes before query params
  const [basePath, queryString] = path.split("?");
  const url = `${TWILIO_API_URL}/Accounts/${sid}${basePath}.json${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: getAuthHeader(accountSid, authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorCode = error.code ? ` (${error.code})` : "";
    throw new Error(`Twilio API error: ${response.status}${errorCode} - ${error.message || JSON.stringify(error)}`);
  }

  return response.json();
}

// ============================================
// Subaccount Management
// ============================================

export interface TwilioSubaccount {
  sid: string;
  auth_token: string;
  friendly_name: string;
  status: string;
  date_created: string;
}

/**
 * Create a Twilio subaccount for an organization
 * This isolates their numbers and usage from other clients
 */
export async function createSubaccount(friendlyName: string): Promise<TwilioSubaccount> {
  return twilioRequest<TwilioSubaccount>({
    method: "POST",
    path: "/Accounts",
    body: {
      FriendlyName: friendlyName,
    },
  });
}

/**
 * Get a subaccount by SID
 */
export async function getSubaccount(subaccountSid: string): Promise<TwilioSubaccount> {
  return twilioRequest<TwilioSubaccount>({
    method: "GET",
    path: "",
    accountSid: subaccountSid,
  });
}

/**
 * Close/suspend a subaccount
 */
export async function closeSubaccount(subaccountSid: string): Promise<TwilioSubaccount> {
  return twilioRequest<TwilioSubaccount>({
    method: "POST",
    path: "",
    accountSid: subaccountSid,
    body: {
      Status: "closed",
    },
  });
}

// ============================================
// Phone Number Search & Purchase
// ============================================

export interface AvailablePhoneNumber {
  phone_number: string; // E.164 format
  friendly_name: string;
  locality: string;
  region: string;
  postal_code: string;
  iso_country: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

export interface SearchPhoneNumbersOptions {
  countryCode: string; // ISO country code (US, GB, GH, etc.)
  areaCode?: string;
  contains?: string; // Pattern to match (e.g., "*COFFEE*")
  type?: "local" | "toll-free" | "mobile";
  limit?: number;
  // For subaccount purchases
  accountSid?: string;
  authToken?: string;
}

/**
 * Search for available phone numbers to purchase
 */
export async function searchAvailableNumbers(
  options: SearchPhoneNumbersOptions
): Promise<AvailablePhoneNumber[]> {
  const { countryCode, areaCode, contains, type = "local", limit = 10, accountSid, authToken } = options;

  // Determine the number type endpoint
  let typeEndpoint = "Local";
  if (type === "toll-free") typeEndpoint = "TollFree";
  if (type === "mobile") typeEndpoint = "Mobile";

  const params = new URLSearchParams();
  if (areaCode) params.set("AreaCode", areaCode);
  if (contains) params.set("Contains", contains);
  params.set("PageSize", limit.toString());

  const queryString = params.toString();
  const path = `/AvailablePhoneNumbers/${countryCode}/${typeEndpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await twilioRequest<{ available_phone_numbers: AvailablePhoneNumber[] }>({
    method: "GET",
    path,
    accountSid,
    authToken,
  });

  return response.available_phone_numbers || [];
}

export interface PurchasedPhoneNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  status: string;
  date_created: string;
}

export interface BuyPhoneNumberOptions {
  phoneNumber: string; // E.164 format from search results
  friendlyName?: string;
  // For subaccount purchases
  accountSid?: string;
  authToken?: string;
}

/**
 * Purchase a phone number
 */
export async function buyPhoneNumber(
  options: BuyPhoneNumberOptions
): Promise<PurchasedPhoneNumber> {
  const { phoneNumber, friendlyName, accountSid, authToken } = options;

  const body: Record<string, string> = {
    PhoneNumber: phoneNumber,
  };

  if (friendlyName) {
    body.FriendlyName = friendlyName;
  }

  return twilioRequest<PurchasedPhoneNumber>({
    method: "POST",
    path: "/IncomingPhoneNumbers",
    body,
    accountSid,
    authToken,
  });
}

/**
 * List all phone numbers in an account
 */
export async function listPhoneNumbers(
  accountSid?: string,
  authToken?: string
): Promise<PurchasedPhoneNumber[]> {
  const response = await twilioRequest<{ incoming_phone_numbers: PurchasedPhoneNumber[] }>({
    method: "GET",
    path: "/IncomingPhoneNumbers",
    accountSid,
    authToken,
  });

  return response.incoming_phone_numbers || [];
}

/**
 * Get a specific phone number
 */
export async function getPhoneNumber(
  numberSid: string,
  accountSid?: string,
  authToken?: string
): Promise<PurchasedPhoneNumber> {
  return twilioRequest<PurchasedPhoneNumber>({
    method: "GET",
    path: `/IncomingPhoneNumbers/${numberSid}`,
    accountSid,
    authToken,
  });
}

/**
 * Release (delete) a phone number
 */
export async function releasePhoneNumber(
  numberSid: string,
  accountSid?: string,
  authToken?: string
): Promise<void> {
  const sid = accountSid || process.env.TWILIO_ACCOUNT_SID!;
  const token = authToken || process.env.TWILIO_AUTH_TOKEN!;

  const url = `${TWILIO_API_URL}/Accounts/${sid}/IncomingPhoneNumbers/${numberSid}.json`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Twilio API error: ${response.status} - ${error.message || JSON.stringify(error)}`);
  }
}

/**
 * Update phone number configuration (e.g., webhook URLs)
 */
export async function updatePhoneNumber(
  numberSid: string,
  updates: {
    friendlyName?: string;
    voiceUrl?: string;
    voiceMethod?: "GET" | "POST";
    statusCallback?: string;
  },
  accountSid?: string,
  authToken?: string
): Promise<PurchasedPhoneNumber> {
  const body: Record<string, string> = {};

  if (updates.friendlyName) body.FriendlyName = updates.friendlyName;
  if (updates.voiceUrl) body.VoiceUrl = updates.voiceUrl;
  if (updates.voiceMethod) body.VoiceMethod = updates.voiceMethod;
  if (updates.statusCallback) body.StatusCallback = updates.statusCallback;

  return twilioRequest<PurchasedPhoneNumber>({
    method: "POST",
    path: `/IncomingPhoneNumbers/${numberSid}`,
    body,
    accountSid,
    authToken,
  });
}

// ============================================
// Supported Countries
// ============================================

export interface SupportedCountry {
  code: string;
  name: string;
  flag: string;
  hasLocal: boolean;
  hasTollFree: boolean;
  hasMobile: boolean;
}

/**
 * List of countries where Twilio can provision phone numbers
 */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", hasLocal: true, hasTollFree: true, hasMobile: false },
  { code: "CA", name: "Canada", flag: "🇨🇦", hasLocal: true, hasTollFree: true, hasMobile: false },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "AU", name: "Australia", flag: "🇦🇺", hasLocal: true, hasTollFree: true, hasMobile: true },
  { code: "DE", name: "Germany", flag: "🇩🇪", hasLocal: true, hasTollFree: true, hasMobile: true },
  { code: "FR", name: "France", flag: "🇫🇷", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "ES", name: "Spain", flag: "🇪🇸", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "IT", name: "Italy", flag: "🇮🇹", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "BE", name: "Belgium", flag: "🇧🇪", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "IE", name: "Ireland", flag: "🇮🇪", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "SE", name: "Sweden", flag: "🇸🇪", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "NO", name: "Norway", flag: "🇳🇴", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "DK", name: "Denmark", flag: "🇩🇰", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "FI", name: "Finland", flag: "🇫🇮", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "AT", name: "Austria", flag: "🇦🇹", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "PL", name: "Poland", flag: "🇵🇱", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "PT", name: "Portugal", flag: "🇵🇹", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "JP", name: "Japan", flag: "🇯🇵", hasLocal: true, hasTollFree: true, hasMobile: false },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "SG", name: "Singapore", flag: "🇸🇬", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "IN", name: "India", flag: "🇮🇳", hasLocal: false, hasTollFree: true, hasMobile: false },
  { code: "PH", name: "Philippines", flag: "🇵🇭", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "MX", name: "Mexico", flag: "🇲🇽", hasLocal: true, hasTollFree: true, hasMobile: false },
  { code: "BR", name: "Brazil", flag: "🇧🇷", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", hasLocal: true, hasTollFree: false, hasMobile: true },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", hasLocal: false, hasTollFree: false, hasMobile: true },
  { code: "KE", name: "Kenya", flag: "🇰🇪", hasLocal: false, hasTollFree: false, hasMobile: true },
  { code: "GH", name: "Ghana", flag: "🇬🇭", hasLocal: false, hasTollFree: false, hasMobile: true },
];

/**
 * Get supported number types for a country
 */
export function getCountryNumberTypes(countryCode: string): ("local" | "toll-free" | "mobile")[] {
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return [];

  const types: ("local" | "toll-free" | "mobile")[] = [];
  if (country.hasLocal) types.push("local");
  if (country.hasTollFree) types.push("toll-free");
  if (country.hasMobile) types.push("mobile");

  return types;
}

// ============================================
// Pricing (for display purposes)
// ============================================

/**
 * Approximate monthly costs per number (USD)
 * These are estimates - actual pricing from Twilio may vary
 */
export const NUMBER_PRICING: Record<string, { local: number; tollFree: number; mobile: number }> = {
  US: { local: 1.15, tollFree: 2.15, mobile: 0 },
  CA: { local: 1.15, tollFree: 2.15, mobile: 0 },
  GB: { local: 1.15, tollFree: 0, mobile: 1.15 },
  AU: { local: 2.15, tollFree: 3.15, mobile: 6.00 },
  DE: { local: 1.15, tollFree: 2.50, mobile: 1.15 },
  GH: { local: 0, tollFree: 0, mobile: 5.00 },
  NG: { local: 0, tollFree: 0, mobile: 10.00 },
  // Default for other countries
  DEFAULT: { local: 1.50, tollFree: 2.50, mobile: 3.00 },
};

export function getNumberPrice(countryCode: string, type: "local" | "toll-free" | "mobile"): number {
  const pricing = NUMBER_PRICING[countryCode] || NUMBER_PRICING.DEFAULT;
  if (!pricing) return 0;

  if (type === "local") return pricing.local;
  if (type === "toll-free") return pricing.tollFree;
  if (type === "mobile") return pricing.mobile;
  return 0;
}

// ============================================
// SMS Messaging
// ============================================

export interface SmsMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered";
  date_created: string;
  date_sent: string | null;
  error_code: number | null;
  error_message: string | null;
}

export interface SendSmsOptions {
  to: string; // E.164 format
  from: string; // E.164 format - must be a Twilio number
  body: string; // Max 1600 characters
  statusCallback?: string; // URL to receive delivery status updates
  // For subaccount
  accountSid?: string;
  authToken?: string;
}

export interface SendSmsResult {
  success: boolean;
  message?: SmsMessage;
  error?: string;
}

/**
 * Send an SMS message
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, from, body, statusCallback, accountSid, authToken } = options;

  // Validate phone numbers
  if (!to.startsWith("+")) {
    return { success: false, error: "To number must be in E.164 format (e.g., +1234567890)" };
  }
  if (!from.startsWith("+")) {
    return { success: false, error: "From number must be in E.164 format (e.g., +1234567890)" };
  }

  // Validate message length
  if (body.length > 1600) {
    return { success: false, error: "Message body exceeds 1600 character limit" };
  }

  try {
    const smsBody: Record<string, string> = {
      To: to,
      From: from,
      Body: body,
    };

    if (statusCallback) {
      smsBody.StatusCallback = statusCallback;
    }

    const message = await twilioRequest<SmsMessage>({
      method: "POST",
      path: "/Messages",
      body: smsBody,
      accountSid,
      authToken,
    });

    console.log(`[Twilio SMS] Sent message ${message.sid} to ${to}`);
    return { success: true, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Twilio SMS] Failed to send to ${to}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get SMS message status
 */
export async function getSmsStatus(
  messageSid: string,
  accountSid?: string,
  authToken?: string
): Promise<SmsMessage> {
  return twilioRequest<SmsMessage>({
    method: "GET",
    path: `/Messages/${messageSid}`,
    accountSid,
    authToken,
  });
}

/**
 * List SMS messages (recent)
 */
export async function listSmsMessages(
  options?: {
    to?: string;
    from?: string;
    dateSent?: string; // YYYY-MM-DD
    pageSize?: number;
    accountSid?: string;
    authToken?: string;
  }
): Promise<SmsMessage[]> {
  const params = new URLSearchParams();
  if (options?.to) params.set("To", options.to);
  if (options?.from) params.set("From", options.from);
  if (options?.dateSent) params.set("DateSent", options.dateSent);
  if (options?.pageSize) params.set("PageSize", options.pageSize.toString());

  const queryString = params.toString();
  const path = `/Messages${queryString ? `?${queryString}` : ""}`;

  const response = await twilioRequest<{ messages: SmsMessage[] }>({
    method: "GET",
    path,
    accountSid: options?.accountSid,
    authToken: options?.authToken,
  });

  return response.messages || [];
}
