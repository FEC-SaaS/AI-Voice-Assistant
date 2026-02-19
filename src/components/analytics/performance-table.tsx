"use client";

import { useState } from "react";
import {
  Loader2,
  Users,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

// ── Per-agent sentiment mini pie chart ──────────────────────────────
function SentimentMiniChart({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No sentiment data for this agent yet.</p>
    );
  }

  const pieData = [
    { name: "Positive", value: positive, color: "#22c55e" },
    { name: "Neutral", value: neutral, color: "#9ca3af" },
    { name: "Negative", value: negative, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-6 py-2">
      <div className="h-[100px] w-[100px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={26}
              outerRadius={46}
              strokeWidth={0}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [
                `${v} (${Math.round((v / total) * 100)}%)`,
                "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-muted-foreground">{d.name}:</span>
            <span className="font-medium">
              {d.value}{" "}
              <span className="text-muted-foreground">
                ({Math.round((d.value / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">{total} calls scored</p>
      </div>
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────
export function PerformanceTable({ data, isLoading }: PerformanceTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

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
                  <th className="pb-3 w-6" />
                  <th className="pb-3 pr-4">Agent</th>
                  <th className="pb-3 pr-4 text-right">Calls</th>
                  <th className="pb-3 pr-4 text-right">Success Rate</th>
                  <th className="pb-3 pr-4 text-right">Minutes</th>
                  <th className="pb-3 text-right">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((agent) => (
                  <>
                    <tr
                      key={agent.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggle(agent.id)}
                    >
                      <td className="py-3 pr-2 text-muted-foreground">
                        {expandedId === agent.id ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="py-3 pr-4 font-medium">{agent.name}</td>
                      <td className="py-3 pr-4 text-right">{agent.totalCalls}</td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            agent.successRate >= 70
                              ? "bg-green-500/20 text-green-400"
                              : agent.successRate >= 40
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
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

                    {/* Expandable per-agent sentiment breakdown */}
                    {expandedId === agent.id && (
                      <tr key={`${agent.id}-detail`}>
                        <td colSpan={6} className="pb-3 px-4 bg-muted/30">
                          <div className="pt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                              Sentiment breakdown — {agent.name}
                            </p>
                            <SentimentMiniChart
                              positive={agent.sentimentCounts.positive}
                              neutral={agent.sentimentCounts.neutral}
                              negative={agent.sentimentCounts.negative}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Click a row to expand per-agent sentiment breakdown.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
