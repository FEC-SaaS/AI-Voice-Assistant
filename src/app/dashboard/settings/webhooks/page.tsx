"use client";

import { useState } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Edit2,
  Copy,
  Crown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import Link from "next/link";

const ALL_EVENTS = [
  { id: "call.started", label: "Call Started" },
  { id: "call.ended", label: "Call Ended" },
  { id: "call.failed", label: "Call Failed" },
  { id: "transcript.ready", label: "Transcript Ready" },
  { id: "analysis.complete", label: "Analysis Complete" },
];

interface EndpointFormState {
  url: string;
  description: string;
  events: string[];
}

const DEFAULT_FORM: EndpointFormState = {
  url: "",
  description: "",
  events: [],
};

export default function WebhooksSettingsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<EndpointFormState>(DEFAULT_FORM);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [shownSecret, setShownSecret] = useState<{ id: string; secret: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: endpoints, isLoading } = trpc.integrations.webhooks.list.useQuery();
  const { data: currentUser } = trpc.users.me.useQuery();

  const createEndpoint = trpc.integrations.webhooks.create.useMutation({
    onSuccess: (data) => {
      utils.integrations.webhooks.list.invalidate();
      setCreateOpen(false);
      setForm(DEFAULT_FORM);
      // Show the secret once
      setShownSecret({ id: data.id, secret: data.secret });
      toast.success("Webhook endpoint created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateEndpoint = trpc.integrations.webhooks.update.useMutation({
    onSuccess: () => {
      utils.integrations.webhooks.list.invalidate();
      setEditId(null);
      setForm(DEFAULT_FORM);
      toast.success("Webhook endpoint updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteEndpoint = trpc.integrations.webhooks.delete.useMutation({
    onSuccess: () => {
      utils.integrations.webhooks.list.invalidate();
      setDeleteId(null);
      toast.success("Webhook endpoint deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const refreshSecret = trpc.integrations.webhooks.refreshSecret.useMutation({
    onSuccess: (data, variables) => {
      setShownSecret({ id: variables.id, secret: data.secret });
      toast.success("Secret refreshed");
    },
    onError: (err) => toast.error(err.message),
  });

  const testEndpoint = trpc.integrations.webhooks.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Test payload delivered successfully");
      } else {
        toast.error(`Test delivery failed (status ${data.statusCode ?? "unknown"})`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  // Plan gate check — Professional+ required for webhooks
  // The create mutation will throw if the plan isn't eligible
  const isPlanGated =
    !isLoading &&
    endpoints !== undefined &&
    endpoints.length === 0 &&
    !isAdmin;

  function toggleLog(id: string) {
    const next = new Set(expandedLogs);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedLogs(next);
  }

  function openEdit(endpoint: { id: string; url: string; description: string | null; events: string[] }) {
    setEditId(endpoint.id);
    setForm({
      url: endpoint.url,
      description: endpoint.description ?? "",
      events: endpoint.events,
    });
  }

  function toggleEvent(eventId: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  }

  function handleCreate() {
    if (!form.url) return toast.error("Please enter a URL");
    if (form.events.length === 0) return toast.error("Select at least one event");
    createEndpoint.mutate({
      url: form.url,
      events: form.events,
      description: form.description || undefined,
    });
  }

  function handleUpdate() {
    if (!editId) return;
    if (!form.url) return toast.error("Please enter a URL");
    if (form.events.length === 0) return toast.error("Select at least one event");
    updateEndpoint.mutate({
      id: editId,
      url: form.url,
      events: form.events,
      description: form.description || undefined,
    });
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
            <p className="text-muted-foreground">
              Receive real-time HTTP POST notifications for events in your organization
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setForm(DEFAULT_FORM); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Endpoint
            </Button>
          )}
        </div>

        {/* Plan gate banner */}
        {isPlanGated && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-400">Professional Plan Required</p>
                  <p className="text-sm text-amber-400 mt-1">
                    Outbound webhooks are available on the Professional plan and higher.
                  </p>
                  <Link href="/dashboard/settings/billing">
                    <Button variant="outline" size="sm" className="mt-3">
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endpoints list */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Endpoints</CardTitle>
            <CardDescription>
              Configure URLs to receive webhook payloads. Maximum 5 endpoints per organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
              </div>
            ) : !endpoints || endpoints.length === 0 ? (
              <div className="py-8 text-center">
                <Webhook className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No endpoints configured</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  Create a webhook endpoint to start receiving event notifications.
                </p>
                {isAdmin && (
                  <Button className="mt-4" onClick={() => { setForm(DEFAULT_FORM); setCreateOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Endpoint
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {endpoints.map((ep) => (
                  <EndpointRow
                    key={ep.id}
                    endpoint={ep}
                    isAdmin={isAdmin}
                    logsExpanded={expandedLogs.has(ep.id)}
                    onToggleLogs={() => toggleLog(ep.id)}
                    onEdit={() => openEdit(ep)}
                    onDelete={() => setDeleteId(ep.id)}
                    onTest={() => testEndpoint.mutate({ id: ep.id })}
                    onRefreshSecret={() => refreshSecret.mutate({ id: ep.id })}
                    onToggleActive={(active) =>
                      updateEndpoint.mutate({ id: ep.id, isActive: active })
                    }
                    testPending={testEndpoint.isPending}
                    refreshPending={refreshSecret.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* HMAC docs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Payload Signing
              <HelpTooltip content="Each webhook request is signed using HMAC-SHA256. Verify the X-VoxForge-Signature header in your server to confirm the payload is authentic." />
            </CardTitle>
            <CardDescription>
              Every delivery includes an{" "}
              <code className="text-xs bg-secondary px-1 py-0.5 rounded">X-VoxForge-Signature</code>{" "}
              header you can use to verify authenticity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded bg-secondary p-3 text-xs text-foreground/80 overflow-x-auto">{`// Node.js verification example
const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from('sha256=' + expected)
  );
}`}</pre>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setForm(DEFAULT_FORM); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Enter a URL and select the events you want to receive.
              </DialogDescription>
            </DialogHeader>
            <EndpointForm form={form} setForm={setForm} toggleEvent={toggleEvent} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createEndpoint.isPending}>
                {createEndpoint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Endpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editId} onOpenChange={(open) => { if (!open) { setEditId(null); setForm(DEFAULT_FORM); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Webhook Endpoint</DialogTitle>
              <DialogDescription>Update the URL, events, or description.</DialogDescription>
            </DialogHeader>
            <EndpointForm form={form} setForm={setForm} toggleEvent={toggleEvent} />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditId(null); setForm(DEFAULT_FORM); }}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateEndpoint.isPending}>
                {updateEndpoint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Secret shown once dialog */}
        <Dialog open={!!shownSecret} onOpenChange={(open) => { if (!open) setShownSecret(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Webhook Secret</DialogTitle>
              <DialogDescription>
                Copy this secret now — it will only be shown once. Use it to verify incoming webhook payloads.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                <code className="flex-1 text-sm font-mono break-all">{shownSecret?.secret}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => shownSecret && handleCopy(shownSecret.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Store this in an environment variable, e.g.{" "}
                <code className="bg-secondary px-1 py-0.5 rounded">WEBHOOK_SECRET</code>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShownSecret(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Webhook Endpoint</DialogTitle>
              <DialogDescription>
                This endpoint will stop receiving events immediately. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && deleteEndpoint.mutate({ id: deleteId })}
                disabled={deleteEndpoint.isPending}
              >
                {deleteEndpoint.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ---- Sub-components ----

function EndpointForm({
  form,
  setForm,
  toggleEvent,
}: {
  form: EndpointFormState;
  setForm: React.Dispatch<React.SetStateAction<EndpointFormState>>;
  toggleEvent: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ep-url">Endpoint URL</Label>
        <Input
          id="ep-url"
          type="url"
          placeholder="https://example.com/webhooks/voxforge"
          value={form.url}
          onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ep-desc">Description (optional)</Label>
        <Input
          id="ep-desc"
          placeholder="e.g., Production CRM sync"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Events to send</Label>
        <div className="space-y-2">
          {ALL_EVENTS.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`ev-${ev.id}`}
                checked={form.events.includes(ev.id)}
                onChange={() => toggleEvent(ev.id)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <label htmlFor={`ev-${ev.id}`} className="text-sm cursor-pointer">
                <code className="text-xs bg-secondary px-1.5 py-0.5 rounded mr-2">{ev.id}</code>
                {ev.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndpointRow({
  endpoint,
  isAdmin,
  logsExpanded,
  onToggleLogs,
  onEdit,
  onDelete,
  onTest,
  onRefreshSecret,
  onToggleActive,
  testPending,
  refreshPending,
}: {
  endpoint: {
    id: string;
    url: string;
    description: string | null;
    events: string[];
    isActive: boolean;
    updatedAt: Date | string;
    _count: { logs: number };
  };
  isAdmin: boolean;
  logsExpanded: boolean;
  onToggleLogs: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onRefreshSecret: () => void;
  onToggleActive: (active: boolean) => void;
  testPending: boolean;
  refreshPending: boolean;
}) {
  const { data: logs } = trpc.integrations.webhooks.logs.useQuery(
    { endpointId: endpoint.id, limit: 10 },
    { enabled: logsExpanded }
  );

  const truncateUrl = (url: string) => {
    if (url.length <= 50) return url;
    return url.substring(0, 47) + "...";
  };

  return (
    <div className="py-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-foreground">{truncateUrl(endpoint.url)}</code>
            <Badge variant={endpoint.isActive ? "default" : "secondary"} className="text-xs">
              {endpoint.isActive ? "Active" : "Paused"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {endpoint.events.length} event{endpoint.events.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {endpoint.description && (
            <p className="text-xs text-muted-foreground mt-1">{endpoint.description}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">
            {endpoint._count.logs} deliveries total
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <>
              <Switch
                checked={endpoint.isActive}
                onCheckedChange={onToggleActive}
                title={endpoint.isActive ? "Pause" : "Activate"}
              />
              <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTest}
                disabled={testPending}
                title="Send test payload"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshSecret}
                disabled={refreshPending}
                title="Regenerate HMAC secret"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onToggleLogs} title="View delivery logs">
            {logsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Delivery logs */}
      {logsExpanded && (
        <div className="rounded-lg border bg-secondary/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Deliveries
          </p>
          {!logs ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No deliveries yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    )}
                    <code className="text-muted-foreground">{log.event}</code>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground/70">
                    <span>{log.statusCode ? `HTTP ${log.statusCode}` : "—"}</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
