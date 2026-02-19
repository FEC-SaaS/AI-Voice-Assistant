"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";

export default function AdminIntegrationsPage() {
  const { data: health } = trpc.admin.integrations.getIntegrationHealth.useQuery();
  const { data: webhooks } = trpc.admin.integrations.getWebhookDeliveryRates.useQuery();
  const { data: errors } = trpc.admin.integrations.getOAuthErrors.useQuery();

  type ErrorRow = {
    id: string;
    type: string;
    status: string;
    errorMessage: string | null;
    updatedAt: Date;
    organization: { id: string; name: string } | null;
  };

  const errorColumns: Column<ErrorRow>[] = [
    { key: "org", header: "Organization", render: (r) => r.organization?.name ?? "—" },
    { key: "type", header: "Integration" },
    { key: "status", header: "Status", render: (r) => <Badge variant="destructive">{r.status}</Badge> },
    { key: "errorMessage", header: "Error", render: (r) => <span className="text-xs text-destructive">{r.errorMessage ?? "—"}</span> },
    { key: "updatedAt", header: "Last Updated", render: (r) => format(new Date(r.updatedAt), "MMM d, HH:mm") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integration Health</h1>
        <p className="text-muted-foreground text-sm">Connected integrations and webhook delivery</p>
      </div>

      {/* Webhook Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Webhook Deliveries (30d)" value={(webhooks?.total ?? 0).toLocaleString()} />
        <StatCard label="Successful" value={(webhooks?.successful ?? 0).toLocaleString()} />
        <StatCard label="Delivery Rate" value={`${webhooks?.rate ?? 0}%`} trend={webhooks?.rate && webhooks.rate < 95 ? "down" : "up"} />
      </div>

      {/* Integration Health BarChart */}
      {health && health.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Integration Connections by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={health} layout="vertical" margin={{ left: 48, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="connected" stackId="a" fill="#22c55e" name="Connected" />
                <Bar dataKey="error" stackId="a" fill="#ef4444" name="Error" />
                <Bar dataKey="disconnected" stackId="a" fill="#e2e8f0" name="Disconnected" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* OAuth Errors */}
      <Card>
        <CardHeader><CardTitle className="text-base">OAuth Errors ({errors?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={errorColumns}
            data={(errors ?? []) as ErrorRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No OAuth errors."
          />
        </CardContent>
      </Card>
    </div>
  );
}
