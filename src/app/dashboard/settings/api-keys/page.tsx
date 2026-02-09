"use client";

import { useState } from "react";
import {
  Key, Plus, Copy, Eye, EyeOff, Trash2, Loader2,
  AlertTriangle, CheckCircle, Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const { data: currentUser } = trpc.users.me.useQuery();
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery();
  const utils = trpc.useUtils();

  const createApiKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      utils.apiKeys.list.invalidate();
      toast.success("API key created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeApiKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      setDeleteId(null);
      toast.success("API key revoked");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    createApiKey.mutate({ name: newKeyName.trim() });
  };

  const handleDeleteKey = () => {
    if (!deleteId) return;
    revokeApiKey.mutate({ keyId: deleteId });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleVisibility = (id: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for external integrations</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        )}
      </div>

      {/* Warning */}
      <Card className="border-border bg-yellow-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
            <div>
              <h4 className="font-medium text-foreground">Keep your API keys secure</h4>
              <p className="text-sm text-yellow-400 mt-1">
                API keys provide full access to your organization. Never share them publicly
                or commit them to version control. Rotate keys regularly for security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Use these keys to authenticate requests to the CallTone API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
            </div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/70" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No API keys yet</h3>
              <p className="mt-2 text-muted-foreground">Create an API key to get started with the API</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create API Key
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-secondary p-2">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{key.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {visibleKeys.has(key.id) ? key.keyPrefix : "vxf_••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground/70 mt-1">
                        <span>Created {formatDate(key.createdAt)}</span>
                        {key.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last used {formatDate(key.lastUsedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(key.keyPrefix)}
                      title="Copy key prefix"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteId(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>How to use the API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">Base URL</h4>
            <code className="mt-1 block rounded bg-secondary p-3 text-sm">
              {process.env.NEXT_PUBLIC_APP_URL || "https://app.calltone.ai"}/api/v1
            </code>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Authentication</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Include your API key in the Authorization header:
            </p>
            <code className="mt-2 block rounded bg-secondary p-3 text-sm overflow-x-auto">
              Authorization: Bearer vxf_your_api_key_here
            </code>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Example Request</h4>
            <pre className="mt-2 rounded bg-secondary p-3 text-sm text-foreground/90 overflow-x-auto">
{`curl -X GET \\
  ${process.env.NEXT_PUBLIC_APP_URL || "https://app.calltone.ai"}/api/v1/agents \\
  -H "Authorization: Bearer vxf_your_api_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
          <div className="pt-2">
            <Badge variant="secondary">Available Endpoints</Badge>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><code className="text-primary">GET /agents</code> - List all agents</li>
              <li><code className="text-primary">POST /agents</code> - Create a new agent</li>
              <li><code className="text-primary">GET /calls</code> - List call history</li>
              <li><code className="text-primary">POST /calls</code> - Initiate a call</li>
              <li><code className="text-primary">GET /campaigns</code> - List campaigns</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setCreatedKey(null);
          setNewKeyName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Your API key has been created. Copy it now - you won't be able to see it again."
                : "Give your API key a name to help you remember what it's for."}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-500/10 border border-border p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">API Key Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-card border p-2 text-sm font-mono break-all">
                    {createdKey}
                  </code>
                  <Button size="sm" onClick={() => handleCopy(createdKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Make sure to copy your API key now. For security reasons, we don&apos;t store the full key
                and you won&apos;t be able to see it again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button onClick={() => {
                setCreateOpen(false);
                setCreatedKey(null);
                setNewKeyName("");
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
                  {createApiKey.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this API key? Any integrations using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              disabled={revokeApiKey.isPending}
            >
              {revokeApiKey.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
