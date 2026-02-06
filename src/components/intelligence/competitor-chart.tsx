"use client";

import { Users } from "lucide-react";
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

interface CompetitorChartProps {
  competitors: Array<{ name: string; count: number }> | undefined;
}

const BAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#06b6d4",
  "#84cc16",
];

export function CompetitorChart({ competitors }: CompetitorChartProps) {
  const hasData = competitors && competitors.length > 0;

  const chartData = (competitors ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((c) => ({
      name: c.name,
      mentions: c.count,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Competitor Mentions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4">No competitor data yet</p>
              <p className="text-sm">
                Competitor mentions will appear as calls are analyzed
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Mentions"]}
                  cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                />
                <Bar dataKey="mentions" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
