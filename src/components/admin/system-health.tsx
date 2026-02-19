"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceStatus {
  name: string;
  ok: boolean;
  latencyMs: number;
}

interface SystemHealthProps {
  services: ServiceStatus[];
  isLoading?: boolean;
}

export function SystemHealth({ services, isLoading }: SystemHealthProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking services…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {services.map((svc) => (
        <div
          key={svc.name}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
            svc.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {svc.ok ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {svc.name}
          <span className="text-xs opacity-70">{svc.latencyMs}ms</span>
        </div>
      ))}
    </div>
  );
}
