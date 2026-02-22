"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bot, X, Send, ChevronDown, Loader2, Navigation2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  navigate?: { path: string; label: string };
}

interface AssistantResponse {
  reply: string;
  navigate?: { path: string; label: string };
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm your CalTone assistant. Ask me anything about the platform, or say \"take me to Agents\" to navigate anywhere.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build history for API — skip the navigate metadata, just role+content
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

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || "I couldn't process that. Please try again.",
        navigate: data.navigate,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Navigate after a short pause so the user can read the reply
      if (data.navigate?.path && data.navigate.path !== pathname) {
        setTimeout(() => router.push(data.navigate!.path), 1400);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, pathname, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      {/* Chat panel — slides up from bottom-left */}
      {open && (
        <div className="fixed bottom-[88px] left-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%)",
            }}
          >
            <div className="flex items-center gap-2 text-white">
              <Bot className="h-4 w-4" />
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

          {/* Message list */}
          <div className="flex h-[380px] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
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

                  {/* Navigation indicator */}
                  {msg.navigate && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-current/20 pt-1.5 text-xs opacity-75">
                      <Navigation2 className="h-3 w-3" />
                      <span>Navigating to {msg.navigate.label}…</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
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
              placeholder="Ask anything or say 'take me to…'"
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

      {/* Floating trigger — bottom-left (feedback button is bottom-right) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
          color: "white",
          boxShadow:
            "0 8px 32px hsl(var(--primary)/0.35), 0 2px 8px rgba(0,0,0,0.3)",
        }}
        aria-label="Open AI assistant"
      >
        {open ? (
          <ChevronDown className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
