"use client";

import { trpc } from "@/lib/trpc";
import { SystemHealth } from "@/components/admin/system-health";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server } from "lucide-react";
import { format } from "date-fns";

export default function AdminSystemPage() {
  const { data: health, isLoading: healthLoading, refetch, isFetching } = trpc.admin.system.getHealthChecks.useQuery(
    undefined,
    { refetchInterval: false }
  );
  const { data: dbStats } = trpc.admin.system.getDBStats.useQuery();

  type TableRow = { table: string; rows: number };
  const tableColumns: Column<TableRow>[] = [
    { key: "table", header: "Table" },
    { key: "rows", header: "Row Count", render: (r) => r.rows.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System & Infrastructure</h1>
        <p className="text-muted-foreground text-sm">External service health and database stats</p>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">External Service Health</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SystemHealth services={health?.services ?? []} isLoading={healthLoading} />
          {health?.checkedAt && (
            <p className="text-xs text-muted-foreground">
              Last checked: {format(new Date(health.checkedAt), "MMM d, yyyy HH:mm:ss")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* DB Stats */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" />Database Row Counts</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={tableColumns}
            data={(dbStats?.tables ?? []) as TableRow[]}
            getRowKey={(r) => r.table}
          />
        </CardContent>
      </Card>
    </div>
  );
}
