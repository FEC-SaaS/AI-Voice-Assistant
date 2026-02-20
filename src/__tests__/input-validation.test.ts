/**
 * Module 18: INPUT VALIDATION & SECURITY Tests
 *
 * Covers:
 *  - Agent schema validation (src/schemas/agent.ts)
 *  - Call schema validation (src/schemas/call.ts)
 *  - Phone number schema validation (src/schemas/phone-number.ts)
 *  - API key security functions (src/lib/api-keys.ts)
 *  - Rate limiting (src/lib/api-middleware.ts)
 */

import { describe, it, expect, vi } from "vitest";

// ── Mock DB so Prisma client doesn't need to be generated in test env ─────────
vi.mock("@/lib/db", () => ({ db: {} }));

// ── Schemas ──────────────────────────────────────────────────────────────────
import {
  createAgentSchema,
  updateAgentSchema,
  receptionistConfigSchema,
  customTransferNumberSchema,
  fallbackConfigSchema,
} from "@/schemas/agent";
import { testCallSchema, callFiltersSchema } from "@/schemas/call";
import {
  provisionPhoneNumberSchema,
  assignPhoneNumberSchema,
} from "@/schemas/phone-number";

// ── API Key pure functions (no DB calls) ──────────────────────────────────────
import { generateApiKey, hashApiKey, getKeyPrefix } from "@/lib/api-keys";

// ── Rate limiting (in-memory, no external deps) ───────────────────────────────
import { checkRateLimit, apiError, apiSuccess } from "@/lib/api-middleware";

// ─────────────────────────────────────────────────────────────────────────────

const validAgentBase = {
  name: "Customer Support Bot",
  systemPrompt: "You are a helpful AI assistant for customer service calls.",
};

