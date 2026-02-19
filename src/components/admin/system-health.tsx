"use client";

import { Loader2 } from "lucide-react";

interface ServiceStatus {
  name: string;
  ok: boolean;
  latencyMs: number;
}

interface SystemHealthProps {
  services: ServiceStatus[];
  isLoading?: boolean;
}

function LatencyLabel({ ms }: { ms: number }) {
  const color =
    ms === 0
      ? "rgba(241,245,249,0.2)"
      : ms < 200
      ? "#10b981"
      : ms < 600
      ? "#f59e0b"
      : "#ef4444";
  return (
    <span className="text-[10px] font-mono" style={{ color }}>
      {ms > 0 ? `${ms}ms` : "—"}
    </span>
  );
}

export function SystemHealth({ services, isLoading }: SystemHealthProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(241,245,249,0.35)" }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking services…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {services.map((svc) => (
        <div
          key={svc.name}
          className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-all duration-200"
          style={{
            background: svc.ok
              ? "rgba(16,185,129,0.06)"
              : "rgba(239,68,68,0.06)",
            border: svc.ok
              ? "1px solid rgba(16,185,129,0.15)"
              : "1px solid rgba(239,68,68,0.15)",
          }}
        >
          {/* Status dot */}
          <span className="relative flex h-2.5 w-2.5">
            {svc.ok && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: "#10b981" }}
              />
            )}
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: svc.ok ? "#10b981" : "#ef4444" }}
            />
          </span>

          {/* Service name */}
          <span
            className="text-xs font-semibold"
            style={{ color: svc.ok ? "#f1f5f9" : "rgba(241,245,249,0.5)" }}
          >
            {svc.name}
          </span>

          {/* Status text + latency */}
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[10px] font-medium"
              style={{ color: svc.ok ? "#10b981" : "#ef4444" }}
            >
              {svc.ok ? "Operational" : "Down"}
            </span>
            <LatencyLabel ms={svc.latencyMs} />
          </div>
        </div>
      ))}
    </div>
  );
}
