// Vapi.ai API client
// Note: Install @vapi-ai/server-sdk when available or use fetch

const VAPI_API_URL = "https://api.vapi.ai";

interface VapiRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
}

async function vapiRequest<T>(options: VapiRequestOptions): Promise<T> {
  const { method, path, body } = options;

  const response = await fetch(`${VAPI_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Assistant types
export interface AssistantConfig {
  name: string;
  systemPrompt: string;
  firstMessage?: string;
  voiceProvider?: string;
  voiceId?: string;
  modelProvider?: string;
  model?: string;
}

export interface VapiAssistant {
  id: string;
  name: string;
  voice: {
    provider: string;
    voiceId: string;
  };
  model: {
    provider: string;
    model: string;
    systemPrompt: string;
  };
  firstMessage?: string;
}

// Vapi's built-in voices (no external credentials needed)
const VAPI_VOICES = [
  "Elliot", "Kylie", "Rohan", "Lily", "Savannah", "Hana", "Neha", "Cole",
  "Harry", "Paige", "Spencer", "Leah", "Tara", "Jess", "Leo", "Dan", "Mia", "Zac", "Zoe"
];

// Map voice provider names to Vapi's expected format
function mapVoiceProvider(provider: string): string {
  const providerMap: Record<string, string> = {
    elevenlabs: "11labs",
    "11labs": "11labs",
    vapi: "vapi",
    playht: "playht",
    deepgram: "deepgram",
    openai: "openai",
  };
  return providerMap[provider.toLowerCase()] || "vapi";
}

// Create assistant
export async function createAssistant(config: AssistantConfig): Promise<VapiAssistant> {
  let voiceProvider = mapVoiceProvider(config.voiceProvider || "vapi");
  let voiceId = config.voiceId || "Elliot";

  // If using 11labs but no custom voice ID, fall back to Vapi voices
  // (11labs requires your own credentials and voice IDs)
  if (voiceProvider === "11labs" && !config.voiceId) {
    console.log("[Vapi] No ElevenLabs voice ID provided, falling back to Vapi voice");
    voiceProvider = "vapi";
    voiceId = "Elliot";
  }

  // If the voice ID is a Vapi built-in voice, use vapi provider
  if (VAPI_VOICES.includes(voiceId)) {
    voiceProvider = "vapi";
  }

  const voiceConfig: Record<string, string> = {
    provider: voiceProvider,
    voiceId: voiceId,
  };

  return vapiRequest<VapiAssistant>({
    method: "POST",
    path: "/assistant",
    body: {
      name: config.name,
      model: {
        provider: config.modelProvider || "openai",
        model: config.model || "gpt-4o",
        messages: [
          {
            role: "system",
            content: config.systemPrompt,
          },
        ],
      },
      voice: voiceConfig,
      firstMessage: config.firstMessage || "Hello, how can I help you today?",
    },
  });
}

// Update assistant
export async function updateAssistant(
  assistantId: string,
  config: Partial<AssistantConfig>
): Promise<VapiAssistant> {
  const body: Record<string, unknown> = {};

  if (config.name) body.name = config.name;
  if (config.firstMessage) body.firstMessage = config.firstMessage;

  if (config.systemPrompt || config.modelProvider || config.model) {
    body.model = {
      provider: config.modelProvider || "openai",
      model: config.model || "gpt-4o",
      ...(config.systemPrompt && {
        messages: [
          {
            role: "system",
            content: config.systemPrompt,
          },
        ],
      }),
    };
  }

  if (config.voiceProvider || config.voiceId) {
    const voiceId = config.voiceId || "Elliot";
    // If the voice ID is a Vapi built-in voice, use vapi provider
    const voiceProvider = VAPI_VOICES.includes(voiceId)
      ? "vapi"
      : mapVoiceProvider(config.voiceProvider || "vapi");

    body.voice = {
      provider: voiceProvider,
      voiceId: voiceId,
    };
  }

  return vapiRequest<VapiAssistant>({
    method: "PATCH",
    path: `/assistant/${assistantId}`,
    body,
  });
}

// Delete assistant
export async function deleteAssistant(assistantId: string): Promise<void> {
  await vapiRequest({
    method: "DELETE",
    path: `/assistant/${assistantId}`,
  });
}

// Get assistant
export async function getAssistant(assistantId: string): Promise<VapiAssistant> {
  return vapiRequest<VapiAssistant>({
    method: "GET",
    path: `/assistant/${assistantId}`,
  });
}

// Call types
export interface CallConfig {
  assistantId: string;
  phoneNumberId: string;
  customerNumber: string;
  metadata?: Record<string, string>;
}

export interface VapiCall {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  transcript?: string;
  recordingUrl?: string;
}

// Create outbound call
export async function createCall(config: CallConfig): Promise<VapiCall> {
  return vapiRequest<VapiCall>({
    method: "POST",
    path: "/call",
    body: {
      assistantId: config.assistantId,
      phoneNumberId: config.phoneNumberId,
      customer: {
        number: config.customerNumber,
      },
      metadata: config.metadata,
    },
  });
}

// Get call
export async function getCall(callId: string): Promise<VapiCall> {
  return vapiRequest<VapiCall>({
    method: "GET",
    path: `/call/${callId}`,
  });
}

// Phone number types
export interface PhoneNumberConfig {
  // For importing existing Twilio number
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  phoneNumber?: string; // E.164 format: +1234567890
  // For Vapi-managed numbers
  areaCode?: string;
  // For buying numbers through Vapi (paid plan)
  provider?: "vapi" | "vonage" | "twilio";
  countryCode?: string; // ISO country code (e.g., "US", "GB", "GH")
  numberType?: "local" | "toll-free" | "mobile";
  name?: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  provider: string;
}

// List available phone numbers from Vapi
export async function listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiRequest<VapiPhoneNumber[]>({
    method: "GET",
    path: "/phone-number",
  });
}

// Import a Twilio phone number to Vapi
export async function importTwilioPhoneNumber(config: {
  twilioAccountSid: string;
  twilioAuthToken: string;
  phoneNumber: string; // E.164 format
  name?: string;
}): Promise<VapiPhoneNumber> {
  return vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body: {
      provider: "twilio",
      number: config.phoneNumber,
      twilioAccountSid: config.twilioAccountSid,
      twilioAuthToken: config.twilioAuthToken,
      name: config.name,
    },
  });
}

// Get a specific phone number by ID
export async function getPhoneNumber(phoneNumberId: string): Promise<VapiPhoneNumber> {
  return vapiRequest<VapiPhoneNumber>({
    method: "GET",
    path: `/phone-number/${phoneNumberId}`,
  });
}

// Get a free Vapi phone number (US only, up to 10 per account)
export async function getFreeVapiNumber(config?: {
  name?: string;
}): Promise<VapiPhoneNumber> {
  const body: Record<string, unknown> = {
    provider: "vapi",
  };

  if (config?.name) {
    body.name = config.name;
  }

  return vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body,
  });
}

// Create a Vapi SIP number (free)
export async function createVapiSipNumber(config?: {
  name?: string;
}): Promise<VapiPhoneNumber> {
  const body: Record<string, unknown> = {
    provider: "vapi",
    sip: true,
  };

  if (config?.name) {
    body.name = config.name;
  }

  return vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body,
  });
}

// Provision a phone number using Vapi's free tier
export async function provisionPhoneNumber(
  config?: PhoneNumberConfig
): Promise<VapiPhoneNumber> {
  try {
    return await getFreeVapiNumber({
      name: config?.name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("limit") || errorMessage.includes("maximum")) {
      throw new Error(
        "You have reached the maximum number of free Vapi phone numbers (10). Please release unused numbers or upgrade your plan."
      );
    }

    if (errorMessage.includes("402") || errorMessage.includes("payment") || errorMessage.includes("credits")) {
      throw new Error(
        "Insufficient Vapi credits. Please check your Vapi account."
      );
    }

    throw new Error(`Failed to provision phone number: ${errorMessage}`);
  }
}

// Delete phone number
export async function releasePhoneNumber(phoneNumberId: string): Promise<void> {
  await vapiRequest({
    method: "DELETE",
    path: `/phone-number/${phoneNumberId}`,
  });
}
