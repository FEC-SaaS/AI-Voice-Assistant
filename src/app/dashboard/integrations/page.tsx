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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type IntegrationType = "ghl" | "google_calendar" | "google_sheets" | "make" | "slack" | "zapier" | "hubspot" | "salesforce" | "mcp";

// ==========================================
// Integration Icons
// ==========================================
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

// ==========================================
// Webhook Events
// ==========================================
const WEBHOOK_EVENTS = [
  { event: "call.started", description: "When a call begins" },
  { event: "call.ended", description: "When a call completes" },
  { event: "call.failed", description: "When a call fails" },
  { event: "transcript.ready", description: "When transcript is available" },
  { event: "analysis.complete", description: "When call analysis finishes" },
  { event: "webhook.test", description: "Test webhook delivery" },
];

// ==========================================
// Category Labels
// ==========================================
const CATEGORY_LABELS: Record<string, string> = {
  crm: "CRM",
  automation: "Automation & API",
  communication: "Communication",
  calendar: "Calendar",
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
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    authType: string;
    status: string;
    connected: boolean;
    planAllowed: boolean;
    lastSyncedAt: Date | string | null;
    errorMessage: string | null;
    config: unknown;
    hasWebhookUrl: boolean;
    docsUrl?: string;
  };
  onConnect: (id: string, type: string) => void;
  onDisconnect: (id: string) => void;
  isConnecting: boolean;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const statusConfig = {
    connected: { label: "Connected", color: "bg-green-500/10 text-green-400", icon: Check },
    disconnected: { label: "Not Connected", color: "bg-secondary text-muted-foreground", icon: Plug },
    error: { label: "Error", color: "bg-red-500/10 text-red-400", icon: AlertCircle },
  };

  const status = statusConfig[integration.status as keyof typeof statusConfig] || statusConfig.disconnected;
  const StatusIcon = status.icon;

  const handleConnect = () => {
    if (integration.authType === "webhook_url") {
      if (showUrlInput && webhookUrl) {
        onConnect(integration.id, webhookUrl);
        setShowUrlInput(false);
      } else {
        setShowUrlInput(true);
      }
    } else {
      onConnect(integration.id, "oauth");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{EMOJI_ICONS[integration.id] || "🔗"}</span>
          <div>
            <h3 className="font-semibold text-foreground">{integration.name}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>
        {integration.docsUrl && (
          integration.docsUrl.startsWith("/") ? (
            <Link
              href={integration.docsUrl}
              className="text-muted-foreground hover:text-foreground"
              title="View docs"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="View docs"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{integration.description}</p>

      {integration.errorMessage && (
        <p className="mt-2 text-xs text-red-400">{integration.errorMessage}</p>
      )}

      {integration.lastSyncedAt && integration.connected && (
        <p className="mt-1 text-xs text-muted-foreground">
          Last synced: {new Date(integration.lastSyncedAt).toLocaleDateString()}
        </p>
      )}

      {/* Webhook URL input for Make/Zapier/MCP */}
      {showUrlInput && !integration.connected && (
        <div className="mt-3 space-y-2">
          <Input
            placeholder={
              integration.id === "mcp"
                ? "https://your-mcp-server.com/sse"
                : integration.id === "make"
                  ? "https://hook.us1.make.com/your-scenario"
                  : "https://hooks.zapier.com/hooks/catch/..."
            }
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!integration.planAllowed ? (
          <Button size="sm" variant="outline" disabled>
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Professional+
          </Button>
        ) : integration.connected ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDisconnect(integration.id)}
            className="text-red-400 hover:text-red-500"
          >
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>Connect</>
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
  endpoint,
  onDelete,
  onTest,
  onRefreshSecret,
}: {
  endpoint: {
    id: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    description?: string | null;
    _count: { logs: number };
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
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium text-foreground truncate">{endpoint.url}</p>
            <Badge variant={endpoint.isActive ? "default" : "secondary"}>
              {endpoint.isActive ? "Active" : "Paused"}
            </Badge>
          </div>
          {endpoint.description && (
            <p className="mt-1 text-xs text-muted-foreground">{endpoint.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {endpoint.events.map((event) => (
              <Badge key={event} variant="outline" className="text-xs">
                {event}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Secret */}
      <div className="mt-3 flex items-center gap-2">
        <code className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded flex-1 truncate">
          {showSecret ? endpoint.secret : `${endpoint.secret.substring(0, 10)}${"*".repeat(20)}`}
        </code>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecret(!showSecret)}>
          {showSecret ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            navigator.clipboard.writeText(endpoint.secret);
            toast.success("Secret copied");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRefreshSecret(endpoint.id)}
          title="Regenerate secret"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onTest(endpoint.id)}>
          <TestTube className="mr-1.5 h-3.5 w-3.5" />
          Test
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogs(!showLogs)}
        >
          Logs ({endpoint._count.logs})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(endpoint.id)}
          className="text-red-400 hover:text-red-500 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Logs */}
      {showLogs && (
        <div className="mt-3 border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
          {logsQuery.isLoading && (
            <p className="text-xs text-muted-foreground">Loading logs...</p>
          )}
          {logsQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">No delivery logs yet</p>
          )}
          {logsQuery.data?.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs">
              {log.success ? (
                <Check className="h-3 w-3 text-green-400 shrink-0" />
              ) : (
                <X className="h-3 w-3 text-red-400 shrink-0" />
              )}
              <Badge variant="outline" className="text-[10px]">
                {log.event}
              </Badge>
              <span className="text-muted-foreground">
                {log.statusCode || "—"}
              </span>
              <span className="text-muted-foreground ml-auto">
                {new Date(log.createdAt).toLocaleString()}
              </span>
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

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success(`${connected} connected successfully!`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
    if (error) {
      toast.error(decodeURIComponent(error));
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [searchParams]);

  // Queries
  const integrationsQuery = trpc.integrations.list.useQuery();
  const webhooksQuery = trpc.integrations.webhooks.list.useQuery();

  // Mutations
  const getOAuthUrl = trpc.integrations.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message);
      setConnectingId(null);
    },
  });

  const connectWebhook = trpc.integrations.connectWebhook.useMutation({
    onSuccess: () => {
      toast.success("Integration connected!");
      integrationsQuery.refetch();
      setConnectingId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setConnectingId(null);
    },
  });

  const disconnect = trpc.integrations.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Integration disconnected");
      integrationsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createWebhook = trpc.integrations.webhooks.create.useMutation({
    onSuccess: (data) => {
      toast.success("Webhook endpoint created! Secret: " + data.secret.substring(0, 15) + "...");
      webhooksQuery.refetch();
      setShowAddWebhook(false);
      setNewWebhookUrl("");
      setNewWebhookDescription("");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteWebhook = trpc.integrations.webhooks.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook endpoint deleted");
      webhooksQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const testWebhook = trpc.integrations.webhooks.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Test delivered! Status: ${result.statusCode}`);
      } else {
        toast.error(`Test failed. Status: ${result.statusCode || "No response"}`);
      }
      webhooksQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const refreshSecret = trpc.integrations.webhooks.refreshSecret.useMutation({
    onSuccess: (data) => {
      toast.success("Secret refreshed: " + data.secret.substring(0, 15) + "...");
      webhooksQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleConnect = (id: string, typeOrUrl: string) => {
    setConnectingId(id);
    const info = integrationsQuery.data?.find((i) => i.id === id);

    if (info?.authType === "webhook_url") {
      connectWebhook.mutate({
        type: id as IntegrationType,
        webhookUrl: typeOrUrl,
      });
    } else {
      getOAuthUrl.mutate({ type: id as IntegrationType });
    }
  };

  const handleDisconnect = (id: string) => {
    disconnect.mutate({ type: id as IntegrationType });
  };

  const handleCreateWebhook = () => {
    if (!newWebhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }
    createWebhook.mutate({
      url: newWebhookUrl,
      events: selectedEvents,
      description: newWebhookDescription || undefined,
    });
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  // Group integrations by category
  const categories = ["automation", "crm", "communication", "calendar"];
  const integrations = integrationsQuery.data || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your tools and services to automate workflows and extend agent capabilities
        </p>
      </div>

      {/* Plan gating banner */}
      {integrations.length > 0 && !integrations[0]?.planAllowed && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="font-medium text-foreground">Upgrade to Professional</p>
            <p className="text-sm text-muted-foreground">
              Integrations are available on Professional plans and above.{" "}
              <a href="/dashboard/settings/billing" className="text-primary underline">
                Upgrade now
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Outbound Webhooks Section */}
      {/* ============================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Webhooks</h2>
              <p className="text-sm text-muted-foreground">
                Receive real-time call events via HTTP POST to your endpoints
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddWebhook(!showAddWebhook)}
            variant={showAddWebhook ? "outline" : "default"}
            size="sm"
          >
            {showAddWebhook ? "Cancel" : <><Plus className="mr-1.5 h-4 w-4" /> Add Endpoint</>}
          </Button>
        </div>

        {/* Add webhook form */}
        {showAddWebhook && (
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://your-server.com/api/webhooks/calltone"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g., Production webhook for call tracking"
                value={newWebhookDescription}
                onChange={(e) => setNewWebhookDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="rounded-lg border">
                {WEBHOOK_EVENTS.filter((e) => e.event !== "webhook.test").map((evt, i, arr) => (
                  <div
                    key={evt.event}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i !== arr.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.event)}
                        onChange={() => toggleEvent(evt.event)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div>
                        <code className="text-sm font-medium text-foreground">{evt.event}</code>
                        <p className="text-xs text-muted-foreground">{evt.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleCreateWebhook} disabled={createWebhook.isPending}>
              {createWebhook.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                "Create Webhook Endpoint"
              )}
            </Button>
          </div>
        )}

        {/* Existing webhook endpoints */}
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
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Webhook className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No webhook endpoints configured. Add one to receive real-time call events.
            </p>
          </div>
        )}
      </div>

      {/* API Keys Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Key className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">REST API</h2>
              <p className="text-sm text-muted-foreground">
                Build custom integrations with the VoxForge REST API
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="/dashboard/settings/api-keys">
              Manage Keys
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* ============================== */}
      {/* Integration Categories */}
      {/* ============================== */}
      {categories.map((categoryId) => {
        const categoryIntegrations = integrations.filter((i) => i.category === categoryId);
        if (categoryIntegrations.length === 0) return null;

        return (
          <div key={categoryId}>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {CATEGORY_LABELS[categoryId] || categoryId}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryIntegrations.map((integration) => (
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Request Integration */}
      <div className="rounded-lg border border-dashed bg-secondary p-8 text-center">
        <Plug className="mx-auto h-10 w-10 text-muted-foreground/70" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">Need another integration?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Let us know which tools you&apos;d like us to integrate with
        </p>
        <Button variant="outline" className="mt-4">
          Request Integration
        </Button>
      </div>
    </div>
  );
}
