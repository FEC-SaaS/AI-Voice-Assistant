"use client";

import { Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HourlyData {
  hour: number;
  calls: number;
}

interface HourlyChartProps {
  data: HourlyData[] | undefined;
  isLoading: boolean;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  return hour < 12 ? `${hour}AM` : `${hour - 12}PM`;
}

export function HourlyChart({ data, isLoading }: HourlyChartProps) {
  const hasData = data && data.some((d) => d.calls > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Calls by Hour of Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex h-[300px] items-center justify-center text-gray-500">
            <div className="text-center">
              <Clock className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4">No hourly data yet</p>
              <p className="text-sm">Make some calls to see peak hours</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  fontSize={11}
                  tickFormatter={formatHour}
                  interval={2}
                />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label: number) => formatHour(label)}
                  formatter={(value: number) => [`${value} calls`, "Calls"]}
                />
                <Bar
                  dataKey="calls"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
