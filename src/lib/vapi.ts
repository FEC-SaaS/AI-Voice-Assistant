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

// Tool definition for Vapi (function tools)
export interface VapiFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
  async?: boolean;
  server?: {
    url: string;
    secret?: string;
  };
}

// Vapi native transfer call tool
export interface VapiTransferTool {
  type: "transferCall";
  destinations: Array<{
    type: "number";
    number: string;
    message?: string;
    description?: string;
  }>;
}

// Union type for all Vapi tools
export type VapiTool = VapiFunctionTool | VapiTransferTool;

// Assistant types
export interface AssistantConfig {
  name: string;
  systemPrompt: string;
  firstMessage?: string;
  voiceProvider?: string;
  voiceId?: string;
  modelProvider?: string;
  model?: string;
  tools?: VapiTool[];
  serverUrl?: string;
  serverUrlSecret?: string;
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
  "Elliot", "Kylie", "Rohan", "Lily", "Savannah", "Hana", "Neha",
  "Harry", "Paige", "Spencer", "Leah", "Tara", "Jess", "Leo", "Dan", "Mia", "Zac", "Zoe"
];

// Deepgram voices supported by Vapi
const DEEPGRAM_VOICES = [
  "asteria", "luna", "stella", "athena", "hera", "orion", "arcas", "perseus",
  "angus", "orpheus", "helios", "zeus", "thalia", "andromeda", "helena", "apollo",
  "aries", "amalthea", "atlas", "aurora", "callista", "cora", "cordelia", "delia",
  "draco", "electra", "harmonia", "hermes", "hyperion", "iris", "janus", "juno",
  "jupiter", "mars", "minerva", "neptune", "odysseus", "ophelia", "pandora",
  "phoebe", "pluto", "saturn", "selene", "theia", "vesta", "celeste", "estrella",
  "nestor", "sirio", "carina", "alvaro", "diana", "aquila", "selena", "javier"
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
    cartesia: "cartesia",
    lmnt: "lmnt",
    "rime-ai": "rime-ai",
  };
  return providerMap[provider.toLowerCase()] || "vapi";
}

