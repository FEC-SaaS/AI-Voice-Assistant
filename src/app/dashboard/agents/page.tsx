"use client";

import Link from "next/link";
import { Bot, Plus, Phone, Megaphone, Power, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { getVoice } from "@/constants/voices";
import { toast } from "sonner";

export default function AgentsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-gray-200/50 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500">
            {agents?.length
              ? `${agents.length} agent${agents.length !== 1 ? "s" : ""}`
              : "Create your first AI voice agent"}
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="w-full sm:w-auto rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {!agents?.length ? (
        <div className="rounded-2xl border border-gray-200/50 bg-white p-8 lg:p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No agents yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Get started by creating your first AI voice agent to handle calls.
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
          {agents.map((agent) => {
            const voice = getVoice(agent.voiceId);
            return (
              <div
                key={agent.id}
                className="group rounded-2xl border border-gray-200/50 bg-white p-5 transition-all hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {voice?.name || agent.voiceId} &middot; {agent.model}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ring-4 ${
                      agent.isActive ? "bg-green-500 ring-green-100" : "bg-gray-300 ring-gray-100"
                    }`}
                  />
                </div>

                {agent.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {agent.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                    <Phone className="h-3 w-3" />
                    {agent._count.calls}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                    <Megaphone className="h-3 w-3" />
                    {agent._count.campaigns}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive.mutate({ id: agent.id })}
                      className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                      title={agent.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power
                        className={`h-4 w-4 ${
                          agent.isActive ? "text-green-600" : "text-gray-400"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this agent?")) {
                          deleteAgent.mutate({ id: agent.id });
                        }
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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
