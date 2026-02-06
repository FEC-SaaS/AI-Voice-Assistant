"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextActionCardProps {
  action: string | null;
  contactName?: string;
}

export function NextActionCard({ action, contactName }: NextActionCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3",
        action
          ? "border-purple-200 bg-purple-50"
          : "border-gray-200 bg-gray-50"
      )}
    >
      <Sparkles
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          action ? "text-purple-500" : "text-gray-400"
        )}
      />
      <div className="min-w-0 flex-1">
        {contactName && (
          <p
            className={cn(
              "text-xs font-medium",
              action ? "text-purple-700" : "text-gray-500"
            )}
          >
            {contactName}
          </p>
        )}
        <p
          className={cn(
            "text-sm",
            action ? "text-purple-900" : "text-gray-400 italic"
          )}
        >
          {action || "No recommended action"}
        </p>
      </div>
    </div>
  );
}
