"use client";

import { Zap, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

interface BuyingSignalAlert {
  callId: string;
  leadScore: number | null;
  sentiment: string | null;
  buyingSignals: string[];
  nextBestAction: string | null;
  closeProbability: number | null;
  contactName: string | null;
  contactCompany: string | null;
  contactPhone: string | null;
  agentName: string | null;
  createdAt: string | Date;
}

interface BuyingSignalsFeedProps {
  alerts: BuyingSignalAlert[] | undefined;
}

function getLeadScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-secondary text-foreground border-border";
}

function getLeadScoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 40) return "Moderate";
  return "Cold";
}

export function BuyingSignalsFeed({ alerts }: BuyingSignalsFeedProps) {
  const hasData = alerts && alerts.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Buying Signal Alerts
        </CardTitle>
        <CardDescription>
          Recent calls with strong buying intent detected by AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground/70" />
              <p className="mt-4">No buying signal alerts</p>
              <p className="text-sm">
                Alerts will appear when AI detects strong buying intent
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.callId}
                className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                {/* Top row: contact info + lead score */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">
                        {alert.contactName}
                      </h4>
                      <Badge
                        className={cn(
                          "shrink-0",
                          getLeadScoreColor(alert.leadScore ?? 0)
                        )}
                      >
                        {getLeadScoreLabel(alert.leadScore ?? 0)} ({alert.leadScore ?? 0})
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {alert.contactCompany && (
                        <span>{alert.contactCompany}</span>
                      )}
                      {alert.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {alert.contactPhone}
                        </span>
                      )}
                      <span>Agent: {alert.agentName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">
                      {alert.closeProbability}% close
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(alert.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Buying signals tags */}
                {alert.buyingSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {alert.buyingSignals.map((signal, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs bg-purple-500/10 text-purple-400 border-purple-200"
                      >
                        {signal}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Next best action */}
                {alert.nextBestAction && (
                  <div className="text-sm bg-blue-500/10 text-blue-800 rounded-md px-3 py-2">
                    <span className="font-medium">Next action:</span>{" "}
                    {alert.nextBestAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