describe("18. INPUT VALIDATION & SECURITY", () => {
  // ── Agent Schema ────────────────────────────────────────────────────────────
  describe("Agent Schema — createAgentSchema", () => {
    it("accepts a minimal valid agent (name + systemPrompt only)", () => {
      const result = createAgentSchema.safeParse(validAgentBase);
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "",
      });
      expect(result.success).toBe(false);
      const messages = result.error?.errors.map((e) => e.message) ?? [];
      expect(messages.some((m) => m.toLowerCase().includes("required"))).toBe(true);
    });

    it("rejects name longer than 100 characters", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("accepts name at exactly 100 characters", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "A".repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it("rejects systemPrompt shorter than 10 characters", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        systemPrompt: "Too short",
      });
      expect(result.success).toBe(false);
      const messages = result.error?.errors.map((e) => e.message) ?? [];
      expect(
        messages.some((m) => m.includes("at least 10 characters"))
      ).toBe(true);
    });

    it("accepts systemPrompt at exactly 10 characters", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        systemPrompt: "1234567890",
      });
      expect(result.success).toBe(true);
    });

    it("rejects voiceSpeed below 0.5", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        voiceSpeed: 0.4,
      });
      expect(result.success).toBe(false);
    });

    it("rejects voiceSpeed above 2.0", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        voiceSpeed: 2.1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts voiceSpeed at lower boundary (0.5)", () => {
      expect(
        createAgentSchema.safeParse({ ...validAgentBase, voiceSpeed: 0.5 }).success
      ).toBe(true);
    });

    it("accepts voiceSpeed at upper boundary (2.0)", () => {
      expect(
        createAgentSchema.safeParse({ ...validAgentBase, voiceSpeed: 2.0 }).success
      ).toBe(true);
    });

    it("rejects invalid interruptionSensitivity value", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        interruptionSensitivity: "extreme",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid interruptionSensitivity values", () => {
      for (const val of ["low", "medium", "high"] as const) {
        expect(
          createAgentSchema.safeParse({
            ...validAgentBase,
            interruptionSensitivity: val,
          }).success
        ).toBe(true);
      }
    });

    it("applies correct defaults", () => {
      const result = createAgentSchema.safeParse(validAgentBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.voiceProvider).toBe("vapi");
        expect(result.data.voiceId).toBe("Elliot");
        expect(result.data.language).toBe("en-US");
        expect(result.data.modelProvider).toBe("openai");
        expect(result.data.model).toBe("gpt-4o");
        expect(result.data.enableAppointments).toBe(false);
        expect(result.data.enableReceptionist).toBe(false);
      }
    });

    it("accepts optional description field", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        description: "Handles tier-1 support queries",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid agent with all optional fields", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        description: "Full agent",
        voiceProvider: "elevenlabs",
        voiceId: "custom-voice-id",
        language: "es-ES",
        modelProvider: "openai",
        model: "gpt-4o-mini",
        enableAppointments: true,
        enableReceptionist: true,
        voiceSpeed: 1.2,
        fillerWordSuppression: true,
        backgroundNoiseCancellation: false,
        interruptionSensitivity: "medium",
        customTransferNumbers: [{ label: "Sales", number: "+15551234567" }],
        fallbackConfig: { action: "hang_up" },
      });
      expect(result.success).toBe(true);
    });
  });

  // ── updateAgentSchema ────────────────────────────────────────────────────────
  describe("Agent Schema — updateAgentSchema (partial)", () => {
    it("accepts empty object (all fields optional)", () => {
      expect(updateAgentSchema.safeParse({}).success).toBe(true);
    });

    it("accepts partial update with just name", () => {
      expect(
        updateAgentSchema.safeParse({ name: "Renamed Agent" }).success
      ).toBe(true);
    });

    it("still rejects invalid voiceSpeed on partial update", () => {
      expect(
        updateAgentSchema.safeParse({ voiceSpeed: 0.1 }).success
      ).toBe(false);
    });
  });

  // ── Receptionist Config ──────────────────────────────────────────────────────
  describe("Receptionist Config Schema", () => {
    it("accepts valid receptionist config", () => {
      const result = receptionistConfigSchema.safeParse({
        duringHoursGreeting: "Welcome! How can I help?",
        afterHoursGreeting: "We are currently closed.",
        afterHoursAction: "take_message",
        enableCallScreening: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object and uses defaults", () => {
      const result = receptionistConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.afterHoursAction).toBe("take_message");
        expect(result.data.enableCallScreening).toBe(false);
      }
    });

    it("rejects invalid afterHoursAction", () => {
      expect(
        receptionistConfigSchema.safeParse({ afterHoursAction: "call_911" }).success
      ).toBe(false);
    });

    it("accepts all valid afterHoursAction values", () => {
      for (const action of ["take_message", "info_only"] as const) {
        expect(
          receptionistConfigSchema.safeParse({ afterHoursAction: action }).success
        ).toBe(true);
      }
    });
  });

  // ── Custom Transfer Number ───────────────────────────────────────────────────
  describe("Custom Transfer Number Schema", () => {
    it("accepts valid transfer number entry", () => {
      expect(
        customTransferNumberSchema.safeParse({
          label: "Sales",
          number: "+15551234567",
        }).success
      ).toBe(true);
    });

    it("rejects empty label", () => {
      expect(
        customTransferNumberSchema.safeParse({
          label: "",
          number: "+15551234567",
        }).success
      ).toBe(false);
    });

    it("rejects number shorter than 10 characters", () => {
      expect(
        customTransferNumberSchema.safeParse({
          label: "Sales",
          number: "555-123",
        }).success
      ).toBe(false);
    });

    it("accepts number at exactly 10 characters", () => {
      expect(
        customTransferNumberSchema.safeParse({
          label: "Sales",
          number: "5551234567",
        }).success
      ).toBe(true);
    });
  });

  // ── Fallback Config ──────────────────────────────────────────────────────────
  describe("Fallback Config Schema", () => {
    it("accepts hang_up action", () => {
      expect(
        fallbackConfigSchema.safeParse({ action: "hang_up" }).success
      ).toBe(true);
    });

    it("accepts transfer action with number", () => {
      expect(
        fallbackConfigSchema.safeParse({
          action: "transfer",
          transferNumber: "+15551234567",
        }).success
      ).toBe(true);
    });

    it("rejects invalid action", () => {
      expect(
        fallbackConfigSchema.safeParse({ action: "voicemail" }).success
      ).toBe(false);
    });

    it("defaults action to hang_up when not provided", () => {
      const result = fallbackConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("hang_up");
      }
    });

    it("accepts optional message field", () => {
      expect(
        fallbackConfigSchema.safeParse({
          action: "hang_up",
          message: "Goodbye!",
        }).success
      ).toBe(true);
    });
  });

  // ── Call Schemas ─────────────────────────────────────────────────────────────
  describe("Call Schema — testCallSchema", () => {
    it("accepts a valid E.164-formatted phone number", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "agent-abc123",
          phoneNumber: "+15551234567",
        }).success
      ).toBe(true);
    });

    it("rejects empty agentId", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "",
          phoneNumber: "+15551234567",
        }).success
      ).toBe(false);
    });

    it("rejects phone number shorter than 10 digits", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "agent-abc123",
          phoneNumber: "55512",
        }).success
      ).toBe(false);
    });

    it("rejects phone number with invalid format (letters)", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "agent-abc123",
          phoneNumber: "not-a-phone!",
        }).success
      ).toBe(false);
    });

    it("rejects phone number starting with 0 (invalid E.164)", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "agent-abc123",
          phoneNumber: "01234567890",
        }).success
      ).toBe(false);
    });

    it("accepts phone without + prefix (plain digits)", () => {
      expect(
        testCallSchema.safeParse({
          agentId: "agent-abc123",
          phoneNumber: "15551234567",
        }).success
      ).toBe(true);
    });
  });

  describe("Call Schema — callFiltersSchema", () => {
    it("accepts valid direction filter", () => {
      expect(
        callFiltersSchema.safeParse({ direction: "outbound" }).success
      ).toBe(true);
    });

    it("rejects invalid direction value", () => {
      expect(
        callFiltersSchema.safeParse({ direction: "sideways" }).success
      ).toBe(false);
    });

    it("rejects limit above 100", () => {
      expect(callFiltersSchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it("rejects limit below 1", () => {
      expect(callFiltersSchema.safeParse({ limit: 0 }).success).toBe(false);
    });

    it("defaults limit to 50", () => {
      const result = callFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("accepts both valid direction values", () => {
      for (const dir of ["inbound", "outbound"] as const) {
        expect(callFiltersSchema.safeParse({ direction: dir }).success).toBe(true);
      }
    });
  });

  // ── Phone Number Schemas ─────────────────────────────────────────────────────
  describe("Phone Number Schema", () => {
    it("accepts a full provision request", () => {
      expect(
        provisionPhoneNumberSchema.safeParse({
          areaCode: "415",
          type: "local",
          friendlyName: "Main Line",
        }).success
      ).toBe(true);
    });

    it("defaults type to local", () => {
      const result = provisionPhoneNumberSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("local");
      }
    });

    it("accepts toll_free type", () => {
      expect(
        provisionPhoneNumberSchema.safeParse({ type: "toll_free" }).success
      ).toBe(true);
    });

    it("rejects invalid phone number type", () => {
      expect(
        provisionPhoneNumberSchema.safeParse({ type: "mobile" }).success
      ).toBe(false);
    });

    it("accepts assign schema with null agentId (unassign)", () => {
      expect(
        assignPhoneNumberSchema.safeParse({ id: "pn-123", agentId: null }).success
      ).toBe(true);
    });

    it("accepts assign schema with a valid agentId", () => {
      expect(
        assignPhoneNumberSchema.safeParse({ id: "pn-123", agentId: "agent-abc" }).success
      ).toBe(true);
    });
  });

  // ── API Key Security Functions ────────────────────────────────────────────────
  describe("API Key Security — generateApiKey", () => {
    it("generates a key with vxf_ prefix", () => {
      expect(generateApiKey()).toMatch(/^vxf_/);
    });

    it("generates unique keys on successive calls", () => {
      const keys = new Set(Array.from({ length: 20 }, generateApiKey));
      expect(keys.size).toBe(20);
    });

    it("all generated keys have consistent length", () => {
      const lengths = Array.from({ length: 5 }, () => generateApiKey().length);
      expect(new Set(lengths).size).toBe(1);
    });

    it("key has sufficient length (≥ 20 chars) for entropy", () => {
      expect(generateApiKey().length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("API Key Security — hashApiKey", () => {
    it("produces the same hash for the same key (deterministic)", () => {
      const key = "vxf_test_key_abc123";
      expect(hashApiKey(key)).toBe(hashApiKey(key));
    });

    it("produces a 64-character hex string (SHA-256)", () => {
      expect(hashApiKey("vxf_any_key")).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different keys", () => {
      expect(hashApiKey("vxf_key_one")).not.toBe(hashApiKey("vxf_key_two"));
    });

    it("is case-sensitive (different input → different hash)", () => {
      expect(hashApiKey("vxf_ABC")).not.toBe(hashApiKey("vxf_abc"));
    });
  });

  describe("API Key Security — getKeyPrefix", () => {
    it("returns first 12 chars followed by '...'", () => {
      const key = "vxf_abcdefghijklmnopqrstuvwxyz";
      expect(getKeyPrefix(key)).toBe("vxf_abcdefgh...");
    });

    it("result length is always 15 (12 + 3 for '...')", () => {
      const key = generateApiKey();
      expect(getKeyPrefix(key).length).toBe(15);
    });

    it("never exposes more than 12 characters of the real key", () => {
      const key = "vxf_supersecretvalue999";
      const prefix = getKeyPrefix(key);
      expect(prefix.replace("...", "").length).toBe(12);
    });
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────────────
  describe("Rate Limiting — checkRateLimit", () => {
    // Use unique IDs per test to avoid cross-test contamination from module state
    it("allows the first request within limit", () => {
      const id = `rl-first-${Date.now()}-${Math.random()}`;
      const result = checkRateLimit(id, 5, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("decrements remaining count on each request", () => {
      const id = `rl-decrement-${Date.now()}-${Math.random()}`;
      checkRateLimit(id, 10, 60_000);
      checkRateLimit(id, 10, 60_000);
      const result = checkRateLimit(id, 10, 60_000);
      expect(result.remaining).toBe(7);
    });

    it("blocks request when limit is reached", () => {
      const id = `rl-block-${Date.now()}-${Math.random()}`;
      for (let i = 0; i < 3; i++) checkRateLimit(id, 3, 60_000);
      const result = checkRateLimit(id, 3, 60_000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("different identifiers do not share quota", () => {
      const id1 = `rl-sep1-${Date.now()}-${Math.random()}`;
      const id2 = `rl-sep2-${Date.now()}-${Math.random()}`;
      for (let i = 0; i < 5; i++) checkRateLimit(id1, 5, 60_000);
      const result = checkRateLimit(id2, 5, 60_000);
      expect(result.allowed).toBe(true);
    });

    it("returns a resetAt timestamp in the future", () => {
      const id = `rl-reset-${Date.now()}-${Math.random()}`;
      const before = Date.now();
      const result = checkRateLimit(id, 10, 60_000);
      expect(result.resetAt).toBeGreaterThan(before);
    });

    it("uses default limit of 100 and window of 60s", () => {
      const id = `rl-default-${Date.now()}-${Math.random()}`;
      const result = checkRateLimit(id);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("allows requests again after window expires", async () => {
      const id = `rl-window-${Date.now()}-${Math.random()}`;
      // Use a 10ms window to test expiry quickly
      for (let i = 0; i < 2; i++) checkRateLimit(id, 2, 10);
      const blocked = checkRateLimit(id, 2, 10);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 20));
      const afterExpiry = checkRateLimit(id, 2, 10);
      expect(afterExpiry.allowed).toBe(true);
    });
  });

  // ── API Response Helpers ──────────────────────────────────────────────────────
  describe("API Response Helpers", () => {
    it("apiError returns JSON response with given status", async () => {
      const response = apiError("Not found", 404);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "Not found" });
    });

    it("apiError defaults to status 400", async () => {
      const response = apiError("Bad request");
      expect(response.status).toBe(400);
    });

    it("apiSuccess returns JSON response with data and status 200", async () => {
      const response = apiSuccess({ id: "123", name: "Test" });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ id: "123", name: "Test" });
    });

    it("apiSuccess accepts custom status code", async () => {
      const response = apiSuccess({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });
});
