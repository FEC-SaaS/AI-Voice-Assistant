import { z } from "zod";

export const provisionPhoneNumberSchema = z.object({
  areaCode: z.string().optional(),
  type: z.enum(["local", "toll_free"]).default("local"),
  friendlyName: z.string().optional(),
});

export const assignPhoneNumberSchema = z.object({
  id: z.string(),
  agentId: z.string().nullable(),
});

export type ProvisionPhoneNumberInput = z.infer<typeof provisionPhoneNumberSchema>;
export type AssignPhoneNumberInput = z.infer<typeof assignPhoneNumberSchema>;
