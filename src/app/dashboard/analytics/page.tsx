"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Phone,
  Clock,
  Users,
  Megaphone,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30");
  const days = parseInt(dateRange);

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch analytics data
  const { data: overview, isLoading: loadingOverview } = trpc.analytics.getOverview.useQuery({
    startDate,
    endDate,
  });

  const { data: callsByDay, isLoading: loadingCallsByDay } = trpc.analytics.getCallsByDay.useQuery({
    days,
  });

  const { data: sentiment, isLoading: loadingSentiment } = trpc.analytics.getSentimentBreakdown.useQuery({
    startDate,
    endDate,
  });

  const { data: agentPerformance, isLoading: loadingAgents } = trpc.analytics.getAgentPerformance.useQuery();

  // Calculate max calls for chart scaling
  const maxCalls = callsByDay?.reduce((max, day) => Math.max(max, day.count), 0) || 1;

  // Calculate sentiment totals
  const sentimentData = {
    positive: sentiment?.find((s) => s.sentiment === "positive")?.count || 0,
    neutral: sentiment?.find((s) => s.sentiment === "neutral")?.count || 0,
    negative: sentiment?.find((s) => s.sentiment === "negative")?.count || 0,
  };
  const totalSentiment = sentimentData.positive + sentimentData.neutral + sentimentData.negative;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">
            Track performance and insights across your AI agents
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.calls.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.calls.completed || 0} completed ({overview?.calls.successRate || 0}% success)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.minutes.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {overview?.minutes.avgPerCall || 0} min per call
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.agents.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {overview?.agents.total || 0} total agents
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.campaigns.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {overview?.campaigns.total || 0} total campaigns
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calls Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Calls Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCallsByDay ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !callsByDay?.length || callsByDay.every((d) => d.count === 0) ? (
              <div className="flex h-[300px] items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">No calls in this period</p>
                  <p className="text-sm">Make some calls to see trends</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]">
                {/* Simple bar chart */}
                <div className="flex h-full flex-col">
                  <div className="flex flex-1 items-end gap-1">
                    {callsByDay.slice(-Math.min(days, 30)).map((day) => (
                      <div
                        key={day.date}
                        className="group relative flex-1"
                        title={`${day.date}: ${day.count} calls`}
                      >
                        <div
                          className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                          style={{
                            height: `${Math.max((day.count / maxCalls) * 100, day.count > 0 ? 5 : 0)}%`,
                            minHeight: day.count > 0 ? "4px" : "0",
                          }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {day.count}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{callsByDay[0]?.date}</span>
                    <span>{callsByDay[callsByDay.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSentiment ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : totalSentiment === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-gray-500">
                <div className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">No sentiment data yet</p>
                  <p className="text-sm">Sentiment analysis will appear here</p>
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] flex-col justify-center space-y-6">
                {/* Sentiment bars */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        Positive
                      </span>
                      <span className="font-medium">{sentimentData.positive} ({Math.round((sentimentData.positive / totalSentiment) * 100)}%)</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${(sentimentData.positive / totalSentiment) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-gray-500" />
                        Neutral
                      </span>
                      <span className="font-medium">{sentimentData.neutral} ({Math.round((sentimentData.neutral / totalSentiment) * 100)}%)</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-400 transition-all"
                        style={{ width: `${(sentimentData.neutral / totalSentiment) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        Negative
                      </span>
                      <span className="font-medium">{sentimentData.negative} ({Math.round((sentimentData.negative / totalSentiment) * 100)}%)</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${(sentimentData.negative / totalSentiment) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Based on {totalSentiment} analyzed calls
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAgents ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !agentPerformance?.length ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
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
                  {agentPerformance.map((agent) => (
                    <tr key={agent.id} className="hover:bg-muted/50">
                      <td className="py-3 pr-4 font-medium">{agent.name}</td>
                      <td className="py-3 pr-4 text-right">{agent.totalCalls}</td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            agent.successRate >= 70
                              ? "bg-green-100 text-green-700"
                              : agent.successRate >= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {agent.successRate}%
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">{agent.totalMinutes}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {agent.sentimentCounts.positive > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <ThumbsUp className="h-3 w-3" />
                              {agent.sentimentCounts.positive}
                            </span>
                          )}
                          {agent.sentimentCounts.neutral > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Minus className="h-3 w-3" />
                              {agent.sentimentCounts.neutral}
                            </span>
                          )}
                          {agent.sentimentCounts.negative > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
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
    </div>
  );
}
