import { z } from "zod";

export const callFiltersSchema = z.object({
  agentId: z.string().optional(),
  campaignId: z.string().optional(),
  status: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const testCallSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
});

export type CallFilters = z.infer<typeof callFiltersSchema>;
export type TestCallInput = z.infer<typeof testCallSchema>;
