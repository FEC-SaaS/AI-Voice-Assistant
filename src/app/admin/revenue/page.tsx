"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Users } from "lucide-react";
import { format } from "date-fns";
import { PlanBadge } from "@/components/admin/plan-badge";

export default function AdminRevenuePage() {
  const { data: mrr, isLoading: mrrLoading } = trpc.admin.revenue.getMRR.useQuery();
  const { data: monthly } = trpc.admin.revenue.getRevenueByMonth.useQuery({ months: 12 });
  const { data: failures } = trpc.admin.revenue.getPaymentFailures.useQuery();
  const { data: churn } = trpc.admin.revenue.getChurnMetrics.useQuery();

  type FailureRow = { id: string; name: string; planId: string; paymentFailedAt: Date | null };

  const failureColumns: Column<FailureRow>[] = [
    { key: "name", header: "Organization" },
    { key: "planId", header: "Plan", render: (r) => <PlanBadge planId={r.planId} /> },
    { key: "paymentFailedAt", header: "Failed At", render: (r) => r.paymentFailedAt ? format(new Date(r.paymentFailedAt), "MMM d, yyyy") : "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue & Billing</h1>
        <p className="text-muted-foreground text-sm">Subscription metrics from Stripe</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="MRR"
          value={`$${(mrr?.mrr ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="ARR"
          value={`$${(mrr?.arr ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="ARPU"
          value={`$${(mrr?.arpu ?? 0).toFixed(0)}`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Paid Customers"
          value={(mrr?.totalPaidCustomers ?? 0).toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Churn */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Churned (30d)" value={churn?.churnedThisMonth ?? 0} trend="down" />
        <StatCard label="Churn Rate" value={`${churn?.churnRate ?? 0}%`} trend={churn?.churnRate && churn.churnRate > 5 ? "down" : "up"} />
        <StatCard label="Total Paid" value={churn?.totalPaid ?? 0} />
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Revenue (12 Months)</CardTitle></CardHeader>
        <CardContent>
          <RevenueChart data={monthly ?? []} height={280} />
        </CardContent>
      </Card>

      {/* Payment Failures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Payment Failures ({failures?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={failureColumns}
            data={(failures ?? []) as FailureRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No payment failures."
          />
        </CardContent>
      </Card>
    </div>
  );
}
