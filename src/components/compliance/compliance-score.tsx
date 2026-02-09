"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

interface ComplianceScoreProps {
  score: number | undefined;
  isLoading: boolean;
}

function getScoreColor(score: number): {
  stroke: string;
  text: string;
  bg: string;
  label: string;
} {
  if (score >= 80) {
    return {
      stroke: "stroke-green-500",
      text: "text-green-400",
      bg: "bg-green-500/10",
      label: "Excellent",
    };
  }
  if (score >= 60) {
    return {
      stroke: "stroke-yellow-500",
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
      label: "Needs Improvement",
    };
  }
  return {
    stroke: "stroke-red-500",
    text: "text-red-400",
    bg: "bg-red-500/10",
    label: "At Risk",
  };
}

export function ComplianceScore({ score, isLoading }: ComplianceScoreProps) {
  const displayScore = score ?? 0;
  const colors = getScoreColor(displayScore);

  // SVG circle math
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = isLoading ? 0 : (displayScore / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4">
          {isLoading ? (
            <div className="flex h-[180px] w-[180px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="relative">
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  className="-rotate-90"
                >
                  {/* Background circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/20"
                  />
                  {/* Progress circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className={cn(
                      colors.stroke,
                      "transition-[stroke-dashoffset] duration-1000 ease-out"
                    )}
                  />
                </svg>
                {/* Score text in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-4xl font-bold", colors.text)}>
                    {displayScore}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div
                className={cn(
                  "mt-4 rounded-full px-3 py-1 text-xs font-semibold",
                  colors.bg,
                  colors.text
                )}
              >
                {colors.label}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
