"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bot, Edit, Phone, Megaphone, Power, Trash2,
  PhoneCall, Loader2, CheckCircle, XCircle, BookOpen, RefreshCw, AlertTriangle, Calendar, Link as LinkIcon, PhoneForwarded, MessageSquare
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
  const { data: knowledgeData } = trpc.knowledge.getAgentKnowledge.useQuery(
    { agentId: params.id },
    { enabled: !!params.id }
  );
  // Check sync status only when agent has a vapiAssistantId
  const { data: syncStatus, refetch: refetchSyncStatus } = trpc.agents.checkSyncStatus.useQuery(
    { id: params.id },
    { enabled: !!agent?.vapiAssistantId, staleTime: 60000 } // Cache for 1 minute
  );
  const toggleActive = trpc.agents.toggleActive.useMutation({
    onSuccess: () => { refetch(); toast.success("Agent status updated"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => { toast.success("Agent deleted"); router.push("/dashboard/agents"); },
    onError: (err) => toast.error(err.message),
  });
  const syncToVapi = trpc.agents.syncToVapi.useMutation({
    onSuccess: (data) => {
      refetch();
      refetchSyncStatus();
      if (data.created) {
        toast.success(`Agent connected! ${data.documentsIncluded} knowledge document(s) included.`);
      } else {
        toast.success(`Agent updated! ${data.documentsIncluded} knowledge document(s) included.`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // Test Call state
  const [showTestCall, setShowTestCall] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [callStatus, setCallStatus] = useState<string | null>(null);

  // Import Vapi ID state
  const [showImportVapi, setShowImportVapi] = useState(false);
  const [vapiIdInput, setVapiIdInput] = useState("");
  const importVapiId = trpc.agents.importVapiId.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(data.message);
      setShowImportVapi(false);
      setVapiIdInput("");
    },
    onError: (err) => toast.error(err.message),
  });

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-foreground">Agent not found</h2>
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
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`inline-flex h-2 w-2 rounded-full ${agent.isActive ? "bg-green-500" : "bg-muted-foreground/70"}`} />
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
            <Power className={`mr-2 h-4 w-4 ${agent.isActive ? "text-green-400" : "text-muted-foreground/70"}`} />
            {agent.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-400 hover:bg-red-500/10"
            onClick={() => {
              if (confirm("Delete this agent?")) deleteAgent.mutate({ id: agent.id });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Not Connected Warning */}
      {!agent.vapiAssistantId && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Agent not connected</h3>
              <p className="mt-1 text-sm text-yellow-400">
                This agent is not connected to the voice system and cannot make calls.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImportVapi(!showImportVapi)}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Voice ID
              </Button>
              <Button
                size="sm"
                onClick={() => syncToVapi.mutate({ id: agent.id })}
                disabled={syncToVapi.isPending}
              >
                {syncToVapi.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Create New</>
                )}
              </Button>
            </div>
          </div>

          {/* Import Voice System ID Form */}
          {showImportVapi && (
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <h4 className="font-medium text-yellow-400">Link Existing Voice Assistant</h4>
              <p className="mt-1 text-sm text-yellow-400">
                If you have an existing voice assistant, paste its ID here to link it to this CallTone agent.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="e.g., 79c4900c-b55c-4e1f-b0b1-cb49f0dbb67e"
                  value={vapiIdInput}
                  onChange={(e) => setVapiIdInput(e.target.value)}
                  className="flex-1 bg-card"
                />
                <Button
                  size="sm"
                  onClick={() => importVapiId.mutate({ id: agent.id, vapiAssistantId: vapiIdInput })}
                  disabled={importVapiId.isPending || !vapiIdInput.trim()}
                >
                  {importVapiId.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Linking...</>
                  ) : (
                    "Link Assistant"
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-yellow-400">
                Contact support if you need help finding your voice assistant ID.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sync Status Warning - shown when agent has ID but assistant was deleted externally */}
      {agent.vapiAssistantId && syncStatus && !syncStatus.synced && (
        <div className="rounded-lg border border-red-200 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-400">Voice connection lost</h3>
              <p className="mt-1 text-sm text-red-400">
                {syncStatus.reason}
              </p>
              {syncStatus.action && (
                <p className="mt-1 text-sm text-red-400 font-medium">
                  {syncStatus.action}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => syncToVapi.mutate({ id: agent.id })}
              disabled={syncToVapi.isPending}
            >
              {syncToVapi.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reconnecting...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Reconnect</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Test Call Panel */}
      {showTestCall && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-foreground">Make a Test Call</h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Configuration</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Voice</span>
              <p className="text-sm text-foreground">{voice?.name || agent.voiceId} ({agent.voiceProvider})</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">AI Model</span>
              <p className="text-sm text-foreground">{agent.model} ({agent.modelProvider})</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Language</span>
              <p className="text-sm text-foreground">{agent.language}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Status</span>
              <p className={`text-sm font-medium ${
                !agent.vapiAssistantId
                  ? "text-yellow-400"
                  : syncStatus?.synced
                    ? "text-green-400"
                    : syncStatus === undefined
                      ? "text-muted-foreground"
                      : "text-red-400"
              }`}>
                {!agent.vapiAssistantId
                  ? "Not Connected"
                  : syncStatus?.synced
                    ? "Connected"
                    : syncStatus === undefined
                      ? "Checking..."
                      : "Connection Lost"
                }
              </p>
            </div>
            {agent.vapiAssistantId && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Voice System ID</span>
                <p className="text-sm text-foreground font-mono break-all">{agent.vapiAssistantId}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Capabilities</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {Boolean((agent.settings as Record<string, unknown>)?.enableAppointments) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    <Calendar className="h-3 w-3" />
                    Appointments
                  </span>
                )}
                {Boolean((agent.settings as Record<string, unknown>)?.enableReceptionist) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                    <PhoneForwarded className="h-3 w-3" />
                    Receptionist
                  </span>
                )}
                {Boolean((agent.settings as Record<string, unknown>)?.enableMissedCallTextBack) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                    <MessageSquare className="h-3 w-3" />
                    Missed Call Text-Back
                  </span>
                )}
                {!((agent.settings as Record<string, unknown>)?.enableAppointments) && !((agent.settings as Record<string, unknown>)?.enableReceptionist) && !((agent.settings as Record<string, unknown>)?.enableMissedCallTextBack) && (
                  <span className="text-sm text-muted-foreground">None enabled</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary p-4 text-center">
              <Phone className="mx-auto h-5 w-5 text-muted-foreground/70" />
              <p className="mt-2 text-2xl font-bold text-foreground">{agent._count.calls}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <Megaphone className="mx-auto h-5 w-5 text-muted-foreground/70" />
              <p className="mt-2 text-2xl font-bold text-foreground">{agent._count.campaigns}</p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
          </div>
          {agent.phoneNumbers.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Assigned Numbers</span>
              <div className="mt-1 space-y-1">
                {agent.phoneNumbers.map((pn) => (
                  <p key={pn.id} className="text-sm text-foreground">{pn.number}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* First Message */}
      {agent.firstMessage && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">First Message</h2>
          <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{agent.firstMessage}</p>
        </div>
      )}

      {/* Knowledge Base */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Knowledge Base</h2>
        </div>
        {knowledgeData?.documents && knowledgeData.documents.length > 0 ? (
          <div className="mt-4 space-y-2">
            {knowledgeData.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.type} &middot; {doc.content?.length || 0} characters
                  </p>
                </div>
              </div>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Knowledge documents are automatically included in the agent&apos;s knowledge base.
            </p>
          </div>
        ) : (
          <div className="mt-4 text-center py-8 rounded-lg bg-secondary">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/70" />
            <p className="mt-2 text-sm text-muted-foreground">No knowledge documents assigned</p>
            <p className="text-xs text-muted-foreground/70">
              Add documents in the Knowledge section and assign them to this agent
            </p>
          </div>
        )}
      </div>

      {/* System Prompt */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">System Prompt</h2>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary p-4 text-sm text-foreground/80">
          {agent.systemPrompt}
        </pre>
      </div>
    </div>
  );
}
