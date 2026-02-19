"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { SystemHealth } from "@/components/admin/system-health";
import { PlanBadge } from "@/components/admin/plan-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Building2, Users, Phone, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const PLAN_COLORS: Record<string, string> = {
  "free-trial": "#94a3b8",
  starter: "#60a5fa",
  professional: "#a78bfa",
  enterprise: "#fbbf24",
};

export default function AdminCommandCenter() {
  const { data, isLoading } = trpc.admin.overview.getCommandCenter.useQuery();
  const { data: health, isLoading: healthLoading } = trpc.admin.system.getHealthChecks.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading command center…
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Command Center</h1>
        <p className="text-muted-foreground text-sm">Platform-wide overview</p>
      </div>

      {/* Alerts */}
      {(kpis?.paymentFailures ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-sm text-destructive font-medium">
            {kpis?.paymentFailures} organization(s) have payment failures requiring attention.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Organizations" value={(kpis?.totalOrgs ?? 0).toLocaleString()} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Active Orgs" value={(kpis?.activeOrgs ?? 0).toLocaleString()} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="New Orgs (30d)" value={(kpis?.newOrgsLast30 ?? 0).toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <StatCard label="Total Users" value={(kpis?.totalUsers ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Calls" value={(kpis?.totalCallsAllTime ?? 0).toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Calls Today" value={(kpis?.callsToday ?? 0).toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Calls (7d)" value={(kpis?.callsLast7Days ?? 0).toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Suspended Orgs" value={(kpis?.suspendedOrgs ?? 0).toLocaleString()} icon={<AlertTriangle className="h-4 w-4" />} trend={kpis?.suspendedOrgs ? "down" : "neutral"} />
      </div>

      {/* System Health */}
      <Card>
        <CardHeader><CardTitle className="text-base">External Service Health</CardTitle></CardHeader>
        <CardContent>
          <SystemHealth services={health?.services ?? []} isLoading={healthLoading} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Signups (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.signupsByDay ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Calls (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.callsByDay ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution + Recent Signups */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Plan Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.planDistribution ?? []}
                  dataKey="count"
                  nameKey="planId"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ planId, percent }) => `${planId} ${(percent * 100).toFixed(0)}%`}
                >
                  {(data?.planDistribution ?? []).map((entry) => (
                    <Cell key={entry.planId} fill={PLAN_COLORS[entry.planId] ?? "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recentSignups ?? []).map((org) => (
                <div key={org.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(org.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <PlanBadge planId={org.planId} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
