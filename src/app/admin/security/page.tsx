"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield } from "lucide-react";
import { format } from "date-fns";

export default function AdminSecurityPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [actionInput, setActionInput] = useState("");

  const { data: auditData, isLoading } = trpc.admin.security.getAuditLogs.useQuery({
    page,
    pageSize: 25,
    action: actionFilter || undefined,
  });
  const { data: dnc } = trpc.admin.security.getDNCStats.useQuery();
  const { data: apiKeys } = trpc.admin.security.getApiKeyStats.useQuery();

  type AuditRow = {
    id: string;
    action: string;
    entityType: string;
    userId: string | null;
    createdAt: Date;
    organization: { id: string; name: string } | null;
  };

  const auditColumns: Column<AuditRow>[] = [
    { key: "org", header: "Organization", render: (r) => r.organization?.name ?? "—" },
    { key: "action", header: "Action" },
    { key: "entityType", header: "Entity" },
    { key: "userId", header: "User", render: (r) => r.userId ? r.userId.slice(0, 12) + "…" : "system" },
    { key: "createdAt", header: "When", render: (r) => format(new Date(r.createdAt), "MMM d, HH:mm") },
  ];

  type ApiKeyRow = {
    id: string;
    keyPrefix: string;
    lastUsedAt: Date | null;
    createdAt: Date;
    organization: { id: string; name: string } | null;
  };

  const apiKeyColumns: Column<ApiKeyRow>[] = [
    { key: "org", header: "Organization", render: (r) => r.organization?.name ?? "—" },
    { key: "keyPrefix", header: "Key" },
    { key: "lastUsedAt", header: "Last Used", render: (r) => r.lastUsedAt ? format(new Date(r.lastUsedAt), "MMM d, HH:mm") : "Never" },
    { key: "createdAt", header: "Created", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security & Compliance</h1>
        <p className="text-muted-foreground text-sm">Cross-org audit logs, DNC, and API key activity</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="DNC Entries" value={(dnc?.total ?? 0).toLocaleString()} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Active API Keys" value={apiKeys?.active ?? 0} />
        <StatCard label="Keys Used (30d)" value={apiKeys?.recentlyUsed ?? 0} />
        <StatCard label="Revoked Keys" value={apiKeys?.revoked ?? 0} />
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cross-Org Audit Log</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Filter by action…"
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setActionFilter(actionInput); setPage(1); } }}
                className="h-8 w-48 text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => { setActionFilter(actionInput); setPage(1); }}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={auditColumns}
            data={(auditData?.logs ?? []) as AuditRow[]}
            getRowKey={(r) => r.id}
            page={page}
            pages={auditData?.pages ?? 1}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Active API Keys */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recently Used API Keys</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={apiKeyColumns}
            data={(apiKeys?.topKeys ?? []) as ApiKeyRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No API key activity."
          />
        </CardContent>
      </Card>
    </div>
  );
}
