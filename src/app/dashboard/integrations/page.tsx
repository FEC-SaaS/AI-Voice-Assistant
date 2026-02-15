"use client";

import { useState, useCallback } from "react";
import {
  Plug,
  ExternalLink,
  Check,
  Clock,
  Webhook,
  Key,
  Copy,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "available" | "connected" | "coming_soon";
  category: "crm" | "communication" | "automation" | "calendar";
}

const INTEGRATIONS: Integration[] = [
  {
    id: "webhook",
    name: "Webhooks",
    description: "Receive real-time notifications for call events via HTTP webhooks",
    icon: "🔗",
    status: "available",
    category: "automation",
  },
  {
    id: "api",
    name: "REST API",
    description: "Build custom integrations with our comprehensive REST API",
    icon: "🔌",
    status: "available",
    category: "automation",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 5,000+ apps with automated workflows",
    icon: "⚡",
    status: "coming_soon",
    category: "automation",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and log call activities to HubSpot CRM",
    icon: "🟠",
    status: "coming_soon",
    category: "crm",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Integrate with Salesforce for lead management and call logging",
    icon: "☁️",
    status: "coming_soon",
    category: "crm",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync deals and contacts with Pipedrive CRM",
    icon: "🟢",
    status: "coming_soon",
    category: "crm",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get real-time call notifications in your Slack channels",
    icon: "💬",
    status: "coming_soon",
    category: "communication",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Schedule calls and sync with Google Calendar",
    icon: "📅",
    status: "coming_soon",
    category: "calendar",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Integrate appointment scheduling with your voice agents",
    icon: "📆",
    status: "coming_soon",
    category: "calendar",
  },
];

const WEBHOOK_EVENTS = [
  { event: "call.started", description: "When a call begins" },
  { event: "call.ended", description: "When a call completes" },
  { event: "call.failed", description: "When a call fails" },
  { event: "transcript.ready", description: "When transcript is available" },
  { event: "analysis.complete", description: "When call analysis finishes" },
];

function generateSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusConfig = {
    available: { label: "Available", color: "bg-green-500/10 text-green-400", icon: Check },
    connected: { label: "Connected", color: "bg-blue-500/10 text-blue-400", icon: Check },
    coming_soon: { label: "Coming Soon", color: "bg-secondary text-muted-foreground", icon: Clock },
  };

  const status = statusConfig[integration.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{integration.icon}</span>
          <div>
            <h3 className="font-semibold text-foreground">{integration.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{integration.description}</p>
      <div className="mt-4">
        {integration.status === "available" ? (
          <Button size="sm" variant="outline">
            Configure
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        ) : integration.status === "connected" ? (
          <Button size="sm" variant="outline">
            Manage
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled>
            Coming Soon
          </Button>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState(() => generateSecret());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleRefreshSecret = useCallback(async () => {
    setIsRefreshing(true);
    // Brief delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    setWebhookSecret(generateSecret());
    setIsRefreshing(false);
    toast.success("Webhook secret refreshed");
  }, []);

  const handleSaveWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Webhook configured successfully");
    setShowWebhookConfig(false);
  };

  const categories = [
    { id: "automation", label: "Automation & API", icon: Plug },
    { id: "crm", label: "CRM", icon: Plug },
    { id: "communication", label: "Communication", icon: Plug },
    { id: "calendar", label: "Calendar", icon: Plug },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect CallTone with your favorite tools and services</p>
      </div>

      {/* Webhook Configuration */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Webhooks</h2>
              <p className="text-sm text-muted-foreground">Receive real-time call events via HTTP POST</p>
            </div>
          </div>
          <Button
            variant={showWebhookConfig ? "outline" : "default"}
            onClick={() => setShowWebhookConfig(!showWebhookConfig)}
          >
            {showWebhookConfig ? "Close" : "Configure"}
          </Button>
        </div>

        {showWebhookConfig && (
          <div className="mt-6 space-y-6 border-t pt-6">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook Endpoint URL</Label>
              <Input
                id="webhookUrl"
                placeholder="https://your-server.com/api/webhooks/calltone"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll send POST requests to this URL when events occur
              </p>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <div className="flex gap-2">
                <Input value={webhookSecret} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(webhookSecret, "Webhook secret")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshSecret}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this secret to verify webhook signatures
              </p>
            </div>

            {/* Events */}
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="rounded-lg border">
                {WEBHOOK_EVENTS.map((evt, i) => (
                  <div
                    key={evt.event}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i !== WEBHOOK_EVENTS.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        defaultChecked
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

            {/* Save Button */}
            <div className="flex gap-3">
              <Button onClick={handleSaveWebhook} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Save Webhook"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowWebhookConfig(false)}>
                Cancel
              </Button>
            </div>
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
              <h2 className="font-semibold text-foreground">API Keys</h2>
              <p className="text-sm text-muted-foreground">Manage your API keys for custom integrations</p>
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

      {/* Integration Categories */}
      {categories.map((category) => {
        const categoryIntegrations = INTEGRATIONS.filter(
          (i) => i.category === category.id && i.id !== "webhook" && i.id !== "api"
        );

        if (categoryIntegrations.length === 0) return null;

        return (
          <div key={category.id}>
            <h2 className="text-lg font-semibold text-foreground mb-4">{category.label}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryIntegrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </div>
        );
      })}

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
