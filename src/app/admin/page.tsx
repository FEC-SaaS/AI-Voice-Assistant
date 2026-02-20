"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { SystemHealth } from "@/components/admin/system-health";
import { PlanBadge } from "@/components/admin/plan-badge";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Building2,
  Users,
  Phone,
  AlertTriangle,
  TrendingUp,
  Activity,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

const PLAN_COLORS: Record<string, string> = {
  "free-trial": "#475569",
  starter: "#3b82f6",
  professional: "#8b5cf6",
  business: "#10b981",
  enterprise: "#f59e0b",
};

const CHART_GRADIENT_ID = "signupGrad";
const CALLS_GRADIENT_ID = "callsGrad";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: "rgba(241,245,249,0.3)" }}
    >
      {children}
    </h2>
  );
}

function DarkCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: "1px solid rgba(99,102,241,0.1)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {title && (
        <h3
          className="mb-4 text-sm font-semibold"
          style={{ color: "rgba(241,245,249,0.7)" }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "#0c0c1e",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "12px",
  },
  labelStyle: { color: "rgba(241,245,249,0.5)" },
  cursor: { fill: "rgba(99,102,241,0.06)" },
};

export default function AdminCommandCenter() {
  const { data, isLoading } = trpc.admin.overview.getCommandCenter.useQuery();
  const { data: health, isLoading: healthLoading } =
    trpc.admin.system.getHealthChecks.useQuery(undefined, { refetchInterval: 60_000 });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ background: "#6366f1", animationDelay: "0ms" }}
        />
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ background: "#818cf8", animationDelay: "150ms" }}
        />
        <div
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ background: "#a5b4fc", animationDelay: "300ms" }}
        />
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-1 w-6 rounded-full"
              style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
            />
            <SectionTitle>Platform Overview</SectionTitle>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Command Center
          </h1>
        </div>
        <div
          className="rounded-xl px-3 py-1.5 text-xs font-medium"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.15)",
            color: "#818cf8",
          }}
        >
          <Activity className="mr-1.5 inline h-3 w-3" />
          Live
        </div>
      </div>

      {/* Alerts */}
      {(kpis?.paymentFailures ?? 0) > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">
              {kpis?.paymentFailures} payment failure{kpis?.paymentFailures !== 1 ? "s" : ""}{" "}
              require attention
            </p>
            <p className="text-xs" style={{ color: "rgba(239,68,68,0.6)" }}>
              Review affected organizations in the Revenue tab
            </p>
          </div>
        </div>
      )}
      {(kpis?.suspendedOrgs ?? 0) > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-amber-400">
            {kpis?.suspendedOrgs} organization{kpis?.suspendedOrgs !== 1 ? "s" : ""} currently
            suspended
          </p>
        </div>
      )}

      {/* KPI Grid */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
          />
          <SectionTitle>Key Metrics</SectionTitle>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Organizations"
            value={kpis?.totalOrgs ?? 0}
            icon={<Building2 />}
            accentColor="#6366f1"
          />
          <StatCard
            label="Active Orgs"
            value={kpis?.activeOrgs ?? 0}
            icon={<Building2 />}
            accentColor="#10b981"
            trend="neutral"
          />
          <StatCard
            label="New Orgs (30d)"
            value={kpis?.newOrgsLast30 ?? 0}
            icon={<TrendingUp />}
            accentColor="#3b82f6"
            trend="up"
          />
          <StatCard
            label="Total Users"
            value={kpis?.totalUsers ?? 0}
            icon={<Users />}
            accentColor="#8b5cf6"
          />
          <StatCard
            label="All-Time Calls"
            value={kpis?.totalCallsAllTime ?? 0}
            icon={<Phone />}
            accentColor="#06b6d4"
          />
          <StatCard
            label="Calls Today"
            value={kpis?.callsToday ?? 0}
            icon={<Zap />}
            accentColor="#f59e0b"
          />
          <StatCard
            label="Calls (7 days)"
            value={kpis?.callsLast7Days ?? 0}
            icon={<Phone />}
            accentColor="#6366f1"
          />
          <StatCard
            label="Suspended Orgs"
            value={kpis?.suspendedOrgs ?? 0}
            icon={<ShieldAlert />}
            accentColor={kpis?.suspendedOrgs ? "#ef4444" : "#475569"}
            trend={kpis?.suspendedOrgs ? "down" : "neutral"}
          />
        </div>
      </div>

      {/* System Health */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}
          />
          <SectionTitle>Service Health</SectionTitle>
        </div>
        <DarkCard>
          <SystemHealth services={health?.services ?? []} isLoading={healthLoading} />
          {health?.checkedAt && (
            <p className="mt-4 text-[10px]" style={{ color: "rgba(241,245,249,0.2)" }}>
              Checked at {format(new Date(health.checkedAt), "HH:mm:ss")}
            </p>
          )}
        </DarkCard>
      </div>

      {/* Charts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }}
          />
          <SectionTitle>Activity Trends</SectionTitle>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DarkCard title="Signups — Last 30 Days">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.signupsByDay ?? []}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => format(new Date(d), "MMM d")}
                  tick={{ fontSize: 10, fill: "rgba(241,245,249,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(241,245,249,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill={`url(#${CHART_GRADIENT_ID})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </DarkCard>

          <DarkCard title="Calls — Last 30 Days">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.callsByDay ?? []}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={CALLS_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => format(new Date(d), "MMM d")}
                  tick={{ fontSize: 10, fill: "rgba(241,245,249,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(241,245,249,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill={`url(#${CALLS_GRADIENT_ID})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </DarkCard>
        </div>
      </div>

      {/* Plan distribution + Recent signups */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
          />
          <SectionTitle>Distribution & Signups</SectionTitle>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DarkCard title="Plan Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.planDistribution ?? []}
                  dataKey="count"
                  nameKey="planId"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  label={({ planId, percent }) =>
                    `${planId} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: "rgba(241,245,249,0.2)" }}
                >
                  {(data?.planDistribution ?? []).map((entry) => (
                    <Cell
                      key={entry.planId}
                      fill={PLAN_COLORS[entry.planId] ?? "#334155"}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0c0c1e",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "10px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </DarkCard>

          <DarkCard title="Recent Signups">
            <div className="space-y-3">
              {(data?.recentSignups ?? []).length === 0 && (
                <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
                  No signups yet.
                </p>
              )}
              {(data?.recentSignups ?? []).map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.08)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                      {org.name}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(241,245,249,0.3)" }}>
                      {format(new Date(org.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <PlanBadge planId={org.planId} />
                </div>
              ))}
            </div>
          </DarkCard>
        </div>
      </div>
    </div>
  );
}
