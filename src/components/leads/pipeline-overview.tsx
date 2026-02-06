"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineData {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  unscored: number;
}

interface PipelineOverviewProps {
  data: PipelineData | undefined;
  isLoading: boolean;
}

const BUCKETS = [
  {
    key: "unscored" as const,
    label: "Unscored",
    color: "bg-gray-400",
    lightColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  {
    key: "cold" as const,
    label: "Cold",
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-700",
  },
  {
    key: "warm" as const,
    label: "Warm",
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  {
    key: "hot" as const,
    label: "Hot",
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-700",
  },
];

export function PipelineOverview({ data, isLoading }: PipelineOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Lead Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data?.total || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Lead Pipeline</CardTitle>
          <span className="text-sm text-muted-foreground">
            {total} total leads
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Full-width segmented bar */}
        {total > 0 && (
          <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
            {BUCKETS.map((bucket) => {
              const count = data?.[bucket.key] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={bucket.key}
                  className={cn("transition-all", bucket.color)}
                  style={{ width: `${pct}%` }}
                  title={`${bucket.label}: ${count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
        )}

        {/* Bucket cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {BUCKETS.map((bucket) => {
            const count = data?.[bucket.key] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={bucket.key}
                className={cn(
                  "flex flex-col items-center rounded-lg p-3",
                  bucket.lightColor
                )}
              >
                <span
                  className={cn("text-2xl font-bold", bucket.textColor)}
                >
                  {count}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {bucket.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
