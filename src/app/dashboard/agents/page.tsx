"use client";

import Link from "next/link";
import { Bot, Plus, Phone, Megaphone, Power, Trash2 } from "lucide-react";
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500">
            {agents?.length
              ? `${agents.length} agent${agents.length !== 1 ? "s" : ""}`
              : "Create your first AI voice agent"}
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {!agents?.length ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No agents yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first AI voice agent.
          </p>
          <Link href="/dashboard/agents/new" className="mt-6 inline-block">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const voice = getVoice(agent.voiceId);
            return (
              <div
                key={agent.id}
                className="group rounded-lg border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <p className="text-xs text-gray-500">
                          {voice?.name || agent.voiceId} &middot; {agent.model}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      agent.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </div>

                {agent.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                    {agent.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {agent._count.calls} calls
                  </span>
                  <span className="flex items-center gap-1">
                    <Megaphone className="h-3 w-3" />
                    {agent._count.campaigns} campaigns
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
                  <button
                    onClick={() => toggleActive.mutate({ id: agent.id })}
                    className="rounded p-1.5 hover:bg-gray-100"
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
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
