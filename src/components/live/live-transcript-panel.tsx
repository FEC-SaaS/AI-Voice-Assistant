"use client";

import { useEffect, useRef } from "react";
import { Bot, User, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface TranscriptMessage {
  role: string;
  content: string;
  timestamp?: string | Date;
}

interface LiveTranscriptPanelProps {
  callId: string | null;
}

function parseTranscript(transcript: unknown): TranscriptMessage[] {
  if (!transcript) return [];

  // If it's already an array, validate and return
  if (Array.isArray(transcript)) {
    return transcript.map((entry) => ({
      role: String(entry.role || "unknown"),
      content: String(entry.content || ""),
      timestamp: entry.timestamp ? String(entry.timestamp) : undefined,
    }));
  }

  // If it's a string, try to parse as JSON first
  if (typeof transcript === "string") {
    const trimmed = transcript.trim();

    // Try JSON array parse
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry: Record<string, unknown>) => ({
            role: String(entry.role || "unknown"),
            content: String(entry.content || ""),
            timestamp: entry.timestamp ? String(entry.timestamp) : undefined,
          }));
        }
      } catch {
        // Fall through to plain text handling
      }
    }

    // Plain text: split by newlines and treat as a single message block
    if (trimmed.length > 0) {
      return [
        {
          role: "system",
          content: trimmed,
        },
      ];
    }
  }

  return [];
}

function formatTranscriptTime(timestamp?: string | Date): string {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export function LiveTranscriptPanel({ callId }: LiveTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = trpc.liveCalls.getLiveTranscript.useQuery(
    { callId: callId! },
    {
      refetchInterval: 2000,
      enabled: !!callId,
    }
  );

  const messages = parseTranscript(data?.transcript);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // No call selected placeholder
  if (!callId) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
          <MessageSquare className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-gray-900">
          Select a call
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-[240px]">
          Choose an active call from the list to view the live transcript.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading transcript...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <MessageSquare className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-gray-900">
          Failed to load transcript
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-[240px]">
          There was an error loading the live transcript. It will retry
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">
            Live Transcript
          </h3>
        </div>
        {data?.status && (
          <span className="text-xs text-gray-500 capitalize">
            {data.status}
          </span>
        )}
      </div>

      {/* Transcript messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-300" />
              <p className="mt-3 text-xs text-gray-500">
                Waiting for conversation...
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isBot =
              message.role === "assistant" || message.role === "bot";
            const isSystem = message.role === "system";

            return (
              <div
                key={index}
                className={cn(
                  "flex gap-2.5",
                  isBot ? "justify-start" : "justify-end",
                  isSystem && "justify-center"
                )}
              >
                {/* System messages */}
                {isSystem ? (
                  <div className="max-w-[85%] rounded-lg bg-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Bot avatar on left */}
                    {isBot && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2.5",
                        isBot
                          ? "rounded-tl-sm bg-gray-100 text-gray-900"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {message.timestamp && (
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            isBot ? "text-gray-400" : "text-primary-foreground/70"
                          )}
                        >
                          {formatTranscriptTime(message.timestamp)}
                        </p>
                      )}
                    </div>

                    {/* User avatar on right */}
                    {!isBot && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <User className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
