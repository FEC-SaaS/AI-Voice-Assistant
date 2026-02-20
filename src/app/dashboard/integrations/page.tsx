"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plug,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Webhook,
  Key,
  Copy,
  RefreshCw,
  Loader2,
  Trash2,
  TestTube,
  Lock,
  Plus,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type IntegrationType = "ghl" | "google_calendar" | "google_sheets" | "make" | "slack" | "zapier" | "hubspot" | "salesforce" | "mcp";

// ── Integration icon colours ────────────────────────────────────────
const EMOJI_ICONS: Record<string, string> = {
  ghl: "🏢",
  google_calendar: "📅",
  google_sheets: "📊",
  make: "⚙️",
  slack: "💬",
  zapier: "⚡",
  hubspot: "🟠",
  salesforce: "☁️",
  mcp: "🔌",
};

const CARD_ACCENTS: Record<string, { glow: string; border: string }> = {
  ghl:             { glow: "bg-orange-500/20",  border: "rgba(249,115,22,0.2)"  },
  google_calendar: { glow: "bg-blue-500/20",    border: "rgba(59,130,246,0.2)"  },
  google_sheets:   { glow: "bg-green-500/20",   border: "rgba(34,197,94,0.2)"   },
  make:            { glow: "bg-purple-500/20",   border: "rgba(168,85,247,0.2)"  },
  slack:           { glow: "bg-yellow-500/20",  border: "rgba(234,179,8,0.2)"   },
  zapier:          { glow: "bg-orange-500/20",  border: "rgba(249,115,22,0.2)"  },
  hubspot:         { glow: "bg-rose-500/20",    border: "rgba(244,63,94,0.2)"   },
  salesforce:      { glow: "bg-cyan-500/20",    border: "rgba(6,182,212,0.2)"   },
  mcp:             { glow: "bg-indigo-500/20",  border: "rgba(99,102,241,0.2)"  },
};

// ── Webhook Events ──────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  { event: "call.started",      description: "When a call begins" },
  { event: "call.ended",        description: "When a call completes" },
  { event: "call.failed",       description: "When a call fails" },
  { event: "transcript.ready",  description: "When transcript is available" },
  { event: "analysis.complete", description: "When call analysis finishes" },
  { event: "webhook.test",      description: "Test webhook delivery" },
];

const CATEGORY_LABELS: Record<string, string> = {
  crm: "CRM & Sales",
  automation: "Automation & API",
  communication: "Communication",
  calendar: "Calendar",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  crm: "Sync contacts, calls, and deals with your CRM",
  automation: "Connect workflows and build custom automations",
  communication: "Team notifications and alerts",
  calendar: "Schedule and manage appointments",
};

const CATEGORY_ICONS: Record<string, string> = {
  crm: "🏢",
  automation: "⚡",
  communication: "💬",
  calendar: "📅",
};

