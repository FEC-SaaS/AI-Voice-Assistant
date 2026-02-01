"use client";

import { useState } from "react";
import {
  Phone, Hash, Loader2, Trash2, Plus, Globe, Zap, Upload, PhoneIncoming, PhoneOutgoing,
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
  const [activePanel, setActivePanel] = useState<"none" | "twilio">("none");

  // Twilio import state
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");

  const importTwilio = trpc.phoneNumbers.importTwilio.useMutation({
    onSuccess: () => {
      toast.success("Twilio phone number imported successfully!");
      setActivePanel("none");
      setTwilioAccountSid("");
      setTwilioAuthToken("");
      setTwilioPhoneNumber("");
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
        <Button onClick={() => setActivePanel(activePanel === "twilio" ? "none" : "twilio")}>
          <Upload className="mr-2 h-4 w-4" />
          Import Twilio Number
        </Button>
      </div>

      {/* Import Twilio Number Panel */}
      {activePanel === "twilio" && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Import Twilio Phone Number</h3>
              <p className="mt-1 text-sm text-gray-500">
                Import your existing Twilio phone number for full inbound and outbound calling support.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
              <Input
                id="twilioAccountSid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioAccountSid}
                onChange={(e) => setTwilioAccountSid(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
              <Input
                id="twilioAuthToken"
                type="password"
                placeholder="Your Twilio Auth Token"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilioPhoneNumber">Phone Number (E.164 format)</Label>
              <Input
                id="twilioPhoneNumber"
                placeholder="+14155551234"
                value={twilioPhoneNumber}
                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friendlyName">Label (optional)</Label>
              <Input
                id="friendlyName"
                placeholder="e.g., Sales Line"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => importTwilio.mutate({
                twilioAccountSid,
                twilioAuthToken,
                phoneNumber: twilioPhoneNumber,
                friendlyName: friendlyName || undefined,
              })}
              disabled={importTwilio.isPending || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber}
            >
              {importTwilio.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Import Number</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setActivePanel("none")}>
              Cancel
            </Button>
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> You can find your Account SID and Auth Token in your{" "}
              <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                Twilio Console
              </a>. The phone number must be in E.164 format (e.g., +14155551234 for US, +233558256383 for Ghana).
            </p>
          </div>
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
          <Button className="mt-6" onClick={() => setActivePanel("twilio")}>
            <Upload className="mr-2 h-4 w-4" />
            Import Twilio Number
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

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <PhoneOutgoing className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Outbound Calling</h4>
              <p className="mt-1 text-sm text-blue-700">
                To make outbound calls (test calls, campaigns), you need to import a Twilio phone number with a paid Twilio account.
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-blue-700 space-y-1">
                <li>Twilio trial accounts can only call verified numbers</li>
                <li>Upgrade Twilio for international calling</li>
                <li>Import your Twilio number here</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex gap-3">
            <PhoneIncoming className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <h4 className="font-medium text-green-900">Inbound Calling</h4>
              <p className="mt-1 text-sm text-green-700">
                For receiving calls, you can use either Twilio numbers or Vapi&apos;s free SIP endpoints.
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-green-700 space-y-1">
                <li>Twilio numbers work for both inbound and outbound</li>
                <li>Share your number to receive AI-handled calls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
