"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

interface ViolationAlert {
  action: string;
  entityType: string;
  details: unknown;
  createdAt: string | Date;
}

interface DncViolationsProps {
  alerts: ViolationAlert[] | undefined;
  isLoading: boolean;
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHrs > 0) return `${diffHrs}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

function getActionVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  const lower = action.toLowerCase();
  if (lower.includes("violation") || lower.includes("block") || lower.includes("error")) {
    return "destructive";
  }
  if (lower.includes("warn") || lower.includes("alert")) {
    return "secondary";
  }
  return "outline";
}

export function DncViolations({ alerts, isLoading }: DncViolationsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Recent Violations
        </CardTitle>
        {alerts && alerts.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {alerts.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !alerts?.length ? (
          <div className="flex h-[240px] flex-col items-center justify-center text-muted-foreground">
            <ShieldCheck className="mb-2 h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">No recent violations</p>
            <p className="mt-1 text-xs">Your compliance looks great!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getActionVariant(alert.action)}
                      className="text-xs"
                    >
                      {alert.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.entityType}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground line-clamp-2">
                    {typeof alert.details === "string"
                      ? alert.details
                      : JSON.stringify(alert.details)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTimeAgo(alert.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
