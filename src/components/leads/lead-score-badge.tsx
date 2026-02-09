"use client";

import { cn } from "@/lib/utils";

interface LeadScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

export function LeadScoreBadge({ score, size = "sm" }: LeadScoreBadgeProps) {
  const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";

  const getColorClasses = (score: number | null) => {
    if (score === null || score === undefined) {
      return "bg-secondary text-muted-foreground border-border";
    }
    if (score >= 70) {
      return "bg-green-100 text-green-400 border-green-300";
    }
    if (score >= 40) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
    return "bg-red-100 text-red-400 border-red-300";
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-semibold",
        sizeClasses,
        getColorClasses(score)
      )}
      title={score !== null ? `Lead score: ${score}` : "Unscored"}
    >
      {score !== null ? score : "\u2014"}
    </div>
  );
}
