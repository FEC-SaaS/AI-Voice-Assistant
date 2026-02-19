"use client";

import { History, ShieldCheck } from "lucide-react";
import { AuditLogTable } from "@/components/compliance/audit-log-table";

export default function ActivityLogPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          A complete audit trail of actions taken within your organization
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Immutable audit trail</p>
          <p className="text-xs text-muted-foreground">
            All entries are append-only and cannot be modified or deleted. For compliance exports,
            visit{" "}
            <a href="/dashboard/compliance" className="text-primary hover:underline">
              Compliance
            </a>
            .
          </p>
        </div>
      </div>

      {/* Reuse the existing AuditLogTable component */}
      <AuditLogTable />
    </div>
  );
}
