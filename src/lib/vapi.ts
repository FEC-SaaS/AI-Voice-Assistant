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

// Create assistant
export async function createAssistant(config: AssistantConfig): Promise<VapiAssistant> {
  return vapiRequest<VapiAssistant>({
    method: "POST",
    path: "/assistant",
    body: {
      name: config.name,
      model: {
        provider: config.modelProvider || "openai",
        model: config.model || "gpt-4-turbo",
        systemPrompt: config.systemPrompt,
      },
      voice: {
        provider: config.voiceProvider || "elevenlabs",
        voiceId: config.voiceId || "rachel",
      },
      firstMessage: config.firstMessage,
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
      ...(config.modelProvider && { provider: config.modelProvider }),
      ...(config.model && { model: config.model }),
      ...(config.systemPrompt && { systemPrompt: config.systemPrompt }),
    };
  }

  if (config.voiceProvider || config.voiceId) {
    body.voice = {
      ...(config.voiceProvider && { provider: config.voiceProvider }),
      ...(config.voiceId && { voiceId: config.voiceId }),
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
  areaCode?: string;
  type?: "local" | "toll_free";
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  type: string;
}

// Provision phone number
export async function provisionPhoneNumber(
  config: PhoneNumberConfig
): Promise<VapiPhoneNumber> {
  return vapiRequest<VapiPhoneNumber>({
    method: "POST",
    path: "/phone-number",
    body: {
      provider: "twilio",
      areaCode: config.areaCode,
      type: config.type || "local",
    },
  });
}

// Delete phone number
export async function releasePhoneNumber(phoneNumberId: string): Promise<void> {
  await vapiRequest({
    method: "DELETE",
    path: `/phone-number/${phoneNumberId}`,
  });
}
