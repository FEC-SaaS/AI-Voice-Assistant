import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;       // positive = good, negative = bad
  deltaLabel?: string;  // e.g. "vs last month"
  icon?: React.ReactNode;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, delta, deltaLabel, icon, className, trend }: StatCardProps) {
  const deltaDir = delta !== undefined ? (delta > 0 ? "up" : delta < 0 ? "down" : "neutral") : trend;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(delta !== undefined || deltaLabel) && (
          <div className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            deltaDir === "up" && "text-green-600",
            deltaDir === "down" && "text-destructive",
            deltaDir === "neutral" && "text-muted-foreground",
          )}>
            {deltaDir === "up" && <TrendingUp className="h-3 w-3" />}
            {deltaDir === "down" && <TrendingDown className="h-3 w-3" />}
            {deltaDir === "neutral" && <Minus className="h-3 w-3" />}
            {delta !== undefined && (
              <span>{delta > 0 ? "+" : ""}{typeof delta === "number" ? delta.toLocaleString() : delta}</span>
            )}
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
