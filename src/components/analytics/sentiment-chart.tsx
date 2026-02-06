"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface SentimentData {
  sentiment: string | null;
  count: number;
}

interface SentimentChartProps {
  data: SentimentData[] | undefined;
  isLoading: boolean;
}

const COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#9ca3af",
  negative: "#ef4444",
};

const LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function SentimentChart({ data, isLoading }: SentimentChartProps) {
  const chartData = ["positive", "neutral", "negative"].map((key) => ({
    name: LABELS[key],
    value: data?.find((s) => s.sentiment === key)?.count || 0,
    color: COLORS[key],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : total === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4">No sentiment data yet</p>
              <p className="text-sm">Sentiment analysis will appear here</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${value} (${Math.round((value / total) * 100)}%)`,
                    "Calls",
                  ]}
                />
                <Legend
                  formatter={(value: string) => {
                    const item = chartData.find((d) => d.name === value);
                    return `${value}: ${item?.value || 0} (${
                      total > 0
                        ? Math.round(((item?.value || 0) / total) * 100)
                        : 0
                    }%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground">
              Based on {total} analyzed calls
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
