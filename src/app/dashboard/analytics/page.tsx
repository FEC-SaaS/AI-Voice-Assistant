"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Phone,
  Clock,
  Users,
  Megaphone,
  Loader2,
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
import { SentimentChart } from "@/components/analytics/sentiment-chart";
import { PerformanceTable } from "@/components/analytics/performance-table";
import { TrendChart } from "@/components/analytics/trend-chart";
import { HourlyChart } from "@/components/analytics/hourly-chart";
import { ExportButton } from "@/components/analytics/export-button";
import { PDFExportButton } from "@/components/analytics/pdf-export-button";
import { ReportBuilder } from "@/components/analytics/report-builder";

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30");
  const days = parseInt(dateRange);

  // Calculate date range - memoized to prevent infinite query re-fetching
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, [days]);

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

  const { data: trendData, isLoading: loadingTrends } = trpc.analytics.getCallTrends.useQuery({
    days,
  });

  const { data: hourlyData, isLoading: loadingHourly } = trpc.analytics.getHourlyDistribution.useQuery({
    days,
  });

  // Calculate max calls for chart scaling
  const maxCalls = callsByDay?.reduce((max, day) => Math.max(max, day.count), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Track performance and insights across your AI agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PDFExportButton startDate={startDate} endDate={endDate} days={days} />
          <ExportButton startDate={startDate} endDate={endDate} />
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

      {/* Charts Row 1: Calls Over Time + Sentiment */}
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
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/70" />
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
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
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

        {/* Sentiment Chart */}
        <SentimentChart data={sentiment} isLoading={loadingSentiment} />
      </div>

      {/* Charts Row 2: Trends + Hourly */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart data={trendData} isLoading={loadingTrends} />
        <HourlyChart data={hourlyData} isLoading={loadingHourly} />
      </div>

      {/* Agent Performance Table */}
      <PerformanceTable data={agentPerformance} isLoading={loadingAgents} />

      {/* Custom Report Builder */}
      <ReportBuilder />
    </div>
  );
}
