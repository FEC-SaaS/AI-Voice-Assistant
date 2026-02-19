import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  "free-trial": { label: "Free Trial", className: "bg-slate-100 text-slate-700 border-slate-200" },
  starter: { label: "Starter", className: "bg-blue-100 text-blue-700 border-blue-200" },
  professional: { label: "Professional", className: "bg-purple-100 text-purple-700 border-purple-200" },
  enterprise: { label: "Enterprise", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

interface PlanBadgeProps {
  planId: string;
  className?: string;
}

export function PlanBadge({ planId, className }: PlanBadgeProps) {
  const config = PLAN_CONFIG[planId] ?? { label: planId, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
