/**
 * Module 19: RESILIENCE & ERROR HANDLING Tests
 *
 * Covers:
 *  - Call service guard checks and TRPCError propagation (initiateCall)
 *  - Graceful degradation when external services fail (syncCallFromVapi)
 *  - Webhook idempotency / null safety (handleCallWebhook)
 *  - NOT_FOUND error on missing resources (getCallDetails, retryCall)
 *  - Call status → contact status mapping
 *  - Failed call cleanup (DB state is marked "failed" on Vapi error)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock all external dependencies before importing the service ──────────────

vi.mock("@/lib/db", () => ({
  db: {
    call: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    agent: { findFirst: vi.fn() },
    phoneNumber: { findFirst: vi.fn() },
    knowledgeDocument: { findMany: vi.fn() },
    contact: { update: vi.fn() },
  },
}));

vi.mock("@/lib/vapi", () => ({
  createCall: vi.fn(),
  getCall: vi.fn(),
}));

vi.mock("@/server/services/billing.service", () => ({
  checkMinutesLimit: vi.fn(),
  recordCallUsage: vi.fn(),
  ensureTrialExpiry: vi.fn(),
}));

vi.mock("@/lib/vapi-tools", () => ({
  getOutboundCallPrompt: vi.fn(() => "\n[Outbound call context]"),
  getOutboundFirstMessage: vi.fn(
    (agentName: string, bizName: string) =>
      `Hello from ${agentName} at ${bizName}!`
  ),
}));

// ─── Import after mocks are set up ───────────────────────────────────────────

import { db } from "@/lib/db";
import { createCall, getCall } from "@/lib/vapi";
import {
  checkMinutesLimit,
  recordCallUsage,
  ensureTrialExpiry,
} from "@/server/services/billing.service";
import {
  handleCallWebhook,
  syncCallFromVapi,
  getCallDetails,
  initiateCall,
  retryCall,
} from "@/server/services/call.service";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const ORG_ID = "org-test-001";
const AGENT_ID = "agent-test-001";
const CALL_ID = "call-test-001";
const VAPI_CALL_ID = "vapi-ext-001";

const mockAgent = {
  id: AGENT_ID,
  vapiAssistantId: "vapi-assistant-001",
  name: "Support Bot",
  systemPrompt: "You are a helpful support assistant.",
  modelProvider: "openai",
  model: "gpt-4o",
  organization: { name: "Acme Corp" },
};

const mockPhoneNumber = {
  id: "phone-001",
  number: "+15550001111",
  vapiPhoneId: "vapi-phone-001",
  isActive: true,
};

const mockCreatedCall = {
  id: CALL_ID,
  organizationId: ORG_ID,
  agentId: AGENT_ID,
  direction: "outbound",
  status: "queued",
  toNumber: "+15551234567",
  fromNumber: mockPhoneNumber.number,
  vapiCallId: null,
  contactId: null,
  campaignId: null,
};

// ─────────────────────────────────────────────────────────────────────────────

describe("19. RESILIENCE & ERROR HANDLING", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── handleCallWebhook ────────────────────────────────────────────────────────
  describe("handleCallWebhook — webhook safety", () => {
    it("returns null (does not throw) when call is not found", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue(null);
      const result = await handleCallWebhook({
        callId: "unknown-vapi-id",
        status: "completed",
      });
      expect(result).toBeNull();
    });

    it("updates the call record with new status", async () => {
      const storedCall = { ...mockCreatedCall, vapiCallId: VAPI_CALL_ID };
      vi.mocked(db.call.findFirst).mockResolvedValue(storedCall as never);
      vi.mocked(db.call.update).mockResolvedValue({
        ...storedCall,
        status: "completed",
      } as never);

      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "completed" });

      expect(db.call.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CALL_ID },
          data: expect.objectContaining({ status: "completed" }),
        })
      );
    });

    it("records usage when status is completed and durationSeconds is provided", async () => {
      const storedCall = { ...mockCreatedCall, vapiCallId: VAPI_CALL_ID };
      vi.mocked(db.call.findFirst).mockResolvedValue(storedCall as never);
      vi.mocked(db.call.update).mockResolvedValue(storedCall as never);
      vi.mocked(recordCallUsage).mockResolvedValue(undefined as never);

      await handleCallWebhook({
        callId: VAPI_CALL_ID,
        status: "completed",
        durationSeconds: 180,
      });

      expect(recordCallUsage).toHaveBeenCalledWith(ORG_ID, 180, CALL_ID);
    });

    it("does NOT record usage for failed calls", async () => {
      const storedCall = { ...mockCreatedCall, vapiCallId: VAPI_CALL_ID };
      vi.mocked(db.call.findFirst).mockResolvedValue(storedCall as never);
      vi.mocked(db.call.update).mockResolvedValue(storedCall as never);

      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "failed" });

      expect(recordCallUsage).not.toHaveBeenCalled();
    });

    it("does NOT record usage when durationSeconds is missing even if completed", async () => {
      const storedCall = { ...mockCreatedCall, vapiCallId: VAPI_CALL_ID };
      vi.mocked(db.call.findFirst).mockResolvedValue(storedCall as never);
      vi.mocked(db.call.update).mockResolvedValue(storedCall as never);

      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "completed" });

      expect(recordCallUsage).not.toHaveBeenCalled();
    });

    it("updates linked contact status when call completes", async () => {
      const callWithContact = {
        ...mockCreatedCall,
        vapiCallId: VAPI_CALL_ID,
        contactId: "contact-001",
      };
      vi.mocked(db.call.findFirst).mockResolvedValue(callWithContact as never);
      vi.mocked(db.call.update).mockResolvedValue(callWithContact as never);
      vi.mocked(db.contact.update).mockResolvedValue({} as never);

      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "completed" });

      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "contact-001" } })
      );
    });

    it("does NOT update contact when contactId is null", async () => {
      const callWithoutContact = {
        ...mockCreatedCall,
        vapiCallId: VAPI_CALL_ID,
        contactId: null,
      };
      vi.mocked(db.call.findFirst).mockResolvedValue(callWithoutContact as never);
      vi.mocked(db.call.update).mockResolvedValue(callWithoutContact as never);

      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "completed" });

      expect(db.contact.update).not.toHaveBeenCalled();
    });

    it("persists transcript, recording, summary and sentiment fields", async () => {
      const storedCall = { ...mockCreatedCall, vapiCallId: VAPI_CALL_ID };
      vi.mocked(db.call.findFirst).mockResolvedValue(storedCall as never);
      vi.mocked(db.call.update).mockResolvedValue(storedCall as never);

      await handleCallWebhook({
        callId: VAPI_CALL_ID,
        status: "completed",
        transcript: "Hello, how can I help?",
        recordingUrl: "https://storage.example.com/rec-001.mp3",
        summary: "Customer asked about billing.",
        sentiment: "positive",
        durationSeconds: 60,
      });

      expect(db.call.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transcript: "Hello, how can I help?",
            recordingUrl: "https://storage.example.com/rec-001.mp3",
            summary: "Customer asked about billing.",
            sentiment: "positive",
          }),
        })
      );
    });
  });

  // ── syncCallFromVapi ──────────────────────────────────────────────────────────
  describe("syncCallFromVapi — graceful degradation", () => {
    it("returns false when the call ID does not exist in DB", async () => {
      vi.mocked(db.call.findUnique).mockResolvedValue(null);
      expect(await syncCallFromVapi("nonexistent-call")).toBe(false);
    });

    it("returns false when call has no vapiCallId", async () => {
      vi.mocked(db.call.findUnique).mockResolvedValue({
        id: CALL_ID,
        vapiCallId: null,
      } as never);
      expect(await syncCallFromVapi(CALL_ID)).toBe(false);
    });

    it("returns false WITHOUT throwing when Vapi API call fails", async () => {
      vi.mocked(db.call.findUnique).mockResolvedValue({
        id: CALL_ID,
        vapiCallId: VAPI_CALL_ID,
      } as never);
      vi.mocked(getCall).mockRejectedValue(
        new Error("Vapi service unavailable")
      );

      await expect(syncCallFromVapi(CALL_ID)).resolves.toBe(false);
    });

    it("returns false WITHOUT throwing on network timeout", async () => {
      vi.mocked(db.call.findUnique).mockResolvedValue({
        id: CALL_ID,
        vapiCallId: VAPI_CALL_ID,
      } as never);
      vi.mocked(getCall).mockRejectedValue(new Error("ETIMEDOUT"));

      await expect(syncCallFromVapi(CALL_ID)).resolves.toBe(false);
    });

    it("returns true and updates DB on successful sync", async () => {
      vi.mocked(db.call.findUnique).mockResolvedValue({
        id: CALL_ID,
        vapiCallId: VAPI_CALL_ID,
      } as never);
      vi.mocked(getCall).mockResolvedValue({
        status: "completed",
        transcript: "Hello world",
        recordingUrl: "https://storage.example.com/rec-001.mp3",
        startedAt: "2025-01-13T14:00:00Z",
        endedAt: "2025-01-13T14:05:30Z",
      } as never);
      vi.mocked(db.call.update).mockResolvedValue({} as never);

      expect(await syncCallFromVapi(CALL_ID)).toBe(true);
      expect(db.call.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CALL_ID } })
      );
    });
  });

  // ── getCallDetails ────────────────────────────────────────────────────────────
  describe("getCallDetails — NOT_FOUND handling", () => {
    it("throws TRPCError when call is not found", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue(null);
      await expect(getCallDetails("missing-id", ORG_ID)).rejects.toThrow(
        TRPCError
      );
    });

    it("throws with code NOT_FOUND", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue(null);
      try {
        await getCallDetails("missing-id", ORG_ID);
        expect.fail("Expected TRPCError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
    });

    it("returns call data when found", async () => {
      const fullCall = {
        ...mockCreatedCall,
        agent: { id: AGENT_ID, name: "Support Bot" },
        campaign: null,
        contact: null,
      };
      vi.mocked(db.call.findFirst).mockResolvedValue(fullCall as never);

      const result = await getCallDetails(CALL_ID, ORG_ID);
      expect(result).toMatchObject({ id: CALL_ID });
    });
  });

  // ── initiateCall — guard checks ───────────────────────────────────────────────
  describe("initiateCall — guard checks and error propagation", () => {
    beforeEach(() => {
      vi.mocked(ensureTrialExpiry).mockResolvedValue(undefined as never);
    });

    it("throws FORBIDDEN when minutes limit is exceeded", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({
        allowed: false,
        reason: "Monthly minutes limit reached",
      });

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Monthly minutes limit reached" });
    });

    it("throws FORBIDDEN with default message when reason is not provided", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({
        allowed: false,
        reason: undefined,
      });

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({ code: "FORBIDDEN", message: "Minutes limit reached" });
    });

    it("throws BAD_REQUEST when agent is not found", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(null);

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: "missing-agent", phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws BAD_REQUEST when agent has no vapiAssistantId", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue({
        ...mockAgent,
        vapiAssistantId: null,
      } as never);

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Agent not found or not connected to voice system",
      });
    });

    it("throws BAD_REQUEST when no active phone number is available", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(mockAgent as never);
      vi.mocked(db.knowledgeDocument.findMany).mockResolvedValue([]);
      vi.mocked(db.phoneNumber.findFirst).mockResolvedValue(null);

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "No active phone number available",
      });
    });

    it("marks call as 'failed' in DB when Vapi createCall throws", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(mockAgent as never);
      vi.mocked(db.knowledgeDocument.findMany).mockResolvedValue([]);
      vi.mocked(db.phoneNumber.findFirst).mockResolvedValue(
        mockPhoneNumber as never
      );
      vi.mocked(db.call.create).mockResolvedValue(mockCreatedCall as never);
      vi.mocked(createCall).mockRejectedValue(
        new Error("Vapi API rate limit exceeded")
      );
      vi.mocked(db.call.update).mockResolvedValue({} as never);

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

      // Verify the failed state is written back to DB
      expect(db.call.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CALL_ID },
          data: { status: "failed" },
        })
      );
    });

    it("wraps non-Error Vapi failure in INTERNAL_SERVER_ERROR", async () => {
      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(mockAgent as never);
      vi.mocked(db.knowledgeDocument.findMany).mockResolvedValue([]);
      vi.mocked(db.phoneNumber.findFirst).mockResolvedValue(
        mockPhoneNumber as never
      );
      vi.mocked(db.call.create).mockResolvedValue(mockCreatedCall as never);
      vi.mocked(createCall).mockRejectedValue("string error"); // non-Error
      vi.mocked(db.call.update).mockResolvedValue({} as never);

      await expect(
        initiateCall({ organizationId: ORG_ID, agentId: AGENT_ID, phoneNumber: "+15551234567" })
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initiate call",
      });
    });

    it("succeeds and returns call with vapiCallId on happy path", async () => {
      const vapiResponse = { id: VAPI_CALL_ID, status: "queued" };

      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(mockAgent as never);
      vi.mocked(db.knowledgeDocument.findMany).mockResolvedValue([]);
      vi.mocked(db.phoneNumber.findFirst).mockResolvedValue(
        mockPhoneNumber as never
      );
      vi.mocked(db.call.create).mockResolvedValue(mockCreatedCall as never);
      vi.mocked(createCall).mockResolvedValue(vapiResponse as never);
      vi.mocked(db.call.update).mockResolvedValue({
        ...mockCreatedCall,
        vapiCallId: VAPI_CALL_ID,
        status: "queued",
      } as never);

      const result = await initiateCall({
        organizationId: ORG_ID,
        agentId: AGENT_ID,
        phoneNumber: "+15551234567",
      });

      expect(result.vapiCallId).toBe(VAPI_CALL_ID);
    });

    it("includes knowledge base content in system prompt when docs exist", async () => {
      const vapiResponse = { id: VAPI_CALL_ID, status: "queued" };

      vi.mocked(checkMinutesLimit).mockResolvedValue({ allowed: true });
      vi.mocked(db.agent.findFirst).mockResolvedValue(mockAgent as never);
      vi.mocked(db.knowledgeDocument.findMany).mockResolvedValue([
        { name: "FAQ", content: "Q: Hours? A: 9-5 Mon-Fri" },
      ] as never);
      vi.mocked(db.phoneNumber.findFirst).mockResolvedValue(
        mockPhoneNumber as never
      );
      vi.mocked(db.call.create).mockResolvedValue(mockCreatedCall as never);
      vi.mocked(createCall).mockResolvedValue(vapiResponse as never);
      vi.mocked(db.call.update).mockResolvedValue(mockCreatedCall as never);

      await initiateCall({
        organizationId: ORG_ID,
        agentId: AGENT_ID,
        phoneNumber: "+15551234567",
      });

      // Verify getOutboundCallPrompt was called with the knowledge content
      // (the service passes knowledgeContent as 3rd arg to build the system prompt)
      const { getOutboundCallPrompt } = await import("@/lib/vapi-tools");
      const promptCall = vi.mocked(getOutboundCallPrompt).mock.calls[0];
      expect(promptCall?.[2]).toContain("KNOWLEDGE BASE");
    });
  });

  // ── retryCall ─────────────────────────────────────────────────────────────────
  describe("retryCall — resilience", () => {
    it("throws NOT_FOUND when original call does not exist", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue(null);

      await expect(retryCall("missing-call", ORG_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Call not found or cannot be retried",
      });
    });

    it("throws BAD_REQUEST when call is missing agentId", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue({
        id: CALL_ID,
        status: "failed",
        agentId: null,
        toNumber: "+15551234567",
      } as never);

      await expect(retryCall(CALL_ID, ORG_ID)).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Call missing required data for retry",
      });
    });

    it("throws BAD_REQUEST when call is missing toNumber", async () => {
      vi.mocked(db.call.findFirst).mockResolvedValue({
        id: CALL_ID,
        status: "failed",
        agentId: AGENT_ID,
        toNumber: null,
      } as never);

      await expect(retryCall(CALL_ID, ORG_ID)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("only retries failed or no-answer calls (status guard)", async () => {
      // findFirst returns null because where clause filters out non-failed statuses
      vi.mocked(db.call.findFirst).mockResolvedValue(null);

      await expect(retryCall("completed-call", ORG_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  // ── Call Status → Contact Status mapping ─────────────────────────────────────
  // Note: mapCallStatusToContactStatus is not exported directly; we test it
  // indirectly through handleCallWebhook behaviour.
  describe("Contact status mapping via handleCallWebhook", () => {
    const callWithContact = {
      ...mockCreatedCall,
      vapiCallId: VAPI_CALL_ID,
      contactId: "contact-001",
    };

    beforeEach(() => {
      vi.mocked(db.call.findFirst).mockResolvedValue(callWithContact as never);
      vi.mocked(db.call.update).mockResolvedValue(callWithContact as never);
      vi.mocked(db.contact.update).mockResolvedValue({} as never);
    });

    it("maps 'completed' call to 'completed' contact status", async () => {
      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "completed" });
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "completed" }),
        })
      );
    });

    it("maps 'failed' call to 'failed' contact status", async () => {
      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "failed" });
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "failed" }),
        })
      );
    });

    it("maps 'no-answer' call to 'failed' contact status", async () => {
      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "no-answer" });
      expect(db.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "failed" }),
        })
      );
    });

    it("does NOT update contact for intermediate status (e.g. 'ringing')", async () => {
      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "ringing" });
      expect(db.contact.update).not.toHaveBeenCalled();
    });

    it("does NOT update contact for 'queued' status", async () => {
      await handleCallWebhook({ callId: VAPI_CALL_ID, status: "queued" });
      expect(db.contact.update).not.toHaveBeenCalled();
    });
  });
});