// Create assistant
export async function createAssistant(config: AssistantConfig): Promise<VapiAssistant> {
  let voiceProvider = mapVoiceProvider(config.voiceProvider || "vapi");
  let voiceId = config.voiceId || "Elliot";

  // Determine the correct provider based on voice ID
  if (VAPI_VOICES.includes(voiceId)) {
    // Vapi built-in voices
    voiceProvider = "vapi";
  } else if (DEEPGRAM_VOICES.includes(voiceId.toLowerCase())) {
    // Deepgram voices
    voiceProvider = "deepgram";
    voiceId = voiceId.toLowerCase(); // Deepgram uses lowercase
  } else if (voiceProvider === "11labs" || voiceProvider === "elevenlabs") {
    // ElevenLabs - ensure provider is correct
    voiceProvider = "11labs";
  } else if (voiceProvider === "playht") {
    // PlayHT - keep as is
    voiceProvider = "playht";
  }

  console.log("[Vapi] Creating assistant with voice:", { provider: voiceProvider, voiceId });

  const voiceConfig: Record<string, string> = {
    provider: voiceProvider,
    voiceId: voiceId,
  };

  const assistantBody: Record<string, unknown> = {
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
      tools: config.tools,
    },
    voice: voiceConfig,
    firstMessage: config.firstMessage || "Hello, how can I help you today?",
    // Enable live call monitoring and control (for whisper/barge-in features)
    monitorPlan: {
      listenEnabled: true,
      controlEnabled: true,
    },
  };

  // Add server URL for tool/function webhooks
  if (config.serverUrl) {
    assistantBody.serverUrl = config.serverUrl;
    if (config.serverUrlSecret) {
      assistantBody.serverUrlSecret = config.serverUrlSecret;
    }
  }

  return vapiRequest<VapiAssistant>({
    method: "POST",
    path: "/assistant",
    body: assistantBody,
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
    let voiceId = config.voiceId || "Elliot";
    let voiceProvider = mapVoiceProvider(config.voiceProvider || "vapi");

    // Determine the correct provider based on voice ID
    if (VAPI_VOICES.includes(voiceId)) {
      voiceProvider = "vapi";
    } else if (DEEPGRAM_VOICES.includes(voiceId.toLowerCase())) {
      voiceProvider = "deepgram";
      voiceId = voiceId.toLowerCase();
    } else if (voiceProvider === "11labs" || voiceProvider === "elevenlabs") {
      voiceProvider = "11labs";
    }

    body.voice = {
      provider: voiceProvider,
      voiceId: voiceId,
    };
  }

  // Add tools if provided
  if (config.tools) {
    if (body.model) {
      (body.model as Record<string, unknown>).tools = config.tools;
    } else {
      body.model = { tools: config.tools };
    }
  }

  // Add server URL for tool/function webhooks
  if (config.serverUrl !== undefined) {
    body.serverUrl = config.serverUrl;
  }
  if (config.serverUrlSecret !== undefined) {
    body.serverUrlSecret = config.serverUrlSecret;
  }

  // Always ensure monitorPlan is enabled for live call control
  body.monitorPlan = {
    listenEnabled: true,
    controlEnabled: true,
  };

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
  assistantOverrides?: {
    firstMessage?: string;
    firstMessageMode?: "assistant-speaks-first" | "assistant-waits-for-user" | "assistant-speaks-first-with-model-generated-message";
    model?: {
      provider?: string;
      model?: string;
      messages?: Array<{ role: string; content: string }>;
    };
    variableValues?: Record<string, string>;
  };
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
      ...(config.assistantOverrides && {
        assistantOverrides: config.assistantOverrides,
      }),
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

// Get the control URL for a live call, then send a control command
export async function sendCallControl(
  vapiCallId: string,
  command: Record<string, unknown>
): Promise<void> {
  // Fetch call details to get the monitor.controlUrl
  const callDetails = await vapiRequest<{
    id: string;
    monitor?: { controlUrl?: string; listenUrl?: string };
  }>({
    method: "GET",
    path: `/call/${vapiCallId}`,
  });

  const controlUrl = callDetails.monitor?.controlUrl;
  if (!controlUrl) {
    throw new Error(
      "Call does not have a control URL. Ensure the assistant has monitorPlan.controlEnabled set to true."
    );
  }

  // POST the command to the controlUrl
  const response = await fetch(controlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Call control failed: ${response.status} - ${error}`);
  }
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
  number?: string;
  phoneNumber?: string; // Alternative field name
  sipUri?: string; // For SIP numbers
  provider: string;
  name?: string;
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

// Buy a phone number through Vapi (paid plan - uses Vonage/Telnyx)
export async function buyPhoneNumber(config: {
  countryCode: string;
  areaCode?: string;
  name?: string;
}): Promise<VapiPhoneNumber & { number: string }> {
  // For paid Vapi plans, use the byoPhoneNumber endpoint with Vonage
  const body: Record<string, unknown> = {
    provider: "vonage",
    numberDesiredAreaCode: config.areaCode,
    numberDesiredCountry: config.countryCode,
  };

  if (config.name) {
    body.name = config.name;
  }

  console.log("[Vapi] Buying phone number with config:", JSON.stringify(body, null, 2));

  const response = await vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body,
  });

  console.log("[Vapi] Buy phone number response:", JSON.stringify(response, null, 2));

  // Normalize the number field
  const phoneNumber = response.number || response.phoneNumber || "";

  if (!phoneNumber) {
    throw new Error("Voice system did not return a phone number. Please contact support.");
  }

  return {
    ...response,
    number: phoneNumber,
  };
}

// Get a free Vapi phone number (US only, up to 10 per account)
export async function getFreeVapiNumber(config?: {
  name?: string;
}): Promise<VapiPhoneNumber & { number: string }> {
  const body: Record<string, unknown> = {
    provider: "vapi",
  };

  if (config?.name) {
    body.name = config.name;
  }

  const response = await vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body,
  });

  // Log the response for debugging
  console.log("[Vapi] Free phone number response:", JSON.stringify(response, null, 2));

  // Normalize the number field - Vapi might return it in different fields
  const phoneNumber = response.number || response.phoneNumber || response.sipUri || `vapi-${response.id}`;

  return {
    ...response,
    number: phoneNumber,
  };
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
): Promise<VapiPhoneNumber & { number: string }> {
  try {
    return await getFreeVapiNumber({
      name: config?.name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("limit") || errorMessage.includes("maximum")) {
      throw new Error(
        "You have reached the maximum number of free phone numbers (10). Please release unused numbers or upgrade your plan."
      );
    }

    if (errorMessage.includes("402") || errorMessage.includes("payment") || errorMessage.includes("credits")) {
      throw new Error(
        "Insufficient voice system credits. Please contact support."
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

// Update phone number (assign/unassign assistant for both inbound and outbound)
export async function updatePhoneNumber(
  phoneNumberId: string,
  config: {
    assistantId?: string | null;
    name?: string;
    serverUrl?: string;
    serverUrlSecret?: string;
  }
): Promise<VapiPhoneNumber> {
  const body: Record<string, unknown> = {};

  // If assistantId is explicitly set (including null to unassign)
  if (config.assistantId !== undefined) {
    // Set assistant for inbound calls (also acts as fallback if serverUrl fails)
    body.assistantId = config.assistantId;
  }

  // Set serverUrl for dynamic assistant-request on inbound calls
  // This allows us to return per-call overrides (e.g. business hours greeting)
  if (config.serverUrl !== undefined) {
    body.serverUrl = config.serverUrl;
  }
  if (config.serverUrlSecret !== undefined) {
    body.serverUrlSecret = config.serverUrlSecret;
  }

  if (config.name) {
    body.name = config.name;
  }

  console.log(`[Vapi] Updating phone number ${phoneNumberId}:`, JSON.stringify(body, null, 2));

  return vapiRequest<VapiPhoneNumber>({
    method: "PATCH",
    path: `/phone-number/${phoneNumberId}`,
    body,
  });
}
