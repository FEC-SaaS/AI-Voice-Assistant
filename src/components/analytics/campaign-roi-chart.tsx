"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CampaignROIData {
  name: string;
  fullName: string;
  status: string;
  totalContacts: number;
  totalCalls: number;
  completedCalls: number;
  conversionRate: number;
  totalMinutes: number;
  totalCostDollars: number;
  costPerCompletion: number;
}

interface CampaignROIChartProps {
  data: CampaignROIData[] | undefined;
  isLoading: boolean;
}

export function CampaignROIChart({ data, isLoading }: CampaignROIChartProps) {
  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Campaign Performance &amp; Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4">No campaign call data yet</p>
              <p className="text-sm">Run campaigns to see performance &amp; cost analysis</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as CampaignROIData;
                      return (
                        <div className="rounded-lg border bg-background p-3 text-xs shadow-lg space-y-0.5">
                          <p className="font-semibold mb-1">{d.fullName}</p>
                          <p>Total Calls: {d.totalCalls}</p>
                          <p>Completed: {d.completedCalls}</p>
                          <p>Conversion: {d.conversionRate}%</p>
                          <p>Minutes Used: {d.totalMinutes}</p>
                          <p>Total Cost: ${d.totalCostDollars.toFixed(2)}</p>
                          {d.costPerCompletion > 0 && (
                            <p>Cost / Completion: ${d.costPerCompletion.toFixed(2)}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="totalCalls"
                    name="Total Calls"
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="completedCalls"
                    name="Completed"
                    fill="#22c55e"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1.5 text-left font-medium">Campaign</th>
                    <th className="pb-1.5 text-right font-medium">Conv. Rate</th>
                    <th className="pb-1.5 text-right font-medium">Cost</th>
                    <th className="pb-1.5 text-right font-medium">$/Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1.5 pr-2 truncate max-w-[140px]" title={row.fullName}>
                        {row.name}
                      </td>
                      <td className="py-1.5 text-right">
                        <span
                          className={
                            row.conversionRate >= 50
                              ? "text-green-400"
                              : row.conversionRate >= 25
                                ? "text-yellow-400"
                                : "text-red-400"
                          }
                        >
                          {row.conversionRate}%
                        </span>
                      </td>
                      <td className="py-1.5 text-right">${row.totalCostDollars.toFixed(2)}</td>
                      <td className="py-1.5 text-right">
                        {row.costPerCompletion > 0 ? `$${row.costPerCompletion.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
