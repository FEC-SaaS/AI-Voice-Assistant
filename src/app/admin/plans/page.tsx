"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { PlanBadge } from "@/components/admin/plan-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";

const PLAN_COLORS: Record<string, string> = {
  "free-trial": "#94a3b8",
  starter: "#60a5fa",
  professional: "#a78bfa",
  business: "#10b981",
  enterprise: "#fbbf24",
};

export default function AdminPlansPage() {
  const { data: dist } = trpc.admin.plans.getPlanDistribution.useQuery();
  const { data: funnel } = trpc.admin.plans.getConversionFunnel.useQuery();
  const { data: trend } = trpc.admin.plans.getPlanTrend.useQuery();
  const { data: trials } = trpc.admin.plans.getExpiringTrials.useQuery();

  type TrialRow = { id: string; name: string; planId: string; trialExpiresAt: Date | null; createdAt: Date };
  const trialColumns: Column<TrialRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "trialExpiresAt", header: "Expires", render: (r) => r.trialExpiresAt ? format(new Date(r.trialExpiresAt), "MMM d, yyyy") : "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan & Subscription Analytics</h1>
        <p className="text-muted-foreground text-sm">Distribution, conversion, and trial management</p>
      </div>

      {/* Plan Distribution */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(dist ?? []).map((d) => (
          <StatCard key={d.planId} label={d.planId} value={d.count} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Donut */}
        <Card>
          <CardHeader><CardTitle className="text-base">Plan Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dist ?? []} dataKey="count" nameKey="planId" cx="50%" cy="50%" outerRadius={90}
                  label={({ planId, percent }) => `${planId} ${(percent * 100).toFixed(0)}%`}
                >
                  {(dist ?? []).map((entry) => (
                    <Cell key={entry.planId} fill={PLAN_COLORS[entry.planId] ?? "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base">Activation Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnel ?? []} layout="vertical" margin={{ left: 32, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="step" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plan Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Plan Trend (6 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend ?? []} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="free" stackId="a" fill={PLAN_COLORS["free-trial"]} name="Free Trial" />
              <Bar dataKey="starter" stackId="a" fill={PLAN_COLORS.starter} name="Starter" />
              <Bar dataKey="professional" stackId="a" fill={PLAN_COLORS.professional} name="Professional" />
              <Bar dataKey="business" stackId="a" fill={PLAN_COLORS.business} name="Business" />
              <Bar dataKey="enterprise" stackId="a" fill={PLAN_COLORS.enterprise} name="Enterprise" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expiring Trials */}
      <Card>
        <CardHeader><CardTitle className="text-base">Trials Expiring in 7 Days ({trials?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={trialColumns}
            data={(trials ?? []) as TrialRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No trials expiring soon."
          />
        </CardContent>
      </Card>
    </div>
  );
}
