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
  return providerMap[provider.toLowerCase()] || provider;
}

// Create assistant
export async function createAssistant(config: AssistantConfig): Promise<VapiAssistant> {
  const voiceProvider = mapVoiceProvider(config.voiceProvider || "vapi");

  // Build voice config based on provider
  const voiceConfig: Record<string, string> = {
    provider: voiceProvider,
  };

  // Different providers use different voice ID field names
  if (voiceProvider === "11labs") {
    voiceConfig.voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel
  } else if (voiceProvider === "vapi") {
    voiceConfig.voiceId = config.voiceId || "Elliot";
  } else {
    voiceConfig.voiceId = config.voiceId || "alloy";
  }

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
    const voiceProvider = mapVoiceProvider(config.voiceProvider || "vapi");
    body.voice = {
      provider: voiceProvider,
      voiceId: config.voiceId || (voiceProvider === "vapi" ? "Elliot" : "21m00Tcm4TlvDq8ikWAM"),
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
  // For Vapi-managed numbers (if available on your plan)
  areaCode?: string;
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

// Buy a phone number through Vapi (requires Vapi Pro/Enterprise)
export async function buyVapiPhoneNumber(config: {
  areaCode?: string;
  country?: string;
}): Promise<VapiPhoneNumber> {
  return vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number/buy",
    body: {
      areaCode: config.areaCode,
      country: config.country || "US",
    },
  });
}

// Legacy function - now tries the buy endpoint
export async function provisionPhoneNumber(
  config: PhoneNumberConfig
): Promise<VapiPhoneNumber> {
  // Try the new buy endpoint first
  try {
    return await buyVapiPhoneNumber({
      areaCode: config.areaCode,
      country: "US",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If buy endpoint fails, provide helpful error
    if (errorMessage.includes("402") || errorMessage.includes("payment")) {
      throw new Error(
        "Phone number purchase requires Vapi Pro plan or credits. " +
        "Alternatively, you can import your own Twilio number."
      );
    }

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      throw new Error(
        "Vapi phone number purchasing is not available on your plan. " +
        "Please import a Twilio phone number instead."
      );
    }

    throw error;
  }
}

// Delete phone number
export async function releasePhoneNumber(phoneNumberId: string): Promise<void> {
  await vapiRequest({
    method: "DELETE",
    path: `/phone-number/${phoneNumberId}`,
  });
}
