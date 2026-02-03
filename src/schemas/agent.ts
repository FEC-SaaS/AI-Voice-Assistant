import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  firstMessage: z.string().optional(),
  voiceProvider: z.string().default("elevenlabs"),
  voiceId: z.string().default("rachel"),
  language: z.string().default("en-US"),
  modelProvider: z.string().default("openai"),
  model: z.string().default("gpt-4-turbo"),
  enableAppointments: z.boolean().default(false),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