// ==========================================
// Integration Card Component
// ==========================================
function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  isConnecting,
}: {
  integration: {
    id: string; name: string; description: string; icon: string;
    category: string; authType: string; status: string; connected: boolean;
    planAllowed: boolean; lastSyncedAt: Date | string | null;
    errorMessage: string | null; config: unknown; hasWebhookUrl: boolean;
    docsUrl?: string;
  };
  onConnect: (id: string, type: string) => void;
  onDisconnect: (id: string) => void;
  isConnecting: boolean;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const accent = CARD_ACCENTS[integration.id] ?? { glow: "bg-indigo-500/20", border: "rgba(99,102,241,0.2)" };

  const isConnected = integration.status === "connected";
  const isError     = integration.status === "error";

  const handleConnect = () => {
    if (integration.authType === "webhook_url") {
      if (showUrlInput && webhookUrl) { onConnect(integration.id, webhookUrl); setShowUrlInput(false); }
      else { setShowUrlInput(true); }
    } else {
      onConnect(integration.id, "oauth");
    }
  };

  return (
    <div
      className="group relative flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : isError ? "rgba(239,68,68,0.25)" : "rgba(99,102,241,0.12)"}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Corner glow */}
      <div className={`pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity ${accent.glow}`} />

      {/* Header row */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent.border}` }}
          >
            {EMOJI_ICONS[integration.id] || "🔗"}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{integration.name}</h3>
            {/* Status badge */}
            {isConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            ) : isError ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
                <AlertCircle className="h-3 w-3" /> Error
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/5 text-white/40 border border-white/10">
                Not connected
              </span>
            )}
          </div>
        </div>
        {/* Docs link */}
        {integration.docsUrl && (
          integration.docsUrl.startsWith("/") ? (
            <Link href={integration.docsUrl} className="text-white/30 hover:text-white/70 transition-colors" title="View docs">
              <BookOpen className="h-4 w-4" />
            </Link>
          ) : (
            <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/70 transition-colors" title="View docs">
              <ExternalLink className="h-4 w-4" />
            </a>
          )
        )}
      </div>

      {/* Description */}
      <p className="relative mt-3 text-xs text-white/50 leading-relaxed flex-1">{integration.description}</p>

      {/* Error message */}
      {integration.errorMessage && (
        <p className="relative mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{integration.errorMessage}</p>
      )}

      {/* Last synced */}
      {integration.lastSyncedAt && isConnected && (
        <p className="relative mt-2 text-[11px] text-white/30">
          Last synced: {new Date(integration.lastSyncedAt).toLocaleDateString()}
        </p>
      )}

      {/* Webhook URL input */}
      {showUrlInput && !integration.connected && (
        <div className="relative mt-3">
          <Input
            placeholder={
              integration.id === "mcp"     ? "https://your-mcp-server.com/sse" :
              integration.id === "make"    ? "https://hook.us1.make.com/your-scenario" :
              "https://hooks.zapier.com/hooks/catch/..."
            }
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-xs"
          />
        </div>
      )}

      {/* Action button */}
      <div className="relative mt-4">
        {!integration.planAllowed ? (
          <Button size="sm" variant="outline" disabled className="w-full border-white/10 text-white/30 text-xs">
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Professional+ Required
          </Button>
        ) : isConnected ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDisconnect(integration.id)}
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs transition-all"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
          >
            {isConnecting ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Connecting...</>
            ) : (
              <><Zap className="mr-1.5 h-3.5 w-3.5" />Connect</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Webhook Endpoint Card
// ==========================================
function WebhookEndpointCard({
  endpoint, onDelete, onTest, onRefreshSecret,
}: {
  endpoint: {
    id: string; url: string; secret: string; events: string[];
    isActive: boolean; description?: string | null; _count: { logs: number };
  };
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onRefreshSecret: (id: string) => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const logsQuery = trpc.integrations.webhooks.logs.useQuery(
    { endpointId: endpoint.id, limit: 10 },
    { enabled: showLogs }
  );

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: `1px solid ${endpoint.isActive ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* URL row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-400 shrink-0" />
            <p className="text-sm font-medium text-white truncate">{endpoint.url}</p>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                endpoint.isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "bg-white/5 text-white/40 border border-white/10"
              }`}
            >
              {endpoint.isActive ? "Active" : "Paused"}
            </span>
          </div>
          {endpoint.description && (
            <p className="mt-1 text-xs text-white/40">{endpoint.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {endpoint.events.map((event) => (
              <span
                key={event}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              >
                {event}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Secret row */}
      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2">
        <code className="text-xs text-white/50 flex-1 truncate font-mono">
          {showSecret ? endpoint.secret : `${endpoint.secret.substring(0, 10)}${"•".repeat(20)}`}
        </code>
        <button onClick={() => setShowSecret(!showSecret)} className="text-white/30 hover:text-white/60 transition-colors">
          {showSecret ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(endpoint.secret); toast.success("Secret copied"); }}
          className="text-white/30 hover:text-white/60 transition-colors"
          title="Copy secret"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onRefreshSecret(endpoint.id)}
          className="text-white/30 hover:text-white/60 transition-colors"
          title="Regenerate secret"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTest(endpoint.id)}
          className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white text-xs"
        >
          <TestTube className="mr-1.5 h-3.5 w-3.5" />
          Test
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogs(!showLogs)}
          className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white text-xs"
        >
          Logs ({endpoint._count.logs})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(endpoint.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Log list */}
      {showLogs && (
        <div className="border-t border-white/8 pt-3 space-y-2 max-h-48 overflow-y-auto">
          {logsQuery.isLoading && <p className="text-xs text-white/40">Loading logs...</p>}
          {logsQuery.data?.length === 0 && <p className="text-xs text-white/40">No delivery logs yet</p>}
          {logsQuery.data?.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs">
              {log.success ? (
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <X className="h-3 w-3 text-red-400 shrink-0" />
              )}
              <span className="font-mono text-[10px] bg-white/5 text-white/50 rounded px-1.5 py-0.5">{log.event}</span>
              <span className="text-white/30">{log.statusCode || "—"}</span>
              <span className="text-white/25 ml-auto">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main Page
// ==========================================
export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookDescription, setNewWebhookDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    WEBHOOK_EVENTS.filter((e) => e.event !== "webhook.test").map((e) => e.event)
  );

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) { toast.success(`${connected} connected successfully!`); window.history.replaceState({}, "", "/dashboard/integrations"); }
    if (error) { toast.error(decodeURIComponent(error)); window.history.replaceState({}, "", "/dashboard/integrations"); }
  }, [searchParams]);

  const integrationsQuery = trpc.integrations.list.useQuery();
  const webhooksQuery     = trpc.integrations.webhooks.list.useQuery();

  const getOAuthUrl = trpc.integrations.getOAuthUrl.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (error) => { toast.error(error.message); setConnectingId(null); },
  });

  const connectWebhook = trpc.integrations.connectWebhook.useMutation({
    onSuccess: () => { toast.success("Integration connected!"); integrationsQuery.refetch(); setConnectingId(null); },
    onError: (error) => { toast.error(error.message); setConnectingId(null); },
  });

  const disconnect = trpc.integrations.disconnect.useMutation({
    onSuccess: () => { toast.success("Integration disconnected"); integrationsQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const createWebhook = trpc.integrations.webhooks.create.useMutation({
    onSuccess: (data) => {
      toast.success("Webhook created! Secret: " + data.secret.substring(0, 15) + "...");
      webhooksQuery.refetch();
      setShowAddWebhook(false);
      setNewWebhookUrl("");
      setNewWebhookDescription("");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteWebhook    = trpc.integrations.webhooks.delete.useMutation({
    onSuccess: () => { toast.success("Webhook endpoint deleted"); webhooksQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const testWebhook = trpc.integrations.webhooks.test.useMutation({
    onSuccess: (result) => {
      if (result.success) toast.success(`Test delivered! Status: ${result.statusCode}`);
      else toast.error(`Test failed. Status: ${result.statusCode || "No response"}`);
      webhooksQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const refreshSecret = trpc.integrations.webhooks.refreshSecret.useMutation({
    onSuccess: (data) => { toast.success("Secret refreshed: " + data.secret.substring(0, 15) + "..."); webhooksQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const handleConnect = (id: string, typeOrUrl: string) => {
    setConnectingId(id);
    const info = integrationsQuery.data?.find((i) => i.id === id);
    if (info?.authType === "webhook_url") {
      connectWebhook.mutate({ type: id as IntegrationType, webhookUrl: typeOrUrl });
    } else {
      getOAuthUrl.mutate({ type: id as IntegrationType });
    }
  };

  const handleDisconnect = (id: string) => {
    disconnect.mutate({ type: id as IntegrationType });
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  const categories   = ["automation", "crm", "communication", "calendar"];
  const integrations = integrationsQuery.data || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Integrations</h1>
            <p className="mt-1 text-sm text-white/55 max-w-md">
              Connect your tools and automate workflows. Sync data, trigger actions, and extend your agents&apos; capabilities.
            </p>
          </div>
          <Link
            href="/dashboard/integrations/docs"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" /> View Docs
          </Link>
        </div>
      </div>

      {/* ── Plan gating banner ─────────────────────────────────── */}
      {integrations.length > 0 && !integrations[0]?.planAllowed && (
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03))",
            border: "1px solid rgba(234,179,8,0.25)",
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/15 border border-yellow-500/25 shrink-0">
            <Lock className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Upgrade to Professional</p>
            <p className="text-xs text-white/55 mt-0.5">
              Integrations are available on Professional plans and above.{" "}
              <Link href="/dashboard/settings/billing" className="text-yellow-400 underline hover:text-yellow-300">
                Upgrade now
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Webhooks Section ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
            >
              <Webhook className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Outbound Webhooks</h2>
              <p className="text-xs text-white/45">Receive real-time call events via HTTP POST</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddWebhook(!showAddWebhook)}
            size="sm"
            className={showAddWebhook
              ? "border-white/15 text-white/60 bg-white/5 hover:bg-white/10 text-xs"
              : "text-xs font-semibold"}
            variant={showAddWebhook ? "outline" : "default"}
            style={showAddWebhook ? {} : {
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}
          >
            {showAddWebhook ? "Cancel" : <><Plus className="mr-1.5 h-4 w-4" /> Add Endpoint</>}
          </Button>
        </div>

        {/* Add webhook form */}
        {showAddWebhook && (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">Endpoint URL</Label>
              <Input
                placeholder="https://your-server.com/api/webhooks/voxforge"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">Description <span className="text-white/30">(optional)</span></Label>
              <Input
                placeholder="e.g., Production webhook for call tracking"
                value={newWebhookDescription}
                onChange={(e) => setNewWebhookDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">Events to subscribe</Label>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {WEBHOOK_EVENTS.filter((e) => e.event !== "webhook.test").map((evt, i, arr) => (
                  <label
                    key={evt.event}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${i !== arr.length - 1 ? "border-b border-white/8" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(evt.event)}
                      onChange={() => toggleEvent(evt.event)}
                      className="h-4 w-4 rounded border-white/20 accent-indigo-500"
                    />
                    <div>
                      <code className="text-sm font-mono font-medium text-indigo-300">{evt.event}</code>
                      <p className="text-xs text-white/40">{evt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <Button
              onClick={() => {
                if (!newWebhookUrl) { toast.error("Please enter a webhook URL"); return; }
                createWebhook.mutate({ url: newWebhookUrl, events: selectedEvents, description: newWebhookDescription || undefined });
              }}
              disabled={createWebhook.isPending}
              className="font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
            >
              {createWebhook.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Webhook Endpoint"}
            </Button>
          </div>
        )}

        {/* Existing endpoints */}
        {webhooksQuery.data && webhooksQuery.data.length > 0 && (
          <div className="space-y-3">
            {webhooksQuery.data.map((endpoint) => (
              <WebhookEndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                onDelete={(id) => deleteWebhook.mutate({ id })}
                onTest={(id) => testWebhook.mutate({ id })}
                onRefreshSecret={(id) => refreshSecret.mutate({ id })}
              />
            ))}
          </div>
        )}

        {webhooksQuery.data?.length === 0 && !showAddWebhook && (
          <div
            className="rounded-2xl border-dashed border-2 border-white/8 p-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              <Webhook className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white/50">No webhook endpoints yet</p>
            <p className="mt-1 text-xs text-white/30">Add an endpoint to receive real-time call events in your system.</p>
          </div>
        )}
      </div>

      {/* ── REST API Card ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #2563eb, #0ea5e9)", boxShadow: "0 4px 12px rgba(37,99,235,0.35)" }}
          >
            <Key className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">REST API</h2>
            <p className="text-xs text-white/45 mt-0.5">Build custom integrations with the VoxForge REST API</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-blue-500/25 text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/40 text-xs"
        >
          <Link href="/dashboard/settings/api-keys">
            Manage Keys
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* ── Integration Categories ───────────────────────────────── */}
      {categories.map((categoryId) => {
        const cats = integrations.filter((i) => i.category === categoryId);
        if (cats.length === 0) return null;
        return (
          <div key={categoryId} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{CATEGORY_ICONS[categoryId] || "🔗"}</span>
              <div>
                <h2 className="font-semibold text-white">{CATEGORY_LABELS[categoryId] || categoryId}</h2>
                <p className="text-xs text-white/40">{CATEGORY_DESCRIPTIONS[categoryId] || ""}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cats.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  isConnecting={connectingId === integration.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Loading state */}
      {integrationsQuery.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      )}

      {/* ── Request Integration CTA ─────────────────────────────── */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))",
          border: "2px dashed rgba(99,102,241,0.2)",
        }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <Plug className="h-7 w-7 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Need another integration?</h3>
        <p className="mt-2 text-sm text-white/45 max-w-sm mx-auto">
          Let us know which tools you&apos;d like us to integrate with next. We&apos;re always expanding our catalog.
        </p>
        <Button
          variant="outline"
          className="mt-5 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/50 text-sm"
        >
          Request Integration
        </Button>
      </div>
    </div>
  );
}
