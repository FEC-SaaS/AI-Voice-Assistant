"use client";

import { useEffect, useState } from "react";
import {
  PhoneIncoming,
  PhoneOutgoing,
  User,
  Building2,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ActiveCall {
  id: string;
  vapiCallId: string | null;
  status: string | null;
  direction: string;
  fromNumber: string | null;
  toNumber: string | null;
  startedAt: string | Date | null;
  agentName: string | null;
  contactName: string | null;
  contactCompany: string | null;
  contactPhone: string | null;
  campaignName: string | null;
}

interface CallCardProps {
  call: ActiveCall;
  isSelected: boolean;
  onClick: (callId: string) => void;
}

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "in-progress":
      return {
        label: "In Progress",
        dotColor: "bg-green-500",
        badgeClass: "bg-green-500/10 text-green-400 border-green-200",
        pulse: true,
      };
    case "ringing":
      return {
        label: "Ringing",
        dotColor: "bg-yellow-500",
        badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-200",
        pulse: true,
      };
    case "queued":
      return {
        label: "Queued",
        dotColor: "bg-blue-500",
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-200",
        pulse: false,
      };
    default:
      return {
        label: status,
        dotColor: "bg-muted-foreground",
        badgeClass: "bg-secondary text-foreground/80 border-border",
        pulse: false,
      };
  }
}

export function CallCard({ call, isSelected, onClick }: CallCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const statusConfig = getStatusConfig(call.status ?? "unknown");

  useEffect(() => {
    if (!call.startedAt) return;

    const startTime = new Date(call.startedAt).getTime();

    function updateElapsed() {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsed(diff);
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [call.startedAt]);

  return (
    <button
      type="button"
      onClick={() => onClick(call.id)}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/50 bg-card hover:border-border"
      )}
    >
      {/* Top row: Agent + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              call.direction === "inbound" ? "bg-blue-500/10" : "bg-green-500/10"
            )}
          >
            {call.direction === "inbound" ? (
              <PhoneIncoming className="h-4 w-4 text-blue-400" />
            ) : (
              <PhoneOutgoing className="h-4 w-4 text-green-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <p className="text-sm font-medium text-foreground truncate">
                {call.agentName || "Unknown Agent"}
              </p>
            </div>
            {call.campaignName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {call.campaignName}
              </p>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn("shrink-0 gap-1.5 text-xs", statusConfig.badgeClass)}
        >
          <span className="relative flex h-2 w-2">
            {statusConfig.pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  statusConfig.dotColor
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                statusConfig.dotColor
              )}
            />
          </span>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Contact info */}
      <div className="mt-3 space-y-1">
        {call.contactName && (
          <div className="flex items-center gap-1.5 text-sm text-foreground/80">
            <User className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="truncate">{call.contactName}</span>
          </div>
        )}
        {call.contactCompany && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 text-muted-foreground/70" />
            <span className="truncate">{call.contactCompany}</span>
          </div>
        )}
        {call.contactPhone && (
          <p className="text-xs text-muted-foreground font-mono pl-5">
            {call.contactPhone}
          </p>
        )}
      </div>

      {/* Bottom row: Duration + Direction label */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground capitalize">
          {call.direction}
        </span>
        <span
          className={cn(
            "text-sm font-mono font-medium tabular-nums",
            call.status === "in-progress" ? "text-green-400" : "text-muted-foreground"
          )}
        >
          {formatElapsedTime(elapsed)}
        </span>
      </div>
    </button>
  );
}
