"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Phone, Filter, Loader2, ArrowRight, PhoneIncoming, PhoneOutgoing,
  Clock, CheckCircle, XCircle, AlertCircle, Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: "text-green-400 bg-green-500/100/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400 bg-red-500/10", label: "Failed" },
  "no-answer": { icon: AlertCircle, color: "text-yellow-400 bg-yellow-500/10", label: "No Answer" },
  queued: { icon: Clock, color: "text-blue-400 bg-blue-500/100/10", label: "Queued" },
  "in-progress": { icon: Phone, color: "text-blue-400 bg-blue-500/100/10", label: "In Progress" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || { icon: AlertCircle, color: "text-muted-foreground bg-secondary", label: status };
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function CallsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [filters, setFilters] = useState<{
    agentId?: string;
    status?: string;
    direction?: "inbound" | "outbound";
  }>({});

  const { data: agents } = trpc.agents.list.useQuery();
  const { data: stats } = trpc.calls.getStats.useQuery({});
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.calls.list.useInfiniteQuery(
      {
        limit: 25,
        ...(filters.agentId && { agentId: filters.agentId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.direction && { direction: filters.direction }),
        ...(debouncedSearch && { search: debouncedSearch }),
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const calls = data?.pages.flatMap((p) => p.calls) ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Logs</h1>
          <p className="text-muted-foreground">
            View and analyze all your call recordings
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search calls..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">{stats.totalMinutes}</p>
            <p className="text-xs text-muted-foreground">Total Minutes</p>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Agent</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.agentId || ""}
                onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value || undefined }))}
              >
                <option value="">All Agents</option>
                {agents?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.status || ""}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="no-answer">No Answer</option>
                <option value="queued">Queued</option>
                <option value="in-progress">In Progress</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.direction || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    direction: (e.target.value as "inbound" | "outbound") || undefined,
                  }))
                }
              >
                <option value="">All Directions</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
          </div>
          {(filters.agentId || filters.status || filters.direction) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 rounded-lg"
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Calls List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      ) : !calls.length ? (
        <div className="rounded-2xl border border-border/50 bg-card p-8 lg:p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
            <Phone className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">No calls yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Make a test call or run a campaign to see call logs here.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {calls.map((call) => {
              const style = getStatusStyle(call.status || "unknown");
              const StatusIcon = style.icon;
              return (
                <Link
                  key={call.id}
                  href={`/dashboard/calls/${call.id}`}
                  className="block rounded-2xl border border-border/50 bg-card p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2 ${call.direction === "inbound" ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-5 w-5 text-blue-500" />
                        ) : (
                          <PhoneOutgoing className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground font-mono text-sm">
                          {call.toNumber || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{call.agent?.name || "—"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {style.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(call.durationSeconds)}</span>
                    <span>{formatDate(call.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-6 py-4">Direction</th>
                    <th className="px-6 py-4">To / From</th>
                    <th className="px-6 py-4">Agent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calls.map((call) => {
                    const style = getStatusStyle(call.status || "unknown");
                    const StatusIcon = style.icon;
                    return (
                      <tr key={call.id} className="hover:bg-background transition-colors">
                        <td className="px-6 py-4">
                          {call.direction === "inbound" ? (
                            <PhoneIncoming className="h-4 w-4 text-blue-500" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-green-500" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground font-mono">
                            {call.toNumber || "—"}
                          </p>
                          {call.fromNumber && (
                            <p className="text-xs text-muted-foreground font-mono">
                              from {call.fromNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground/80">
                            {call.agent?.name || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {style.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDuration(call.durationSeconds)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(call.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/calls/${call.id}`}
                            className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 font-medium"
                          >
                            Details <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-xl"
              >
                {isFetchingNextPage ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
