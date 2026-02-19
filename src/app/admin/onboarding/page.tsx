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

export default function AdminOnboardingPage() {
  const { data: funnel } = trpc.admin.acquisition.getOnboardingFunnel.useQuery();
  const { data: stuck } = trpc.admin.acquisition.getStuckAccounts.useQuery();
  const { data: ttfc } = trpc.admin.acquisition.getTimeToFirstCall.useQuery();

  type StuckRow = { id: string; name: string; planId: string; createdAt: Date; onboardingComplete: boolean };
  const stuckColumns: Column<StuckRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "createdAt", header: "Signed Up", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
    { key: "onboardingComplete", header: "Onboarding", render: (r) => r.onboardingComplete ? "✓ Complete" : "Incomplete" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding & Activation</h1>
        <p className="text-muted-foreground text-sm">Funnel health and stuck accounts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Avg Time to First Call" value={`${ttfc?.avgHoursToFirstCall ?? 0}h`} />
        <StatCard label="Stuck Accounts (3d+, no calls)" value={stuck?.length ?? 0} trend="down" />
      </div>

      {/* Activation Funnel */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activation Funnel</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnel ?? []} layout="vertical" margin={{ left: 32, right: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="step" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={(v: number, name) => [v.toLocaleString(), "Organizations"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 11, formatter: (v: number) => v.toLocaleString() }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion % per step */}
      <Card>
        <CardHeader><CardTitle className="text-base">Step Conversion Rates</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(funnel ?? []).map((step) => (
              <div key={step.step} className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.step}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{step.count.toLocaleString()} orgs</span>
                  <span className="w-12 text-right font-semibold">{step.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stuck Accounts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Stuck Accounts (signed up 3+ days ago, no calls)</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={stuckColumns}
            data={(stuck ?? []) as StuckRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No stuck accounts — great!"
          />
        </CardContent>
      </Card>
    </div>
  );
}
