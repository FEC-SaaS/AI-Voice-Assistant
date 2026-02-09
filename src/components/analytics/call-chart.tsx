"use client";

import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CallDay {
  date: string;
  count: number;
}

interface CallChartProps {
  data: CallDay[] | undefined;
  isLoading: boolean;
  days: number;
}

export function CallChart({ data, isLoading, days }: CallChartProps) {
  const maxCalls =
    data?.reduce((max, day) => Math.max(max, day.count), 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Calls Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length || data.every((d) => d.count === 0) ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4">No calls in this period</p>
              <p className="text-sm">Make some calls to see trends</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px]">
            <div className="flex h-full flex-col">
              <div className="flex flex-1 items-end gap-1">
                {data.slice(-Math.min(days, 30)).map((day) => (
                  <div
                    key={day.date}
                    className="group relative flex-1"
                    title={`${day.date}: ${day.count} calls`}
                  >
                    <div
                      className="w-full rounded-t bg-primary transition-all hover:bg-primary/80"
                      style={{
                        height: `${Math.max(
                          (day.count / maxCalls) * 100,
                          day.count > 0 ? 5 : 0
                        )}%`,
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
                <span>{data[0]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
