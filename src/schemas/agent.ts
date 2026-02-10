import { z } from "zod";

export const receptionistConfigSchema = z.object({
  duringHoursGreeting: z.string().optional(),
  afterHoursGreeting: z.string().optional(),
  afterHoursAction: z.enum(["take_message", "info_only"]).default("take_message"),
  enableCallScreening: z.boolean().default(false),
});

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  firstMessage: z.string().optional(),
  voiceProvider: z.string().default("vapi"),
  voiceId: z.string().default("Elliot"),
  language: z.string().default("en-US"),
  modelProvider: z.string().default("openai"),
  model: z.string().default("gpt-4o"),
  enableAppointments: z.boolean().default(false),
  enableReceptionist: z.boolean().default(false),
  receptionistConfig: receptionistConfigSchema.optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type ReceptionistConfig = z.infer<typeof receptionistConfigSchema>;
