"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { format } from "date-fns";

export default function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const [actionInput, setActionInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = trpc.admin.activityLog.list.useQuery({
    page,
    pageSize: 25,
    action: actionFilter || undefined,
  });

  type LogRow = {
    id: string;
    adminClerkId: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    ipAddress: string | null;
    createdAt: Date;
  };

  const columns: Column<LogRow>[] = [
    {
      key: "adminClerkId",
      header: "Admin",
      render: (r) => <span className="font-mono text-xs">{r.adminClerkId.slice(0, 14)}…</span>,
    },
    { key: "action", header: "Action" },
    { key: "targetType", header: "Target Type", render: (r) => r.targetType ?? "—" },
    {
      key: "targetId",
      header: "Target ID",
      render: (r) => r.targetId ? <span className="font-mono text-xs">{r.targetId.slice(0, 12)}…</span> : "—",
    },
    { key: "ipAddress", header: "IP", render: (r) => r.ipAddress ?? "—" },
    { key: "createdAt", header: "When", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy HH:mm") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Activity Log</h1>
        <p className="text-muted-foreground text-sm">
          {data?.total ?? 0} total admin actions logged
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Log</CardTitle>
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
            columns={columns}
            data={(data?.logs ?? []) as LogRow[]}
            getRowKey={(r) => r.id}
            page={page}
            pages={data?.pages ?? 1}
            onPageChange={setPage}
            isLoading={isLoading}
            emptyMessage="No admin activity logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
