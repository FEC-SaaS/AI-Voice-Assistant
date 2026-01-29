"use client";

import { useState } from "react";
import {
  Key, Plus, Copy, Eye, EyeOff, Trash2, Loader2,
  AlertTriangle, CheckCircle,
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

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsed?: string;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "vxf_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const { data: currentUser } = trpc.users.me.useQuery();
  const utils = trpc.useUtils();

  // Get API keys from organization settings
  const apiKeys: ApiKey[] = (currentUser?.organization?.settings as { apiKeys?: ApiKey[] })?.apiKeys || [];

  const updateOrg = trpc.users.updateOrganization.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate();
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

    const fullKey = generateApiKey();
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      keyPrefix: fullKey.substring(0, 12) + "...",
      createdAt: new Date().toISOString(),
    };

    const existingKeys = apiKeys;
    updateOrg.mutate({
      settings: {
        ...(currentUser?.organization?.settings as object || {}),
        apiKeys: [...existingKeys, newKey],
      },
    });

    setCreatedKey(fullKey);
    setNewKeyName("");
    toast.success("API key created");
  };

  const handleDeleteKey = () => {
    if (!deleteId) return;

    const existingKeys = apiKeys.filter((k) => k.id !== deleteId);
    updateOrg.mutate({
      settings: {
        ...(currentUser?.organization?.settings as object || {}),
        apiKeys: existingKeys,
      },
    });

    setDeleteId(null);
    toast.success("API key deleted");
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

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500">Manage API keys for external integrations</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        )}
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800">Keep your API keys secure</h4>
              <p className="text-sm text-yellow-700 mt-1">
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
            Use these keys to authenticate requests to the VoxForge API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No API keys yet</h3>
              <p className="mt-2 text-gray-500">Create an API key to get started with the API</p>
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
                    <div className="rounded-lg bg-gray-100 p-2">
                      <Key className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{key.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
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
                      <p className="text-xs text-gray-400 mt-1">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(key.keyPrefix)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <h4 className="font-medium text-gray-900">Base URL</h4>
            <code className="mt-1 block rounded bg-gray-100 p-3 text-sm">
              {process.env.NEXT_PUBLIC_APP_URL || "https://app.voxforge.ai"}/api/v1
            </code>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Authentication</h4>
            <p className="text-sm text-gray-500 mt-1">
              Include your API key in the Authorization header:
            </p>
            <code className="mt-2 block rounded bg-gray-100 p-3 text-sm overflow-x-auto">
              Authorization: Bearer vxf_your_api_key_here
            </code>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Example Request</h4>
            <pre className="mt-2 rounded bg-gray-900 p-3 text-sm text-gray-100 overflow-x-auto">
{`curl -X GET \\
  ${process.env.NEXT_PUBLIC_APP_URL || "https://app.voxforge.ai"}/api/v1/agents \\
  -H "Authorization: Bearer vxf_your_api_key_here" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
          <div className="pt-2">
            <Badge variant="secondary">Available Endpoints</Badge>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li><code className="text-primary">GET /agents</code> - List all agents</li>
              <li><code className="text-primary">GET /calls</code> - List call history</li>
              <li><code className="text-primary">GET /campaigns</code> - List campaigns</li>
              <li><code className="text-primary">POST /calls</code> - Initiate a call</li>
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
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">API Key Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white border p-2 text-sm font-mono break-all">
                    {createdKey}
                  </code>
                  <Button size="sm" onClick={() => handleCopy(createdKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
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
                <Button onClick={handleCreateKey} disabled={updateOrg.isPending}>
                  {updateOrg.isPending ? (
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
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? Any integrations using this key will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              disabled={updateOrg.isPending}
            >
              {updateOrg.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
