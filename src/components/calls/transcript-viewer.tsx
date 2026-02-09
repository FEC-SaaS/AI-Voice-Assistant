"use client";

import { Bot, User, MessageSquare } from "lucide-react";

export interface TranscriptMessage {
  role: string;
  content: string;
  timestamp?: number;
}

interface TranscriptViewerProps {
  messages: TranscriptMessage[];
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TranscriptViewer({ messages }: TranscriptViewerProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 text-muted-foreground/70" />
        <p className="mt-4 text-sm">No transcript available for this call.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => {
        const isAssistant =
          msg.role === "assistant" || msg.role === "bot" || msg.role === "ai";

        return (
          <div
            key={i}
            className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isAssistant ? "bg-primary/10" : "bg-secondary"
              }`}
            >
              {isAssistant ? (
                <Bot className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                isAssistant
                  ? "bg-primary/5 text-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.timestamp != null && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {formatTimestamp(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
