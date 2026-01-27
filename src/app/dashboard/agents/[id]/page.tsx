"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bot, Edit, Phone, Megaphone, Power, Trash2,
  PhoneCall, Loader2, CheckCircle, XCircle
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVoice } from "@/constants/voices";
import { toast } from "sonner";

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: agent, isLoading, refetch } = trpc.agents.get.useQuery({ id: params.id });
  const toggleActive = trpc.agents.toggleActive.useMutation({
    onSuccess: () => { refetch(); toast.success("Agent status updated"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => { toast.success("Agent deleted"); router.push("/dashboard/agents"); },
    onError: (err) => toast.error(err.message),
  });

  // Test Call state
  const [showTestCall, setShowTestCall] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const testCall = trpc.agents.testCall.useMutation({
    onSuccess: (data) => {
      setCallStatus(data.status);
      toast.success("Test call initiated!");
    },
    onError: (err) => {
      setCallStatus("failed");
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Agent not found</h2>
        <Link href="/dashboard/agents" className="mt-4 inline-block text-primary hover:underline">
          Back to Agents
        </Link>
      </div>
    );
  }

  const voice = getVoice(agent.voiceId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`inline-flex h-2 w-2 rounded-full ${agent.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                {agent.isActive ? "Active" : "Inactive"}
                {agent.description && <>&middot; {agent.description}</>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTestCall(!showTestCall)}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Test Call
          </Button>
          <Link href={`/dashboard/agents/${agent.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline" size="sm"
            onClick={() => toggleActive.mutate({ id: agent.id })}
          >
            <Power className={`mr-2 h-4 w-4 ${agent.isActive ? "text-green-600" : "text-gray-400"}`} />
            {agent.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm("Delete this agent?")) deleteAgent.mutate({ id: agent.id });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Test Call Panel */}
      {showTestCall && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Make a Test Call</h3>
          <p className="mt-1 text-sm text-gray-500">
            Enter a phone number to test this agent. The agent will call the number and use its configured prompt.
          </p>
          <div className="mt-4 flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="testNumber">Phone Number</Label>
              <Input
                id="testNumber"
                placeholder="+1234567890"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                setCallStatus(null);
                testCall.mutate({ agentId: agent.id, phoneNumber: testNumber });
              }}
              disabled={testCall.isLoading || !testNumber}
            >
              {testCall.isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calling...</>
              ) : (
                <><PhoneCall className="mr-2 h-4 w-4" /> Call Now</>
              )}
            </Button>
          </div>
          {callStatus && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {callStatus === "failed" ? (
                <><XCircle className="h-4 w-4 text-red-500" /> Call failed</>
              ) : (
                <><CheckCircle className="h-4 w-4 text-green-500" /> Call initiated (status: {callStatus})</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Agent Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Voice</span>
              <p className="text-sm text-gray-900">{voice?.name || agent.voiceId} ({agent.voiceProvider})</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">AI Model</span>
              <p className="text-sm text-gray-900">{agent.model} ({agent.modelProvider})</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Language</span>
              <p className="text-sm text-gray-900">{agent.language}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Vapi ID</span>
              <p className="text-sm font-mono text-gray-500">{agent.vapiAssistantId || "Not synced"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <Phone className="mx-auto h-5 w-5 text-gray-400" />
              <p className="mt-2 text-2xl font-bold text-gray-900">{agent._count.calls}</p>
              <p className="text-xs text-gray-500">Total Calls</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <Megaphone className="mx-auto h-5 w-5 text-gray-400" />
              <p className="mt-2 text-2xl font-bold text-gray-900">{agent._count.campaigns}</p>
              <p className="text-xs text-gray-500">Campaigns</p>
            </div>
          </div>
          {agent.phoneNumbers.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Assigned Numbers</span>
              <div className="mt-1 space-y-1">
                {agent.phoneNumbers.map((pn) => (
                  <p key={pn.id} className="text-sm text-gray-900">{pn.number}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* First Message */}
      {agent.firstMessage && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">First Message</h2>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{agent.firstMessage}</p>
        </div>
      )}

      {/* System Prompt */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">System Prompt</h2>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          {agent.systemPrompt}
        </pre>
      </div>
    </div>
  );
}
