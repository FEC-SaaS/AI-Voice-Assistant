"use client";

import { useState } from "react";
import {
  Phone, Hash, Loader2, Trash2, Plus, Globe, Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PhoneNumbersPage() {
  const { data: phoneNumbers, isLoading, refetch } = trpc.phoneNumbers.list.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();

  // Panel state
  const [showGetPanel, setShowGetPanel] = useState(false);

  // Get number state
  const [friendlyName, setFriendlyName] = useState("");

  const getFreeNumber = trpc.phoneNumbers.getFreeNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number obtained successfully!");
      setShowGetPanel(false);
      setFriendlyName("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignToAgent = trpc.phoneNumbers.assignToAgent.useMutation({
    onSuccess: () => {
      toast.success("Phone number assignment updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const release = trpc.phoneNumbers.release.useMutation({
    onSuccess: () => {
      toast.success("Phone number released");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-500">
            {phoneNumbers?.length
              ? `${phoneNumbers.length} phone number${phoneNumbers.length !== 1 ? "s" : ""}`
              : "Buy phone numbers for your AI agents"}
          </p>
        </div>
        <Button onClick={() => setShowGetPanel(!showGetPanel)}>
          <Plus className="mr-2 h-4 w-4" />
          Get Phone Number
        </Button>
      </div>

      {/* Get Free Number Panel */}
      {showGetPanel && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Get a Free US Phone Number</h3>
              <p className="mt-1 text-sm text-gray-500">
                Vapi provides free US phone numbers for testing and development. You can have up to 10 free numbers per account.
              </p>
            </div>
          </div>
          <div className="mt-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="friendlyName">Label (optional)</Label>
              <Input
                id="friendlyName"
                placeholder="e.g., Sales Line, Support"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => getFreeNumber.mutate({ friendlyName: friendlyName || undefined })}
              disabled={getFreeNumber.isPending}
            >
              {getFreeNumber.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting Number...</>
              ) : (
                <><Phone className="mr-2 h-4 w-4" /> Get Free Number</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowGetPanel(false)}>
              Cancel
            </Button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Free Vapi numbers are US-based and support both inbound and outbound calling. Perfect for testing your AI agents.
          </p>
        </div>
      )}

      {/* Phone Numbers List */}
      {!phoneNumbers?.length ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Hash className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No phone numbers yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Buy a phone number to enable voice calls with your AI agents.
          </p>
          <Button className="mt-6" onClick={() => setShowGetPanel(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Get Phone Number
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-6 py-3">Number</th>
                  <th className="px-6 py-3">Label</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Assigned Agent</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {phoneNumbers.map((pn) => (
                  <tr key={pn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {pn.number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {pn.friendlyName || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        pn.type === "toll_free"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {pn.type === "toll_free" ? "Toll-Free" : "Local"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={pn.agentId || ""}
                        onChange={(e) =>
                          assignToAgent.mutate({
                            id: pn.id,
                            agentId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {agents?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Release this phone number? This cannot be undone and you will be charged if you buy another.")) {
                            release.mutate({ id: pn.id });
                          }
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Release number"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Globe className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">About Vapi Phone Numbers</h4>
            <p className="mt-1 text-sm text-blue-700">
              Vapi provides free US phone numbers for testing your AI voice agents. For production use, you can import your own Twilio numbers.
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Up to 10 free US phone numbers per account</li>
              <li>Inbound and outbound calling support</li>
              <li>Import your own Twilio numbers for international calling</li>
              <li>Automatic carrier routing for best quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
