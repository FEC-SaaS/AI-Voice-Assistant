"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { PlanBadge } from "@/components/admin/plan-badge";
import { CohortTable } from "@/components/admin/cohort-table";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function AdminEngagementPage() {
  const { data: daumau } = trpc.admin.engagement.getDAUMAU.useQuery();
  const { data: cohorts } = trpc.admin.engagement.getCohortRetention.useQuery();
  const { data: dormant } = trpc.admin.engagement.getDormantOrgs.useQuery();
  const { data: atRisk } = trpc.admin.engagement.getAtRiskOrgs.useQuery();

  type OrgRow = { id: string; name: string; planId: string; createdAt: Date; _count: { calls: number }; paymentFailedAt?: Date | null };
  const dormantColumns: Column<OrgRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "calls", header: "Total Calls", render: (r) => r._count.calls },
    { key: "createdAt", header: "Joined", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  const atRiskColumns: Column<OrgRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "paymentFailedAt", header: "Payment Issue", render: (r) => r.paymentFailedAt ? "⚠ Failed" : "—" },
    { key: "createdAt", header: "Joined", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Engagement & Retention</h1>
        <p className="text-muted-foreground text-sm">DAU/MAU, cohort retention, dormant and at-risk accounts</p>
      </div>

      {/* DAU/MAU KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="DAU (orgs active today)" value={daumau?.dau ?? 0} />
        <StatCard label="MAU (orgs active 30d)" value={daumau?.mau ?? 0} />
        <StatCard label="DAU/MAU Ratio" value={`${daumau?.ratio ?? 0}`} />
      </div>

      {/* DAU Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daily Active Orgs (30 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daumau?.trend ?? []} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), "MMM d")} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => format(new Date(d), "MMM d, yyyy")} />
              <Line type="monotone" dataKey="dau" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cohort Retention */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cohort Retention (% still making calls)</CardTitle></CardHeader>
        <CardContent>
          <CohortTable data={cohorts ?? []} />
        </CardContent>
      </Card>

      {/* At-Risk */}
      <Card>
        <CardHeader><CardTitle className="text-base">At-Risk Paid Accounts ({atRisk?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={atRiskColumns}
            data={(atRisk ?? []) as OrgRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No at-risk accounts."
          />
        </CardContent>
      </Card>

      {/* Dormant */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dormant Orgs (no calls in 30d, {dormant?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={dormantColumns}
            data={(dormant ?? []) as OrgRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No dormant organizations."
          />
        </CardContent>
      </Card>
    </div>
  );
}
