"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Bot,
  Clock,
  Calendar,
  Settings2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agentId: "",
    scheduleStart: "",
    scheduleEnd: "",
    timeZone: "America/New_York",
    callingHoursStart: "09:00",
    callingHoursEnd: "17:00",
    maxCallsPerDay: 100,
  });

  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (campaign) => {
      toast.success("Campaign created! Now add contacts to get started.");
      router.push(`/dashboard/campaigns/${campaign.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!formData.agentId) {
      toast.error("Please select an AI agent for this campaign");
      return;
    }

    createCampaign.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      agentId: formData.agentId,
      scheduleStart: formData.scheduleStart ? new Date(formData.scheduleStart) : undefined,
      scheduleEnd: formData.scheduleEnd ? new Date(formData.scheduleEnd) : undefined,
      timeZone: formData.timeZone,
      callingHours: {
        start: formData.callingHoursStart,
        end: formData.callingHoursEnd,
      },
      maxCallsPerDay: formData.maxCallsPerDay,
    });
  };

  const hasNoAgents = !agentsLoading && (!agents || agents.length === 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Campaign</h1>
          <p className="text-muted-foreground">Set up a new outbound calling campaign</p>
        </div>
      </div>

      {/* No Agents Warning */}
      {hasNoAgents && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">No AI agents available</h3>
              <p className="mt-1 text-sm text-yellow-400">
                You need to create an AI agent before you can create a campaign.
              </p>
              <Link href="/dashboard/agents/new">
                <Button size="sm" className="mt-3">
                  <Bot className="mr-2 h-4 w-4" />
                  Create Your First Agent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="h-5 w-5 text-muted-foreground/70" />
            <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Q1 Sales Outreach"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe the purpose of this campaign..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="agentId">AI Agent *</Label>
              <select
                id="agentId"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={agentsLoading || hasNoAgents}
              >
                <option value="">Select an agent...</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent._count.calls} calls)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                The AI agent that will make calls for this campaign
              </p>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-muted-foreground/70" />
            <h2 className="text-lg font-semibold text-foreground">Schedule (Optional)</h2>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="scheduleStart">Start Date</Label>
                <Input
                  id="scheduleStart"
                  type="datetime-local"
                  value={formData.scheduleStart}
                  onChange={(e) => setFormData({ ...formData, scheduleStart: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="scheduleEnd">End Date</Label>
                <Input
                  id="scheduleEnd"
                  type="datetime-local"
                  value={formData.scheduleEnd}
                  onChange={(e) => setFormData({ ...formData, scheduleEnd: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to start manually and run indefinitely until stopped
            </p>
          </div>
        </div>

        {/* Calling Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-muted-foreground/70" />
            <h2 className="text-lg font-semibold text-foreground">Calling Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="timeZone">Timezone</Label>
              <select
                id="timeZone"
                value={formData.timeZone}
                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/70" />
                Calling Hours
              </Label>
              <div className="mt-1 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="callingHoursStart" className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="callingHoursStart"
                    type="time"
                    value={formData.callingHoursStart}
                    onChange={(e) => setFormData({ ...formData, callingHoursStart: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="callingHoursEnd" className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    id="callingHoursEnd"
                    type="time"
                    value={formData.callingHoursEnd}
                    onChange={(e) => setFormData({ ...formData, callingHoursEnd: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Calls will only be made during these hours in the selected timezone
              </p>
            </div>

            <div>
              <Label htmlFor="maxCallsPerDay">Maximum Calls Per Day</Label>
              <Input
                id="maxCallsPerDay"
                type="number"
                min={1}
                max={1000}
                value={formData.maxCallsPerDay}
                onChange={(e) => setFormData({ ...formData, maxCallsPerDay: parseInt(e.target.value) || 100 })}
                className="mt-1 w-32"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Limit daily outbound calls to stay within budget and comply with regulations
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/campaigns">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createCampaign.isPending || hasNoAgents}>
            {createCampaign.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Megaphone className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Help */}
      <div className="rounded-lg border bg-secondary p-4">
        <h3 className="font-medium text-foreground">Next Steps</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Create the campaign with basic settings</li>
          <li>Add contacts manually or import from CSV</li>
          <li>Review and start the campaign</li>
          <li>Monitor progress and results in real-time</li>
        </ol>
      </div>
    </div>
  );
}
