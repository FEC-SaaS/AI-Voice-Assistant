"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type Column } from "@/components/admin/data-table";
import { PlanBadge } from "@/components/admin/plan-badge";
import { ActionDropdown } from "@/components/admin/action-dropdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  planId: string;
  suspendedAt: Date | null;
  createdAt: Date;
  _count: { users: number; calls: number; agents: number; campaigns: number };
};

export default function AdminOrgsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("all");

  const { data, isLoading, refetch } = trpc.admin.orgs.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    planId: planFilter !== "all" ? planFilter : undefined,
    suspended: suspendedFilter === "suspended" ? true : suspendedFilter === "active" ? false : undefined,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const columns: Column<OrgRow>[] = [
    {
      key: "name",
      header: "Organization",
      render: (row) => (
        <div>
          <Link href={`/admin/orgs/${row.id}`} className="font-medium hover:underline flex items-center gap-1">
            {row.name}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </Link>
          <p className="text-xs text-muted-foreground">{row.slug}</p>
        </div>
      ),
    },
    {
      key: "planId",
      header: "Plan",
      render: (row) => <PlanBadge planId={row.planId} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.suspendedAt ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline" className="text-green-700 border-green-200">Active</Badge>
        ),
    },
    {
      key: "users",
      header: "Users",
      render: (row) => row._count.users,
    },
    {
      key: "calls",
      header: "Calls",
      render: (row) => row._count.calls.toLocaleString(),
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (row) => format(new Date(row.createdAt), "MMM d, yyyy"),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <ActionDropdown
          orgId={row.id}
          orgName={row.name}
          isSuspended={!!row.suspendedAt}
          currentPlan={row.planId}
          onSuccess={() => refetch()}
        />
      ),
      className: "w-10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground text-sm">
          {data?.total ?? 0} total organizations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or slug…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free-trial">Free Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={suspendedFilter} onValueChange={(v) => { setSuspendedFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.orgs ?? []) as OrgRow[]}
        getRowKey={(row) => row.id}
        page={page}
        pages={data?.pages ?? 1}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
