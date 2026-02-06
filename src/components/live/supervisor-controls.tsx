"use client";

import { useState } from "react";
import {
  Megaphone,
  EarOff,
  PhoneOff,
  Send,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ALLOWED_ROLES = ["owner", "admin", "manager"];

interface SupervisorControlsProps {
  callId: string | null;
  userRole: string;
}

export function SupervisorControls({
  callId,
  userRole,
}: SupervisorControlsProps) {
  const [bargeMessage, setBargeMessage] = useState("");
  const [whisperMessage, setWhisperMessage] = useState("");

  const utils = trpc.useUtils();

  const bargeIn = trpc.liveCalls.bargeIn.useMutation({
    onSuccess: () => {
      toast.success("Barge-in message sent successfully.");
      setBargeMessage("");
      utils.liveCalls.getLiveTranscript.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send barge-in message.");
    },
  });

  const whisper = trpc.liveCalls.whisper.useMutation({
    onSuccess: () => {
      toast.success("Whisper message sent to the agent.");
      setWhisperMessage("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send whisper message.");
    },
  });

  const endCall = trpc.liveCalls.endCall.useMutation({
    onSuccess: () => {
      toast.success("Call ended successfully.");
      utils.liveCalls.getActiveCalls.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to end the call.");
    },
  });

  // Only show for authorized roles
  if (!ALLOWED_ROLES.includes(userRole)) {
    return null;
  }

  // No call selected
  if (!callId) {
    return null;
  }

  function handleBargeIn() {
    if (!callId || !bargeMessage.trim()) return;
    bargeIn.mutate({ callId, message: bargeMessage.trim() });
  }

  function handleWhisper() {
    if (!callId || !whisperMessage.trim()) return;
    whisper.mutate({ callId, message: whisperMessage.trim() });
  }

  function handleEndCall() {
    if (!callId) return;
    const confirmed = window.confirm(
      "Are you sure you want to end this call? This action cannot be undone."
    );
    if (!confirmed) return;
    endCall.mutate({ callId });
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Supervisor Controls
        </h4>
      </div>

      {/* Barge In */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <Megaphone className="h-3 w-3" />
          Barge In
          <span className="text-gray-400 font-normal">
            -- speak directly to the caller
          </span>
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a message to the caller..."
            value={bargeMessage}
            onChange={(e) => setBargeMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleBargeIn();
              }
            }}
            disabled={bargeIn.isPending}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleBargeIn}
            disabled={bargeIn.isPending || !bargeMessage.trim()}
            className="shrink-0"
          >
            {bargeIn.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Whisper */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <EarOff className="h-3 w-3" />
          Whisper
          <span className="text-gray-400 font-normal">
            -- only the agent hears this
          </span>
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a whisper to the agent..."
            value={whisperMessage}
            onChange={(e) => setWhisperMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleWhisper();
              }
            }}
            disabled={whisper.isPending}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleWhisper}
            disabled={whisper.isPending || !whisperMessage.trim()}
            className="shrink-0"
          >
            {whisper.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* End Call */}
      <div className="pt-1">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndCall}
          disabled={endCall.isPending}
          className={cn("w-full gap-2", endCall.isPending && "opacity-70")}
        >
          {endCall.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PhoneOff className="h-4 w-4" />
          )}
          End Call
        </Button>
      </div>
    </div>
  );
}
