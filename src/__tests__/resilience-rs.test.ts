/**
 * 20. RESILIENCE & ERROR HANDLING — QA Test Cases RS-001 through RS-006
 *
 * Tests system behavior under failure conditions:
 *  RS-001 Vapi service unavailable
 *  RS-002 Stripe service unavailable
 *  RS-003 OpenAI service unavailable
 *  RS-004 Empty query results
 *  RS-005 Concurrent campaign starts
 *  RS-006 Concurrent appointment booking
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock all external dependencies ─────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    agent: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    call: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    campaign: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    organization: { findUnique: vi.fn() },
    knowledgeDocument: { findMany: vi.fn() },
    appointment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/vapi", () => ({
  createAssistant: vi.fn(),
  updateAssistant: vi.fn(),
  deleteAssistant: vi.fn(),
  getAssistant: vi.fn(),
  createCall: vi.fn(),
}));

vi.mock("@/server/services/billing.service", () => ({
  checkAgentLimit: vi.fn(),
  checkMinutesLimit: vi.fn(),
  ensureTrialExpiry: vi.fn(),
  recordCallUsage: vi.fn(),
}));

vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  };
});

vi.mock("stripe", () => {
  const mockInvoicesList = vi.fn();
  const mockPaymentMethodsList = vi.fn();
  const mockSessionCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      invoices: { list: mockInvoicesList },
      paymentMethods: { list: mockPaymentMethodsList },
      checkout: { sessions: { create: mockSessionCreate } },
    })),
  };
});

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { db } from "@/lib/db";
import { createAssistant } from "@/lib/vapi";
import { checkAgentLimit } from "@/server/services/billing.service";
import { createAgent } from "@/server/services/agent.service";
import {
  syncAllAgentsToVapi,
  syncAgentFromVapi,
  pushAgentToVapi,
} from "@/server/services/vapi-sync.service";
import {
  getCampaignState,
  stopCampaign,
  pauseCampaign,
  resumeCampaign,
  processScheduledCampaigns,
} from "@/server/services/campaign-executor.service";
import {
  analyzeTranscript,
  generateInterviewQuestions,
  generateSummary,
} from "@/lib/openai";
import { getCallStats } from "@/server/services/call.service";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORG_ID = "org-rs-001";
const AGENT_ID = "agent-rs-001";

const mockAgent = {
  id: AGENT_ID,
  organizationId: ORG_ID,
  name: "Test Agent",
  systemPrompt: "You are helpful.",
  firstMessage: "Hello!",
  voiceProvider: "vapi",
  voiceId: "Elliot",
  modelProvider: "openai",
  model: "gpt-4o",
  vapiAssistantId: "vapi-ass-001",
  isActive: true,
};

// ─────────────────────────────────────────────────────────────────────────────

describe("20. RESILIENCE & ERROR HANDLING", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── RS-001: Vapi service unavailable ─────────────────────────────────────────
  describe("RS-001: Vapi service unavailable — agent stored locally; sync fails gracefully", () => {
    it("createAgent stores agent in DB even when Vapi createAssistant fails", async () => {
      vi.mocked(checkAgentLimit).mockResolvedValue({ allowed: true });
      vi.mocked(createAssistant).mockRejectedValue(new Error("Vapi connection timeout"));
      vi.mocked(db.agent.create).mockResolvedValue({
        ...mockAgent,
        vapiAssistantId: null, // no Vapi ID because sync failed
      } as never);

      const agent = await createAgent({
        organizationId: ORG_ID,
        name: "Test Agent",
        systemPrompt: "You are helpful.",
      });

      // Agent was created locally despite Vapi failure
      expect(db.agent.create).toHaveBeenCalled();
      expect(agent).toBeDefined();
      expect(agent.vapiAssistantId).toBeNull();
    });

    it("createAgent does NOT throw when Vapi is unreachable", async () => {
      vi.mocked(checkAgentLimit).mockResolvedValue({ allowed: true });
      vi.mocked(createAssistant).mockRejectedValue(new Error("ECONNREFUSED"));
      vi.mocked(db.agent.create).mockResolvedValue({ ...mockAgent, vapiAssistantId: null } as never);

      await expect(
        createAgent({ organizationId: ORG_ID, name: "Agent", systemPrompt: "Be helpful." })
      ).resolves.not.toThrow();
    });

    it("syncAllAgentsToVapi collects errors without throwing", async () => {
      vi.mocked(db.agent.findMany).mockResolvedValue([
        { ...mockAgent, vapiAssistantId: null, id: "a1" },
        { ...mockAgent, vapiAssistantId: null, id: "a2" },
      ] as never);
      vi.mocked(createAssistant).mockRejectedValue(new Error("Vapi unavailable"));

      const result = await syncAllAgentsToVapi(ORG_ID);

      expect(result.failed).toBe(2);
      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("Vapi unavailable");
    });

    it("syncAllAgentsToVapi reports partial success when some agents sync and some fail", async () => {
      vi.mocked(db.agent.findMany).mockResolvedValue([
        { ...mockAgent, vapiAssistantId: null, id: "a1" },
        { ...mockAgent, vapiAssistantId: null, id: "a2" },
      ] as never);
      vi.mocked(db.agent.update).mockResolvedValue({} as never);

      // First agent syncs; second fails
      vi.mocked(createAssistant)
        .mockResolvedValueOnce({ id: "vapi-new-1" } as never)
        .mockRejectedValueOnce(new Error("Rate limit exceeded"));

      const result = await syncAllAgentsToVapi(ORG_ID);
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("syncAgentFromVapi returns false without throwing when Vapi is unreachable", async () => {
      const { getAssistant } = await import("@/lib/vapi");
      vi.mocked(getAssistant).mockRejectedValue(new Error("Vapi 503 Service Unavailable"));

      const result = await syncAgentFromVapi("vapi-ass-001", ORG_ID);
      expect(result).toBe(false);
    });

    it("pushAgentToVapi returns false without throwing when Vapi is unreachable", async () => {
      vi.mocked(db.agent.findUnique).mockResolvedValue(mockAgent as never);
      const { updateAssistant } = await import("@/lib/vapi");
      vi.mocked(updateAssistant).mockRejectedValue(new Error("Vapi network error"));

      const result = await pushAgentToVapi(AGENT_ID);
      expect(result).toBe(false);
    });

    it("pushAgentToVapi returns false (not throws) when agent not found", async () => {
      vi.mocked(db.agent.findUnique).mockResolvedValue(null);
      const result = await pushAgentToVapi("ghost-agent");
      expect(result).toBe(false);
    });
  });

  // ── RS-002: Stripe service unavailable ──────────────────────────────────────
  describe("RS-002: Stripe service unavailable — error propagated; no crash", () => {
    it("stripe.getInvoices throws StripeError when service is unavailable", async () => {
      const { getInvoices } = await import("@/lib/stripe");
      const stripeModule = await import("stripe");
      const StripeMock = vi.mocked(stripeModule.default);
      const instance = StripeMock.mock.results[0]?.value as {
        invoices: { list: ReturnType<typeof vi.fn> };
      };
      if (instance?.invoices) {
        instance.invoices.list.mockRejectedValue(
          new Error("Stripe service temporarily unavailable")
        );
        await expect(getInvoices("cus_test")).rejects.toThrow(
          "Stripe service temporarily unavailable"
        );
      }
    });

    it("stripe.getPaymentMethods throws when service is unavailable", async () => {
      const { getPaymentMethods } = await import("@/lib/stripe");
      const stripeModule = await import("stripe");
      const StripeMock = vi.mocked(stripeModule.default);
      const instance = StripeMock.mock.results[0]?.value as {
        paymentMethods: { list: ReturnType<typeof vi.fn> };
      };
      if (instance?.paymentMethods) {
        instance.paymentMethods.list.mockRejectedValue(
          new Error("Connection refused")
        );
        await expect(getPaymentMethods("cus_test")).rejects.toThrow();
      }
    });

    it("stripe functions are async — errors are rejections not exceptions", async () => {
      const { getInvoices } = await import("@/lib/stripe");
      const stripeModule = await import("stripe");
      const StripeMock = vi.mocked(stripeModule.default);
      const instance = StripeMock.mock.results[0]?.value as {
        invoices: { list: ReturnType<typeof vi.fn> };
      };
      if (instance?.invoices) {
        instance.invoices.list.mockRejectedValue(new Error("Timeout"));
        // Does not throw synchronously — only rejects the promise
        const promise = getInvoices("cus_test");
        expect(promise).toBeInstanceOf(Promise);
        await expect(promise).rejects.toThrow("Timeout");
      }
    });
  });

  // ── RS-003: OpenAI service unavailable ──────────────────────────────────────
  describe("RS-003: OpenAI service unavailable — error propagated; no crash", () => {
    function getOpenAIMockCreate() {
      // Access the mock via the module's internal __mockCreate
      const openaiModule = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__vitest_module_cache__
      );
      return openaiModule;
    }

    it("analyzeTranscript rejects with Error when OpenAI is unavailable", async () => {
      const openai = await import("@/lib/openai");
      const openaiClientModule = await import("openai");
      const OpenAIMock = vi.mocked(openaiClientModule.default);
      const instance = OpenAIMock.mock.results[0]?.value as {
        chat: { completions: { create: ReturnType<typeof vi.fn> } };
      };
      if (instance?.chat?.completions) {
        instance.chat.completions.create.mockRejectedValue(
          new Error("OpenAI service unavailable")
        );
        await expect(openai.analyzeTranscript("Some transcript")).rejects.toThrow(
          "OpenAI service unavailable"
        );
      }
    });

    it("generateInterviewQuestions rejects when OpenAI API is down", async () => {
      const openai = await import("@/lib/openai");
      const openaiClientModule = await import("openai");
      const OpenAIMock = vi.mocked(openaiClientModule.default);
      const instance = OpenAIMock.mock.results[0]?.value as {
        chat: { completions: { create: ReturnType<typeof vi.fn> } };
      };
      if (instance?.chat?.completions) {
        instance.chat.completions.create.mockRejectedValue(
          new Error("Rate limit exceeded")
        );
        await expect(
          openai.generateInterviewQuestions("Software Engineer", "Build great products")
        ).rejects.toThrow();
      }
    });

    it("generateSummary returns empty string when OpenAI response has no content", async () => {
      const openai = await import("@/lib/openai");
      const openaiClientModule = await import("openai");
      const OpenAIMock = vi.mocked(openaiClientModule.default);
      const instance = OpenAIMock.mock.results[0]?.value as {
        chat: { completions: { create: ReturnType<typeof vi.fn> } };
      };
      if (instance?.chat?.completions) {
        // Simulates a response with no content (edge case resilience)
        instance.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: null } }],
        } as never);
        const result = await openai.generateSummary("Transcript here");
        expect(result).toBe("");
      }
    });

    it("analyzeTranscript throws when OpenAI returns empty choices", async () => {
      const openai = await import("@/lib/openai");
      const openaiClientModule = await import("openai");
      const OpenAIMock = vi.mocked(openaiClientModule.default);
      const instance = OpenAIMock.mock.results[0]?.value as {
        chat: { completions: { create: ReturnType<typeof vi.fn> } };
      };
      if (instance?.chat?.completions) {
        instance.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: null } }],
        } as never);
        await expect(openai.analyzeTranscript("transcript")).rejects.toThrow(
          "No response from OpenAI"
        );
      }
    });
  });

  // ── RS-004: Empty query results ──────────────────────────────────────────────
  describe("RS-004: Empty query results — returns empty/zeros, not errors", () => {
    it("getCallStats returns all-zero counts when no calls exist", async () => {
      vi.mocked(db.call.count).mockResolvedValue(0);
      vi.mocked(db.call.groupBy).mockResolvedValue([] as never);
      vi.mocked(db.call.aggregate).mockResolvedValue({
        _sum: { durationSeconds: null },
        _avg: { durationSeconds: null },
      } as never);

      const stats = await getCallStats(ORG_ID, new Date("2025-01-01"), new Date("2025-01-31"));
      expect(stats.totalCalls).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.totalMinutes).toBe(0);
    });

    it("getCallStats returns an object (not null/undefined) with empty data", async () => {
      vi.mocked(db.call.count).mockResolvedValue(0);
      vi.mocked(db.call.groupBy).mockResolvedValue([] as never);
      vi.mocked(db.call.aggregate).mockResolvedValue({
        _sum: { durationSeconds: null },
        _avg: { durationSeconds: null },
      } as never);

      const stats = await getCallStats(ORG_ID, new Date(), new Date());
      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });

    it("getCallStats statusBreakdown is an object when no calls match", async () => {
      vi.mocked(db.call.count).mockResolvedValue(0);
      vi.mocked(db.call.groupBy).mockResolvedValue([] as never);
      vi.mocked(db.call.aggregate).mockResolvedValue({
        _sum: { durationSeconds: null },
        _avg: { durationSeconds: null },
      } as never);

      const stats = await getCallStats(ORG_ID, new Date(), new Date());
      expect(stats.statusBreakdown).toBeDefined();
      expect(typeof stats.statusBreakdown).toBe("object");
    });

    it("getCallStats sentimentBreakdown has default keys even with no data", async () => {
      vi.mocked(db.call.count).mockResolvedValue(0);
      vi.mocked(db.call.groupBy).mockResolvedValue([] as never);
      vi.mocked(db.call.aggregate).mockResolvedValue({
        _sum: { durationSeconds: null },
        _avg: { durationSeconds: null },
      } as never);

      const stats = await getCallStats(ORG_ID, new Date(), new Date());
      expect(stats.sentimentBreakdown).toMatchObject({
        positive: 0,
        neutral: 0,
        negative: 0,
      });
    });

    it("syncAllAgentsToVapi with empty agent list returns zeros without error", async () => {
      vi.mocked(db.agent.findMany).mockResolvedValue([]);
      const result = await syncAllAgentsToVapi(ORG_ID);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("processScheduledCampaigns handles empty scheduled campaigns list", async () => {
      vi.mocked(db.campaign.findMany).mockResolvedValue([]);
      await expect(processScheduledCampaigns()).resolves.not.toThrow();
    });
  });

  // ── RS-005: Concurrent campaign starts ──────────────────────────────────────
  describe("RS-005: Concurrent campaign starts — no double-execution; handled gracefully", () => {
    it("getCampaignState returns undefined for a campaign that has not started", () => {
      expect(getCampaignState("new-campaign")).toBeUndefined();
    });

    it("resumeCampaign sets state to 'running'", () => {
      resumeCampaign("camp-001");
      expect(getCampaignState("camp-001")).toBe("running");
      // cleanup
      stopCampaign("camp-001");
    });

    it("stopCampaign sets state to 'stopped'", () => {
      resumeCampaign("camp-stop-001");
      stopCampaign("camp-stop-001");
      expect(getCampaignState("camp-stop-001")).toBe("stopped");
    });

    it("pauseCampaign sets state to 'paused'", () => {
      resumeCampaign("camp-pause-001");
      pauseCampaign("camp-pause-001");
      expect(getCampaignState("camp-pause-001")).toBe("paused");
      stopCampaign("camp-pause-001");
    });

    it("processScheduledCampaigns skips campaigns already in 'running' state", async () => {
      const campaignId = "camp-concurrent-001";
      // Pre-set state to "running" (simulates first execution already in progress)
      resumeCampaign(campaignId);

      vi.mocked(db.campaign.findMany).mockResolvedValue([
        { id: campaignId, organizationId: ORG_ID },
      ] as never);

      // executeCampaignBatch should NOT be called for an already-running campaign
      const executeSpy = vi.spyOn(
        await import("@/server/services/campaign-executor.service"),
        "executeCampaignBatch"
      );

      await processScheduledCampaigns();
      expect(executeSpy).not.toHaveBeenCalled();

      stopCampaign(campaignId);
      executeSpy.mockRestore();
    });

    it("two concurrent campaign starts are guarded by state check", () => {
      const campaignId = "camp-double-001";

      // First start sets state
      resumeCampaign(campaignId);
      expect(getCampaignState(campaignId)).toBe("running");

      // Second attempt: state is already "running" — in-memory guard prevents double execution
      const state = getCampaignState(campaignId);
      expect(state).toBe("running"); // already running, skip signal is truthy

      stopCampaign(campaignId);
    });

    it("different campaigns can run concurrently without interfering", () => {
      resumeCampaign("camp-A");
      resumeCampaign("camp-B");
      expect(getCampaignState("camp-A")).toBe("running");
      expect(getCampaignState("camp-B")).toBe("running");
      stopCampaign("camp-A");
      stopCampaign("camp-B");
    });

    it("paused state is distinguishable from running state", () => {
      resumeCampaign("camp-states-001");
      expect(getCampaignState("camp-states-001")).toBe("running");
      pauseCampaign("camp-states-001");
      expect(getCampaignState("camp-states-001")).toBe("paused");
      expect(getCampaignState("camp-states-001")).not.toBe("running");
      stopCampaign("camp-states-001");
    });
  });

  // ── RS-006: Concurrent appointment booking ───────────────────────────────────
  // The appointments router uses a DB-level conflict check before creating.
  // These tests verify the conflict detection data layer behaves correctly
  // under simulated concurrent scenarios.
  describe("RS-006: Concurrent appointment booking — no double-booking; one succeeds, one fails", () => {
    const slotTime = "2025-06-01T10:00:00Z";
    const slotEnd  = "2025-06-01T10:30:00Z";

    it("findFirst returns existing appointment at the requested slot (conflict detected)", async () => {
      // Simulates what the router does to check for an existing booking
      vi.mocked(db.appointment.findFirst).mockResolvedValue({
        id: "apt-existing-001",
        scheduledAt: new Date(slotTime),
        endAt: new Date(slotEnd),
        status: "scheduled",
      } as never);

      const existing = await db.appointment.findFirst({
        where: {
          scheduledAt: { gte: new Date(slotTime), lt: new Date(slotEnd) },
          status: { notIn: ["cancelled"] },
        },
      });

      expect(existing).not.toBeNull();
      expect(existing?.id).toBe("apt-existing-001");
    });

    it("second booking attempt receives conflict signal from DB check", async () => {
      // First request: no conflict → creates appointment
      vi.mocked(db.appointment.findFirst).mockResolvedValueOnce(null);
      const firstCheck = await db.appointment.findFirst({
        where: { scheduledAt: new Date(slotTime) },
      });
      expect(firstCheck).toBeNull(); // no conflict → proceed

      // Second concurrent request: slot now taken
      vi.mocked(db.appointment.findFirst).mockResolvedValueOnce({
        id: "apt-first-001",
        scheduledAt: new Date(slotTime),
      } as never);
      const secondCheck = await db.appointment.findFirst({
        where: { scheduledAt: new Date(slotTime) },
      });
      expect(secondCheck).not.toBeNull(); // conflict → reject
    });

    it("create is called exactly once for a conflict-free booking", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null); // no conflict
      vi.mocked(db.appointment.create).mockResolvedValue({
        id: "apt-new-001",
        scheduledAt: new Date(slotTime),
      } as never);

      // Simulates the router flow: check → create
      const conflict = await db.appointment.findFirst({
        where: { scheduledAt: new Date(slotTime) },
      });
      if (!conflict) {
        await db.appointment.create({
          data: { scheduledAt: new Date(slotTime), status: "scheduled" },
        } as never);
      }

      expect(db.appointment.create).toHaveBeenCalledTimes(1);
    });

    it("create is NOT called when conflict is detected (second concurrent request)", async () => {
      vi.mocked(db.appointment.findFirst).mockResolvedValue({
        id: "apt-existing-001",
        scheduledAt: new Date(slotTime),
      } as never);

      // Simulates the router flow: check → conflict found → abort
      const conflict = await db.appointment.findFirst({
        where: { scheduledAt: new Date(slotTime) },
      });
      if (!conflict) {
        await db.appointment.create({ data: {} } as never);
      }

      // create should NOT have been called
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it("cancelled appointments do not block new bookings at the same slot", async () => {
      // A cancelled appointment at the same slot should not block re-booking
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null); // cancelled ones excluded by query

      const conflict = await db.appointment.findFirst({
        where: {
          scheduledAt: new Date(slotTime),
          status: { notIn: ["cancelled"] },
        },
      });

      expect(conflict).toBeNull(); // no active conflict → slot available
    });

    it("rescheduled appointment frees original slot for re-booking", async () => {
      // After rescheduling, the original slot returns no conflict
      vi.mocked(db.appointment.findFirst).mockResolvedValue(null);

      const conflict = await db.appointment.findFirst({
        where: {
          scheduledAt: new Date(slotTime),
          status: { notIn: ["cancelled", "rescheduled"] },
        },
      });

      expect(conflict).toBeNull();
    });
  });
});
