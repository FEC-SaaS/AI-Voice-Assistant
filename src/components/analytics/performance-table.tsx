"use client";

import { Loader2, Users, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgentPerformance {
  id: string;
  name: string;
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  totalMinutes: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface PerformanceTableProps {
  data: AgentPerformance[] | undefined;
  isLoading: boolean;
}

export function PerformanceTable({ data, isLoading }: PerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agent Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4">No agents yet</p>
              <p className="text-sm">Create an agent to see performance data</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="pb-3 pr-4">Agent</th>
                  <th className="pb-3 pr-4 text-right">Calls</th>
                  <th className="pb-3 pr-4 text-right">Success Rate</th>
                  <th className="pb-3 pr-4 text-right">Minutes</th>
                  <th className="pb-3 text-right">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/50">
                    <td className="py-3 pr-4 font-medium">{agent.name}</td>
                    <td className="py-3 pr-4 text-right">{agent.totalCalls}</td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          agent.successRate >= 70
                            ? "bg-green-100 text-green-400"
                            : agent.successRate >= 40
                            ? "bg-yellow-100 text-yellow-400"
                            : "bg-red-100 text-red-400"
                        }`}
                      >
                        {agent.successRate}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">{agent.totalMinutes}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {agent.sentimentCounts.positive > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <ThumbsUp className="h-3 w-3" />
                            {agent.sentimentCounts.positive}
                          </span>
                        )}
                        {agent.sentimentCounts.neutral > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Minus className="h-3 w-3" />
                            {agent.sentimentCounts.neutral}
                          </span>
                        )}
                        {agent.sentimentCounts.negative > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <ThumbsDown className="h-3 w-3" />
                            {agent.sentimentCounts.negative}
                          </span>
                        )}
                        {agent.totalCalls === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
