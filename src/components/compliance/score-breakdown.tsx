"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Info } from "lucide-react";

interface BreakdownItem {
  category: string;
  weight: number;
  score: number;
  maxScore: number;
  recommendation: string;
}

interface ScoreBreakdownProps {
  breakdown: BreakdownItem[] | undefined;
  isLoading: boolean;
}

function getBarColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getBarTextColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function ScoreBreakdown({ breakdown, isLoading }: ScoreBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Score Breakdown</CardTitle>
        <CardDescription>
          Compliance score by category with recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !breakdown?.length ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            No breakdown data available
          </div>
        ) : (
          <div className="space-y-5">
            {breakdown.map((item) => {
              const pct =
                item.maxScore > 0
                  ? Math.round((item.score / item.maxScore) * 100)
                  : 0;

              return (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.category}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {item.weight}% weight
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        getBarTextColor(item.score, item.maxScore)
                      )}
                    >
                      {item.score}/{item.maxScore}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        getBarColor(item.score, item.maxScore)
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* Recommendation */}
                  {item.recommendation && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{item.recommendation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
