"use client";

import { useState } from "react";
import {
  PhoneMissed,
  MessageSquare,
  PhoneOutgoing,
  UserPlus,
  Phone,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatPhone(phone: string) {
  if (phone.length === 12 && phone.startsWith("+1")) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }
  return phone;
}

export default function MissedCallsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "pending_textback" | "pending_callback">("all");

  const { data: stats, isLoading: statsLoading } = trpc.missedCalls.stats.useQuery();
  const { data: listData, isLoading: listLoading, refetch } = trpc.missedCalls.list.useQuery({
    page,
    limit: 15,
    ...(filter === "pending_textback" && { textBackSent: false }),
    ...(filter === "pending_callback" && { callbackInitiated: false }),
  });

  const sendTextBack = trpc.missedCalls.sendTextBack.useMutation({
    onSuccess: () => {
      toast.success("Text-back sent!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const initiateCallback = trpc.missedCalls.initiateCallback.useMutation({
    onSuccess: () => {
      toast.success("Callback initiated!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Missed Calls</h1>
        <p className="text-muted-foreground">Track missed inbound calls, text-backs, and auto-callbacks</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <PhoneMissed className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.todayMissedCalls ?? 0}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            {stats?.weekMissedCalls ?? 0} this week / {stats?.totalMissedCalls ?? 0} total
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.textBacksSent ?? 0}</p>
              <p className="text-xs text-muted-foreground">Text-Backs Sent</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <PhoneOutgoing className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.callbacksInitiated ?? 0}</p>
              <p className="text-xs text-muted-foreground">Callbacks Made</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <UserPlus className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.leadsCreated ?? 0}</p>
              <p className="text-xs text-muted-foreground">Leads Captured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all" as const, label: "All Missed Calls" },
          { key: "pending_textback" as const, label: "Pending Text-Back" },
          { key: "pending_callback" as const, label: "Pending Callback" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Missed Calls Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {listLoading || statsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
          </div>
        ) : !listData?.missedCalls.length ? (
          <div className="py-16 text-center">
            <PhoneMissed className="mx-auto h-12 w-12 text-muted-foreground/70" />
            <p className="mt-3 text-muted-foreground">No missed calls found</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Missed calls from inbound callers will appear here when detected
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Caller</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Text-Back</th>
                    <th className="px-4 py-3">Callback</th>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {listData.missedCalls.map((mc: typeof listData.missedCalls[number]) => (
                    <tr key={mc.id} className="hover:bg-secondary">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground/70" />
                          <span className="text-sm font-medium text-foreground">
                            {formatPhone(mc.callerNumber)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {mc.agent?.name || "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          mc.reason === "no_answer"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : mc.reason === "busy"
                              ? "bg-orange-500/10 text-orange-400"
                              : mc.reason === "after_hours"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-secondary text-foreground/80"
                        }`}>
                          {mc.reason.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {mc.textBackSent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <MessageSquare className="h-3 w-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">Not sent</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mc.callbackInitiated ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <PhoneOutgoing className="h-3 w-3" />
                            Done
                          </span>
                        ) : mc.callbackAt ? (
                          <span className="text-xs text-blue-400">Scheduled</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mc.contactCreated ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-400">
                            <UserPlus className="h-3 w-3" />
                            Created
                          </span>
                        ) : mc.contactId ? (
                          <span className="text-xs text-muted-foreground">Existing</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{formatDate(mc.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!mc.textBackSent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => sendTextBack.mutate({ id: mc.id })}
                              disabled={sendTextBack.isLoading}
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Text
                            </Button>
                          )}
                          {!mc.callbackInitiated && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => initiateCallback.mutate({ id: mc.id })}
                              disabled={initiateCallback.isLoading}
                            >
                              <PhoneOutgoing className="mr-1 h-3 w-3" />
                              Call
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {listData.pages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {listData.page} of {listData.pages} ({listData.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(listData.pages, p + 1))}
                    disabled={page >= listData.pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
