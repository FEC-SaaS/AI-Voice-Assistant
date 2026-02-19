"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bot, Edit, Phone, Megaphone, Power, Trash2,
  PhoneCall, Loader2, CheckCircle, XCircle, BookOpen, RefreshCw,
  AlertTriangle, Calendar, Link as LinkIcon, PhoneForwarded, Copy,
  BarChart3, Clock, TrendingUp, History,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVoice } from "@/constants/voices";
import { toast } from "sonner";

type Tab = "overview" | "performance" | "test-calls";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: agent, isLoading, refetch } = trpc.agents.get.useQuery({ id: params.id });
  const { data: knowledgeData } = trpc.knowledge.getAgentKnowledge.useQuery(
    { agentId: params.id },
    { enabled: !!params.id }
  );
  const { data: syncStatus, refetch: refetchSyncStatus } = trpc.agents.checkSyncStatus.useQuery(
    { id: params.id },
    { enabled: !!agent?.vapiAssistantId, staleTime: 60000 }
  );
  const { data: agentStats } = trpc.agents.getAgentStats.useQuery(
    { id: params.id, days: 30 },
    { enabled: activeTab === "performance" }
  );
  const { data: testCallHistory } = trpc.agents.getTestCallHistory.useQuery(
    { id: params.id },
    { enabled: activeTab === "test-calls" }
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
      toast.success(data.created ? `Agent connected! ${data.documentsIncluded} document(s) included.` : `Agent updated! ${data.documentsIncluded} document(s) included.`);
    },
    onError: (err) => toast.error(err.message),
  });
  const cloneAgent = trpc.agents.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success(`Agent duplicated as "${cloned.name}"`);
      router.push(`/dashboard/agents/${cloned.id}`);
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
      // Switch to test calls tab to show history
      setActiveTab("test-calls");
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
  const agentSettings = (agent.settings as Record<string, unknown>) || {};

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Overview", icon: Bot },
    { id: "performance", label: "Performance", icon: BarChart3 },
    { id: "test-calls", label: "Test Call History", icon: History },
  ];

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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTestCall(!showTestCall)}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Test Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (confirm(`Duplicate "${agent.name}"?`)) cloneAgent.mutate({ id: agent.id }); }}
            disabled={cloneAgent.isPending}
          >
            {cloneAgent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Duplicate
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
            onClick={() => { if (confirm("Delete this agent?")) deleteAgent.mutate({ id: agent.id }); }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Connection banners */}
      {!agent.vapiAssistantId && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-400">Agent not connected</h3>
              <p className="mt-1 text-sm text-yellow-400">This agent is not connected to the voice system and cannot make calls.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImportVapi(!showImportVapi)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Voice ID
              </Button>
              <Button size="sm" onClick={() => syncToVapi.mutate({ id: agent.id })} disabled={syncToVapi.isPending}>
                {syncToVapi.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : <><RefreshCw className="mr-2 h-4 w-4" />Create New</>}
              </Button>
            </div>
          </div>
          {showImportVapi && (
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <h4 className="font-medium text-yellow-400">Link Existing Voice Assistant</h4>
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
                  {importVapiId.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Linking...</> : "Link Assistant"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {agent.vapiAssistantId && syncStatus && !syncStatus.synced && (
        <div className="rounded-lg border border-red-200 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-400">Voice connection lost</h3>
              <p className="mt-1 text-sm text-red-400">{syncStatus.reason}</p>
              {syncStatus.action && <p className="mt-1 text-sm text-red-400 font-medium">{syncStatus.action}</p>}
            </div>
            <Button size="sm" onClick={() => syncToVapi.mutate({ id: agent.id })} disabled={syncToVapi.isPending}>
              {syncToVapi.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reconnecting...</> : <><RefreshCw className="mr-2 h-4 w-4" />Reconnect</>}
            </Button>
          </div>
        </div>
      )}

      {/* Test Call Panel */}
      {showTestCall && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-foreground">Make a Test Call</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a phone number to test this agent. A real call will be placed.
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
              {testCall.isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calling...</> : <><PhoneCall className="mr-2 h-4 w-4" />Call Now</>}
            </Button>
          </div>
          {callStatus && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {callStatus === "failed"
                ? <><XCircle className="h-4 w-4 text-red-500" /> Call failed</>
                : <><CheckCircle className="h-4 w-4 text-green-500" /> Call initiated (status: {callStatus})</>
              }
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Configuration */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Configuration</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Voice</span>
                  <p className="text-sm text-foreground">{voice?.name || agent.voiceId} ({agent.voiceProvider})</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Language Model</span>
                  <p className="text-sm text-foreground">{agent.model} ({agent.modelProvider})</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Language</span>
                  <p className="text-sm text-foreground">{agent.language}</p>
                </div>
                {agentSettings.voiceSpeed !== undefined && (
                  <div>
                    <span className="text-xs font-medium uppercase text-muted-foreground/70">Speaking Rate</span>
                    <p className="text-sm text-foreground">{agentSettings.voiceSpeed as number}x</p>
                  </div>
                )}
                {!!agentSettings.interruptionSensitivity && (
                  <div>
                    <span className="text-xs font-medium uppercase text-muted-foreground/70">Interruption Sensitivity</span>
                    <p className="text-sm text-foreground capitalize">{agentSettings.interruptionSensitivity as string}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Voice Status</span>
                  <p className={`text-sm font-medium ${
                    !agent.vapiAssistantId ? "text-yellow-400"
                    : syncStatus?.synced ? "text-green-400"
                    : syncStatus === undefined ? "text-muted-foreground"
                    : "text-red-400"
                  }`}>
                    {!agent.vapiAssistantId ? "Not Connected"
                      : syncStatus?.synced ? "Connected"
                      : syncStatus === undefined ? "Checking..."
                      : "Connection Lost"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Capabilities</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Boolean(agentSettings.enableAppointments) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        <Calendar className="h-3 w-3" />Appointments
                      </span>
                    )}
                    {Boolean(agentSettings.enableReceptionist) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                        <PhoneForwarded className="h-3 w-3" />Receptionist
                      </span>
                    )}
                    {Boolean(agentSettings.backgroundNoiseCancellation) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                        Noise Cancellation
                      </span>
                    )}
                    {!agentSettings.enableAppointments && !agentSettings.enableReceptionist && (
                      <span className="text-sm text-muted-foreground">None enabled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
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
              {/* Custom Transfer Numbers */}
              {Array.isArray(agentSettings.customTransferNumbers) && (agentSettings.customTransferNumbers as { label: string; number: string }[]).length > 0 && (
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground/70">Transfer Numbers</span>
                  <div className="mt-1 space-y-1">
                    {(agentSettings.customTransferNumbers as { label: string; number: string }[]).map((t, i) => (
                      <p key={i} className="text-sm text-foreground">{t.label}: {t.number}</p>
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
            <h2 className="text-lg font-semibold text-foreground">Knowledge Base</h2>
            {knowledgeData?.documents && knowledgeData.documents.length > 0 ? (
              <div className="mt-4 space-y-2">
                {knowledgeData.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} &middot; {doc.content?.length || 0} characters</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-center py-8 rounded-lg bg-secondary">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/70" />
                <p className="mt-2 text-sm text-muted-foreground">No knowledge documents assigned</p>
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
      )}

      {/* ── Performance Tab ── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {!agentStats ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border bg-card p-5 text-center">
                  <Phone className="mx-auto h-5 w-5 text-muted-foreground/70" />
                  <p className="mt-2 text-2xl font-bold text-foreground">{agentStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Calls (30d)</p>
                </div>
                <div className="rounded-lg border bg-card p-5 text-center">
                  <TrendingUp className="mx-auto h-5 w-5 text-green-400" />
                  <p className="mt-2 text-2xl font-bold text-foreground">{agentStats.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
                <div className="rounded-lg border bg-card p-5 text-center">
                  <Clock className="mx-auto h-5 w-5 text-blue-400" />
                  <p className="mt-2 text-2xl font-bold text-foreground">{formatDuration(agentStats.avgDuration)}</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <div className="rounded-lg border bg-card p-5 text-center">
                  <CheckCircle className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-2xl font-bold text-foreground">{agentStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>

              {/* Sentiment breakdown */}
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Sentiment Breakdown</h3>
                {agentStats.total === 0 ? (
                  <p className="text-sm text-muted-foreground">No call data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(["positive", "neutral", "negative"] as const).map((s) => {
                      const count = agentStats.sentiment[s];
                      const pct = agentStats.total > 0 ? Math.round((count / agentStats.total) * 100) : 0;
                      const colors = { positive: "bg-green-500", neutral: "bg-blue-400", negative: "bg-red-400" };
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <span className="w-16 text-xs text-muted-foreground capitalize">{s}</span>
                          <div className="flex-1 rounded-full bg-secondary h-2 overflow-hidden">
                            <div className={`h-full ${colors[s]} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Daily call trend */}
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Daily Call Volume (30 days)</h3>
                {agentStats.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calls in the last 30 days.</p>
                ) : (
                  <div className="flex items-end gap-1 h-24">
                    {agentStats.daily.map(({ date, count }) => {
                      const maxCount = Math.max(...agentStats.daily.map((d) => d.count), 1);
                      const heightPct = Math.max((count / maxCount) * 100, 8);
                      return (
                        <div key={date} title={`${date}: ${count}`} className="flex-1 flex items-end">
                          <div
                            className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors cursor-default"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Test Call History Tab ── */}
      {activeTab === "test-calls" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Test Call History</h2>
              <p className="text-sm text-muted-foreground">Last 20 test calls placed for this agent</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTestCall(true)}>
              <PhoneCall className="mr-2 h-4 w-4" />
              New Test Call
            </Button>
          </div>

          {!testCallHistory ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
            </div>
          ) : testCallHistory.length === 0 ? (
            <div className="text-center py-16 rounded-lg border bg-card">
              <History className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <p className="mt-3 text-sm text-muted-foreground">No test calls yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Click &quot;Test Call&quot; in the header to place your first test call</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">To Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {testCallHistory.map((call) => (
                    <tr key={call.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-mono">{call.toNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          call.status === "completed" ? "bg-green-500/10 text-green-400"
                          : call.status === "failed" ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDuration(call.durationSeconds)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(call.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
