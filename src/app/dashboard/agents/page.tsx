"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bot, Plus, Phone, Megaphone, Power, Trash2, ArrowRight, Sparkles, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVoice } from "@/constants/voices";
import { toast } from "sonner";

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const toggleActive = trpc.agents.toggleActive.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Agent status updated");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Agent deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agents</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-border/50 bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-muted-foreground">
            {agents?.length
              ? `${agents.length} agent${agents.length !== 1 ? "s" : ""}`
              : "Create your first voice agent"}
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="w-full sm:w-auto rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Search */}
      {agents && agents.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {!agents?.length ? (
        <div className="rounded-2xl border border-border/50 bg-card p-8 lg:p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">No agents yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Get started by creating your first voice agent to handle calls.
          </p>
          <Link href="/dashboard/agents/new" className="mt-6 inline-block">
            <Button className="rounded-xl shadow-md shadow-primary/20">
              <Sparkles className="mr-2 h-4 w-4" />
              Create Your First Agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.filter((agent) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              agent.name.toLowerCase().includes(q) ||
              (agent.description || "").toLowerCase().includes(q) ||
              (agent.voiceId || "").toLowerCase().includes(q)
            );
          }).map((agent) => {
            const voice = getVoice(agent.voiceId);
            return (
              <div
                key={agent.id}
                className="group rounded-2xl border border-border/50 bg-card p-5 transition-all hover:shadow-lg hover:shadow-border/50 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {voice?.name || agent.voiceId} &middot; {agent.model}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ring-4 ${
                      agent.isActive ? "bg-green-500 ring-green-100" : "bg-muted-foreground/70 ring-secondary"
                    }`}
                  />
                </div>

                {agent.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {agent._count.calls}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                    <Megaphone className="h-3 w-3" />
                    {agent._count.campaigns}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive.mutate({ id: agent.id })}
                      className="rounded-lg p-2 hover:bg-secondary transition-colors"
                      title={agent.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power
                        className={`h-4 w-4 ${
                          agent.isActive ? "text-green-400" : "text-muted-foreground/70"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this agent?")) {
                          deleteAgent.mutate({ id: agent.id });
                        }
                      }}
                      className="rounded-lg p-2 text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
