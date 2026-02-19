"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { PlanBadge } from "@/components/admin/plan-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function AdminAcquisitionPage() {
  const { data: trend } = trpc.admin.acquisition.getSignupTrend.useQuery({ days: 30 });
  const { data: sources } = trpc.admin.acquisition.getSignupsBySource.useQuery();
  const { data: recent } = trpc.admin.acquisition.getRecentSignups.useQuery({ limit: 20 });
  const { data: ttfc } = trpc.admin.acquisition.getTimeToFirstCall.useQuery();

  type RecentRow = { id: string; name: string; planId: string; referralSource: string | null; createdAt: Date; _count: { users: number; calls: number } };
  const recentColumns: Column<RecentRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "referralSource", header: "Source", render: (r) => r.referralSource ?? "direct" },
    { key: "users", header: "Users", render: (r) => r._count.users },
    { key: "calls", header: "Calls", render: (r) => r._count.calls },
    { key: "createdAt", header: "Joined", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing & Acquisition</h1>
        <p className="text-muted-foreground text-sm">Signup trends and traffic sources</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Avg Hours to First Call" value={`${ttfc?.avgHoursToFirstCall ?? 0}h`} />
        <StatCard label="Traffic Sources" value={(sources?.length ?? 0).toString()} />
      </div>

      {/* Signup Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Signup Trend (30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader><CardTitle className="text-base">Signups by Source</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sources ?? []} layout="vertical" margin={{ left: 40, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={recentColumns}
            data={(recent ?? []) as RecentRow[]}
            getRowKey={(r) => r.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
