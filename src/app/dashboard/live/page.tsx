"use client";

import { useState } from "react";
import { Radio, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ActiveCallsList } from "@/components/live/active-calls-list";
import { LiveTranscriptPanel } from "@/components/live/live-transcript-panel";
import { SupervisorControls } from "@/components/live/supervisor-controls";

export default function LiveCallsPage() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // The server enforces the real role check; default to "manager" for UI rendering
  const userRole = "manager";

  const {
    data: activeCalls,
    isLoading,
    isError,
  } = trpc.liveCalls.getActiveCalls.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const calls = activeCalls ?? [];

  // If the selected call disappears from the active list, deselect it
  if (
    selectedCallId &&
    calls.length > 0 &&
    !calls.find((c) => c.id === selectedCallId)
  ) {
    // Defer state update to avoid setting state during render
    setTimeout(() => setSelectedCallId(null), 0);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5">
            <Radio className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Live Call Monitor
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitor active calls in real-time and manage conversations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-medium text-foreground/80">
            {calls.length} active call{calls.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">Loading active calls...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-2xl border border-border bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-3 text-sm font-medium text-red-400">
            Failed to load active calls
          </h3>
          <p className="mt-1 text-xs text-red-400">
            There was an error fetching active calls. The page will retry
            automatically.
          </p>
        </div>
      )}

      {/* Main split layout */}
      {!isLoading && !isError && (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6" style={{ minHeight: "calc(100vh - 240px)" }}>
          {/* Left Panel: Active Calls List */}
          <div className="w-full lg:w-1/3 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col">
            <ActiveCallsList
              calls={calls}
              selectedCallId={selectedCallId}
              onSelectCall={setSelectedCallId}
            />
          </div>

          {/* Right Panel: Transcript + Controls */}
          <div className="w-full lg:w-2/3 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col">
            {/* Transcript area fills available space */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
              <LiveTranscriptPanel callId={selectedCallId} />
            </div>

            {/* Supervisor controls pinned to bottom */}
            <SupervisorControls callId={selectedCallId} userRole={userRole} />
          </div>
        </div>
      )}
    </div>
  );
}
