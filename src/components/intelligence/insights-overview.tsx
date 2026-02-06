"use client";

import { BarChart3, Target, Users, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InsightsData {
  totalAnalyzedCalls: number;
  avgCloseProbability: number;
  totalCompetitorMentions: number;
  totalBuyingSignals: number;
  topCompetitors: Array<{ name: string; count: number }>;
  topObjectionCategories: Array<{ category: string; count: number }>;
}

interface InsightsOverviewProps {
  data: InsightsData | undefined;
  isLoading: boolean;
}

function getCloseProbabilityColor(value: number): string {
  if (value >= 60) return "text-green-600";
  if (value >= 40) return "text-yellow-600";
  return "text-red-600";
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  valueClassName?: string;
  subtitle?: string;
  isLoading: boolean;
}

function MetricCard({
  title,
  icon,
  value,
  valueClassName,
  subtitle,
  isLoading,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className={cn("text-2xl font-bold", valueClassName)}>
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function InsightsOverview({ data, isLoading }: InsightsOverviewProps) {
  const avgClose = data?.avgCloseProbability ?? 0;

  return (
    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Analyzed Calls"
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        value={data?.totalAnalyzedCalls ?? 0}
        subtitle="Calls processed by AI"
        isLoading={isLoading}
      />
      <MetricCard
        title="Avg Close Probability"
        icon={<Target className="h-4 w-4 text-muted-foreground" />}
        value={`${avgClose.toFixed(1)}%`}
        valueClassName={getCloseProbabilityColor(avgClose)}
        subtitle={
          avgClose >= 60
            ? "Strong pipeline"
            : avgClose >= 40
              ? "Moderate pipeline"
              : "Needs attention"
        }
        isLoading={isLoading}
      />
      <MetricCard
        title="Competitor Mentions"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        value={data?.totalCompetitorMentions ?? 0}
        subtitle="Across all analyzed calls"
        isLoading={isLoading}
      />
      <MetricCard
        title="Buying Signals Detected"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        value={data?.totalBuyingSignals ?? 0}
        subtitle="Opportunities identified"
        isLoading={isLoading}
      />
    </div>
  );
}
