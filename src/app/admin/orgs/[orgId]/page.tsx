"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { PlanBadge } from "@/components/admin/plan-badge";
import { ActionDropdown } from "@/components/admin/action-dropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Users, Phone, Bot } from "lucide-react";

export default function OrgDrillDownPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const { data: org, isLoading, refetch } = trpc.admin.orgs.getOne.useQuery({ orgId });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!org) {
    return <div className="text-muted-foreground">Organization not found.</div>;
  }

  type UserRow = { id: string; name: string | null; email: string; role: string; createdAt: Date };
  const userColumns: Column<UserRow>[] = [
    { key: "name", header: "Name", render: (r) => r.name ?? "—" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (r) => <Badge variant="outline">{r.role}</Badge> },
    { key: "createdAt", header: "Joined", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  type AuditRow = { id: string; action: string; entityType: string; userId: string | null; createdAt: Date };
  const auditColumns: Column<AuditRow>[] = [
    { key: "action", header: "Action" },
    { key: "entityType", header: "Entity" },
    { key: "userId", header: "By", render: (r) => r.userId ?? "system" },
    { key: "createdAt", header: "When", render: (r) => format(new Date(r.createdAt), "MMM d, HH:mm") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/orgs" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-muted-foreground text-sm">{org.slug}</p>
          </div>
          <PlanBadge planId={org.planId} />
          {org.suspendedAt && <Badge variant="destructive">Suspended</Badge>}
        </div>
        <ActionDropdown
          orgId={org.id}
          orgName={org.name}
          isSuspended={!!org.suspendedAt}
          currentPlan={org.planId}
          onSuccess={() => refetch()}
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={org.users.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total Calls" value={org._count.calls.toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Calls This Month" value={org.callsThisMonth.toLocaleString()} icon={<Phone className="h-4 w-4" />} />
        <StatCard label="Total Minutes" value={org.totalMinutesAllTime.toLocaleString()} icon={<Bot className="h-4 w-4" />} />
      </div>

      {/* Org Overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Created: </span>{format(new Date(org.createdAt), "MMM d, yyyy")}</div>
          <div><span className="text-muted-foreground">Onboarding: </span>{org.onboardingComplete ? "Complete" : "Incomplete"}</div>
          <div><span className="text-muted-foreground">Contacts: </span>{org._count.contacts}</div>
          <div><span className="text-muted-foreground">Agents: </span>{org.agents?.length ?? 0}</div>
          <div><span className="text-muted-foreground">Appointments: </span>{org._count.appointments}</div>
          <div><span className="text-muted-foreground">API Keys: </span>{org._count.apiKeys}</div>
          {org.suspendedAt && (
            <div className="text-destructive"><span>Suspended: </span>{format(new Date(org.suspendedAt), "MMM d, yyyy")}</div>
          )}
          {org.trialExpiresAt && (
            <div><span className="text-muted-foreground">Trial Expires: </span>{format(new Date(org.trialExpiresAt), "MMM d, yyyy")}</div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={userColumns}
            data={org.users as UserRow[]}
            getRowKey={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit Log</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={auditColumns}
            data={org.auditLogs as AuditRow[]}
            getRowKey={(r) => r.id}
            emptyMessage="No audit log entries."
          />
        </CardContent>
      </Card>
    </div>
  );
}
