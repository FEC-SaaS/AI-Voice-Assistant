"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Megaphone,
  Loader2,
  Play,
  Pause,
  Square,
  MoreHorizontal,
  Users,
  Phone,
  Clock,
  Calendar,
  Bot,
  Trash2,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const DEFAULT_STATUS = { label: "Draft", color: "text-gray-600", bgColor: "bg-gray-100" };

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: DEFAULT_STATUS,
  scheduled: { label: "Scheduled", color: "text-blue-600", bgColor: "bg-blue-100" },
  running: { label: "Running", color: "text-green-600", bgColor: "bg-green-100" },
  paused: { label: "Paused", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  completed: { label: "Completed", color: "text-purple-600", bgColor: "bg-purple-100" },
};

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const startCampaign = trpc.campaigns.start.useMutation({
    onSuccess: () => {
      toast.success("Campaign started!");
      refetch();
      setActioningId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setActioningId(null);
    },
  });

  const pauseCampaign = trpc.campaigns.pause.useMutation({
    onSuccess: () => {
      toast.success("Campaign paused");
      refetch();
      setActioningId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setActioningId(null);
    },
  });

  const resumeCampaign = trpc.campaigns.resume.useMutation({
    onSuccess: () => {
      toast.success("Campaign resumed");
      refetch();
      setActioningId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setActioningId(null);
    },
  });

  const completeCampaign = trpc.campaigns.complete.useMutation({
    onSuccess: () => {
      toast.success("Campaign completed");
      refetch();
      setActioningId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setActioningId(null);
    },
  });

  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (campaignId: string, action: "start" | "pause" | "resume" | "complete") => {
    setActioningId(campaignId);
    switch (action) {
      case "start":
        startCampaign.mutate({ id: campaignId });
        break;
      case "pause":
        pauseCampaign.mutate({ id: campaignId });
        break;
      case "resume":
        resumeCampaign.mutate({ id: campaignId });
        break;
      case "complete":
        completeCampaign.mutate({ id: campaignId });
        break;
    }
  };

  const handleDelete = (campaignId: string, name: string) => {
    if (confirm(`Delete campaign "${name}"? This cannot be undone.`)) {
      deleteCampaign.mutate({ id: campaignId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500">
            {campaigns?.length
              ? `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`
              : "Create and manage outbound calling campaigns"}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="w-full sm:w-auto rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Campaigns List */}
      {!campaigns?.length ? (
        <div className="rounded-2xl border border-gray-200/50 bg-white p-8 lg:p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
            <Megaphone className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No campaigns yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Create a campaign to start making outbound calls to your contacts.
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button className="mt-6 rounded-xl shadow-md shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const status = STATUS_CONFIG[campaign.status] ?? DEFAULT_STATUS;
            const isActioning = actioningId === campaign.id;
            const callingHours = campaign.callingHours as { start: string; end: string };

            return (
              <div
                key={campaign.id}
                className="rounded-2xl border border-gray-200/50 bg-white p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary truncate block"
                    >
                      {campaign.name}
                    </Link>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${status.bgColor} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>
                          <Settings className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                {campaign.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{campaign.description}</p>
                )}

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Bot className="h-4 w-4" />
                    <span className="truncate">{campaign.agent?.name || "No agent"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{campaign._count.contacts} contacts</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{campaign._count.calls} calls</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{callingHours?.start} - {callingHours?.end}</span>
                  </div>
                </div>

                {/* Schedule */}
                {campaign.scheduleStart && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {formatDate(campaign.scheduleStart)}
                      {campaign.scheduleEnd && ` - ${formatDate(campaign.scheduleEnd)}`}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {campaign.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(campaign.id, "start")}
                      disabled={isActioning}
                      className="flex-1"
                    >
                      {isActioning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Start
                    </Button>
                  )}
                  {campaign.status === "running" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(campaign.id, "pause")}
                        disabled={isActioning}
                        className="flex-1"
                      >
                        {isActioning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Pause className="mr-2 h-4 w-4" />
                        )}
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(campaign.id, "complete")}
                        disabled={isActioning}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {campaign.status === "paused" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAction(campaign.id, "resume")}
                        disabled={isActioning}
                        className="flex-1"
                      >
                        {isActioning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(campaign.id, "complete")}
                        disabled={isActioning}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {(campaign.status === "completed" || campaign.status === "scheduled") && (
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        View Details
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
