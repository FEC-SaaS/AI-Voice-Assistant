"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { Phone, Clock, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  "in-progress": "#3b82f6",
  failed: "#ef4444",
  "no-answer": "#f59e0b",
  ringing: "#8b5cf6",
};

export default function AdminCallsPage() {
  const { data: stats } = trpc.admin.calls.getPlatformCallStats.useQuery();
  const { data: byDay } = trpc.admin.calls.getCallsByDay.useQuery({ days: 30 });
  const { data: byHour } = trpc.admin.calls.getCallsByHour.useQuery();
  const { data: topOrgs } = trpc.admin.calls.getTopOrgsByCallVolume.useQuery({ limit: 10 });

  type TopOrgRow = { orgId: string; orgName: string; count: number; minutes: number };
  const topOrgColumns: Column<TopOrgRow>[] = [
    { key: "orgName", header: "Organization" },
    { key: "count", header: "Total Calls", render: (r) => r.count.toLocaleString() },
    { key: "minutes", header: "Minutes", render: (r) => r.minutes.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Call & Voice Activity</h1>
        <p className="text-muted-foreground text-sm">Platform-wide call statistics</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Calls" value={(stats?.total ?? 0).toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Calls Today" value={(stats?.today ?? 0).toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Calls (7d)" value={(stats?.last7 ?? 0).toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Total Minutes" value={(stats?.totalMinutes ?? 0).toLocaleString()} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Calls (30d)" value={(stats?.last30 ?? 0).toLocaleString()} />
        <StatCard label="Avg Duration" value={`${stats?.avgDurationSeconds ?? 0}s`} />
      </div>

      {/* Daily Volume */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily Call Volume (30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 24h Heatmap */}
        <Card>
          <CardHeader><CardTitle className="text-base">Calls by Hour of Day (7d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byHour ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Call Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.statusBreakdown ?? []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {(stats?.statusBreakdown ?? []).map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Orgs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Organizations by Call Volume</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={topOrgColumns}
            data={(topOrgs ?? []) as TopOrgRow[]}
            getRowKey={(r) => r.orgId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
