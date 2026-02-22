"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Navigation2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { PendingAction } from "@/app/api/assistant/route";

interface Message {
  role: "user" | "assistant";
  content: string;
  navigate?: { path: string; label: string };
}

interface AssistantResponse {
  reply: string;
  navigate?: { path: string; label: string };
  pendingAction?: PendingAction;
}

// ── Confirmation card state types ──────────────────────────────────────────

type AgentCard = {
  kind: "create_agent";
  name: string;
  systemPrompt: string;
  firstMessage: string;
};

type CampaignCard = {
  kind: "create_campaign";
  name: string;
  campaignType: "cold_calling" | "interview";
  agentId: string;
  description: string;
  jobTitle: string;
  jobDescription: string;
};

type ContactCard = {
  kind: "create_contact";
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

type ConfirmCard = AgentCard | CampaignCard | ContactCard;

// ──────────────────────────────────────────────────────────────────────────

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm your CalTone assistant. Ask me anything, navigate anywhere, or say things like \"create a sales campaign\" or \"add a contact\".",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmCard, setConfirmCard] = useState<ConfirmCard | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // ── Fetch agents for campaign dropdown ────────────────────────────────
  const { data: agentsData } = trpc.agents.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });
  const agents = agentsData ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: (agent) => {
      setConfirmCard(null);
      appendAssistant(`Agent "${agent.name}" created. You can find it in Agents.`);
    },
    onError: (err) => appendAssistant(`Failed to create agent: ${err.message}`),
  });

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (campaign) => {
      setConfirmCard(null);
      appendAssistant(`Campaign "${campaign.name}" created. You can view it in Campaigns.`);
    },
    onError: (err) => appendAssistant(`Failed to create campaign: ${err.message}`),
  });

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: (contact) => {
      setConfirmCard(null);
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phoneNumber;
      appendAssistant(`Contact "${name}" created. You can find them in Contacts.`);
    },
    onError: (err) => appendAssistant(`Failed to create contact: ${err.message}`),
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  const appendAssistant = (content: string) =>
    setMessages((prev) => [...prev, { role: "assistant", content }]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, confirmCard]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Send message ──────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setConfirmCard(null);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, currentPath: pathname }),
      });

      const data: AssistantResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn't process that. Please try again.",
          navigate: data.navigate,
        },
      ]);

      if (data.navigate?.path && data.navigate.path !== pathname) {
        setTimeout(() => router.push(data.navigate!.path), 1400);
      }

      if (data.pendingAction) {
        const a = data.pendingAction;
        if (a.type === "create_agent") {
          setConfirmCard({
            kind: "create_agent",
            name: a.data.name,
            systemPrompt: a.data.systemPrompt,
            firstMessage: a.data.firstMessage ?? "",
          });
        } else if (a.type === "create_campaign") {
          setConfirmCard({
            kind: "create_campaign",
            name: a.data.name,
            campaignType: a.data.campaignType,
            agentId: agents[0]?.id ?? "",
            description: a.data.description ?? "",
            jobTitle: a.data.jobTitle ?? "",
            jobDescription: a.data.jobDescription ?? "",
          });
        } else if (a.type === "create_contact") {
          setConfirmCard({
            kind: "create_contact",
            firstName: a.data.firstName ?? "",
            lastName: a.data.lastName ?? "",
            phoneNumber: a.data.phoneNumber ?? "",
          });
        }
      }
    } catch {
      appendAssistant("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, pathname, router, agents]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // ── Confirm handlers ──────────────────────────────────────────────────
  const handleCancel = () => {
    setConfirmCard(null);
    appendAssistant("No problem — action cancelled.");
  };

  const handleConfirm = () => {
    if (!confirmCard) return;

    if (confirmCard.kind === "create_agent") {
      createAgent.mutate({
        name: confirmCard.name,
        systemPrompt: confirmCard.systemPrompt,
        firstMessage: confirmCard.firstMessage || undefined,
      });
    } else if (confirmCard.kind === "create_campaign") {
      createCampaign.mutate({
        name: confirmCard.name,
        agentId: confirmCard.agentId,
        type: confirmCard.campaignType,
        description: confirmCard.description || undefined,
        jobTitle: confirmCard.jobTitle || undefined,
        jobDescription: confirmCard.jobDescription || undefined,
      });
    } else if (confirmCard.kind === "create_contact") {
      createContact.mutate({
        phoneNumber: confirmCard.phoneNumber,
        firstName: confirmCard.firstName || undefined,
        lastName: confirmCard.lastName || undefined,
      });
    }
  };

  const isPending =
    createAgent.isPending || createCampaign.isPending || createContact.isPending;

  const isConfirmDisabled = (() => {
    if (!confirmCard || isPending) return true;
    if (confirmCard.kind === "create_agent")
      return !confirmCard.name.trim() || confirmCard.systemPrompt.trim().length < 10;
    if (confirmCard.kind === "create_campaign")
      return !confirmCard.name.trim() || !confirmCard.agentId;
    if (confirmCard.kind === "create_contact") return !confirmCard.phoneNumber.trim();
    return false;
  })();

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[88px] right-6 z-50 flex w-[370px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%)",
            }}
          >
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">CalTone Assistant</span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 transition-colors hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex flex-col gap-3 overflow-y-auto p-4"
            style={{ maxHeight: "380px" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.navigate && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-current/20 pt-1.5 text-xs opacity-75">
                      <Navigation2 className="h-3 w-3" />
                      <span>Navigating to {msg.navigate.label}…</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Confirmation cards ────────────────────────────────── */}
            {confirmCard && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {confirmCard.kind === "create_agent" && "Create Agent — Review & Confirm"}
                  {confirmCard.kind === "create_campaign" && "Create Campaign — Review & Confirm"}
                  {confirmCard.kind === "create_contact" && "Create Contact — Review & Confirm"}
                </p>

                {/* Agent card */}
                {confirmCard.kind === "create_agent" && (
                  <div className="space-y-2">
                    <Field label="Name">
                      <input
                        value={confirmCard.name}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_agent" ? { ...p, name: e.target.value } : p
                          )
                        }
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="First Message (optional)">
                      <input
                        value={confirmCard.firstMessage}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_agent"
                              ? { ...p, firstMessage: e.target.value }
                              : p
                          )
                        }
                        placeholder="Opening line when call connects…"
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="System Prompt">
                      <textarea
                        value={confirmCard.systemPrompt}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_agent"
                              ? { ...p, systemPrompt: e.target.value }
                              : p
                          )
                        }
                        rows={5}
                        className={`${fieldCls} resize-none`}
                      />
                    </Field>
                  </div>
                )}

                {/* Campaign card */}
                {confirmCard.kind === "create_campaign" && (
                  <div className="space-y-2">
                    <Field label="Name">
                      <input
                        value={confirmCard.name}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_campaign" ? { ...p, name: e.target.value } : p
                          )
                        }
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={confirmCard.campaignType}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_campaign"
                              ? {
                                  ...p,
                                  campaignType: e.target.value as "cold_calling" | "interview",
                                }
                              : p
                          )
                        }
                        className={fieldCls}
                      >
                        <option value="cold_calling">Call Campaign (outreach / sales)</option>
                        <option value="interview">Interview Campaign (hiring)</option>
                      </select>
                    </Field>
                    <Field label="Agent">
                      <select
                        value={confirmCard.agentId}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_campaign"
                              ? { ...p, agentId: e.target.value }
                              : p
                          )
                        }
                        className={fieldCls}
                      >
                        <option value="">— select an agent —</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Description (optional)">
                      <input
                        value={confirmCard.description}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_campaign"
                              ? { ...p, description: e.target.value }
                              : p
                          )
                        }
                        className={fieldCls}
                      />
                    </Field>
                    {confirmCard.campaignType === "interview" && (
                      <>
                        <Field label="Job Title">
                          <input
                            value={confirmCard.jobTitle}
                            onChange={(e) =>
                              setConfirmCard((p) =>
                                p?.kind === "create_campaign"
                                  ? { ...p, jobTitle: e.target.value }
                                  : p
                              )
                            }
                            className={fieldCls}
                          />
                        </Field>
                        <Field label="Job Description">
                          <textarea
                            value={confirmCard.jobDescription}
                            onChange={(e) =>
                              setConfirmCard((p) =>
                                p?.kind === "create_campaign"
                                  ? { ...p, jobDescription: e.target.value }
                                  : p
                              )
                            }
                            rows={3}
                            className={`${fieldCls} resize-none`}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                )}

                {/* Contact card */}
                {confirmCard.kind === "create_contact" && (
                  <div className="space-y-2">
                    <Field label="First Name">
                      <input
                        value={confirmCard.firstName}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_contact"
                              ? { ...p, firstName: e.target.value }
                              : p
                          )
                        }
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="Last Name">
                      <input
                        value={confirmCard.lastName}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_contact"
                              ? { ...p, lastName: e.target.value }
                              : p
                          )
                        }
                        className={fieldCls}
                      />
                    </Field>
                    <Field label="Phone Number *">
                      <input
                        value={confirmCard.phoneNumber}
                        onChange={(e) =>
                          setConfirmCard((p) =>
                            p?.kind === "create_contact"
                              ? { ...p, phoneNumber: e.target.value }
                              : p
                          )
                        }
                        placeholder="+1 555 000 0000"
                        className={fieldCls}
                      />
                    </Field>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isConfirmDisabled}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-sm text-primary-foreground transition-opacity disabled:opacity-40"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    {isPending
                      ? "Creating…"
                      : confirmCard.kind === "create_agent"
                      ? "Create Agent"
                      : confirmCard.kind === "create_campaign"
                      ? "Create Campaign"
                      : "Create Contact"}
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 border-t border-border/60 px-3 py-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or say 'create a campaign…'"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={loading}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating trigger — hidden when panel is open (panel has its own X to close) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-[72px] right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
            color: "white",
            boxShadow:
              "0 8px 32px hsl(var(--primary)/0.35), 0 2px 8px rgba(0,0,0,0.3)",
          }}
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────

const fieldCls =
  "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/50 mt-0.5";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
