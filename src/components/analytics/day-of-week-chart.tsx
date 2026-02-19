"use client";

import { Loader2, Calendar } from "lucide-react";
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

interface DayData {
  day: string;
  calls: number;
  completed: number;
  successRate: number;
}

interface DayOfWeekChartProps {
  data: DayData[] | undefined;
  isLoading: boolean;
}

export function DayOfWeekChart({ data, isLoading }: DayOfWeekChartProps) {
  const hasData = data?.some((d) => d.calls > 0);
  const maxCalls = data ? Math.max(...data.map((d) => d.calls), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Best Days to Call
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
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4">No data yet</p>
              <p className="text-sm">Make calls to see day-of-week patterns</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as DayData;
                      return (
                        <div className="rounded-lg border bg-background p-2 text-xs shadow-lg">
                          <p className="font-semibold">{d.day}</p>
                          <p>Total Calls: {d.calls}</p>
                          <p>Completed: {d.completed}</p>
                          <p>Success Rate: {d.successRate}%</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="calls" radius={[4, 4, 0, 0]} name="Calls">
                    {data?.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.calls === maxCalls ? "#22c55e" : "#3b82f6"}
                        opacity={entry.calls === 0 ? 0.25 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
                Peak day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" />
                Other days
              </span>
              {data && (
                <span className="ml-auto font-medium text-foreground">
                  Best: {data.length > 0 ? data.reduce((best, d) => (d.calls > (best?.calls ?? 0) ? d : best), data[0])?.day : "—"}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
