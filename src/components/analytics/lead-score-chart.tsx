"use client";

import { Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScoreBucket {
  range: string;
  count: number;
  color: string;
}

interface LeadScoreChartProps {
  data: ScoreBucket[] | undefined;
  isLoading: boolean;
}

export function LeadScoreChart({ data, isLoading }: LeadScoreChartProps) {
  const total = data?.reduce((s, b) => s + b.count, 0) ?? 0;
  const hasData = total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Lead Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4">No scored calls yet</p>
              <p className="text-sm">Lead scores appear after calls complete</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 5, right: 10, left: 0, bottom: 45 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="range"
                    fontSize={10}
                    angle={-28}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value} call${value === 1 ? "" : "s"} (${
                        total > 0 ? Math.round((value / total) * 100) : 0
                      }%)`,
                      "Count",
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data?.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              {total.toLocaleString()} scored call{total === 1 ? "" : "s"} total
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
