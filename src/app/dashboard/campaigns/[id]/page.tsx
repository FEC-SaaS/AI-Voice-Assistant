"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Square,
  Users,
  Phone,
  Clock,
  Calendar,
  Bot,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  UserPlus,
  Search,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEFAULT_STATUS = { label: "Draft", color: "text-gray-600", bgColor: "bg-gray-100" };
const DEFAULT_CONTACT_STATUS = { label: "Pending", color: "text-gray-600", icon: Clock };

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: DEFAULT_STATUS,
  scheduled: { label: "Scheduled", color: "text-blue-600", bgColor: "bg-blue-100" },
  running: { label: "Running", color: "text-green-600", bgColor: "bg-green-100" },
  paused: { label: "Paused", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  completed: { label: "Completed", color: "text-purple-600", bgColor: "bg-purple-100" },
};

const CONTACT_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: DEFAULT_CONTACT_STATUS,
  called: { label: "Called", color: "text-blue-600", icon: Phone },
  completed: { label: "Completed", color: "text-green-600", icon: CheckCircle },
  failed: { label: "Failed", color: "text-red-600", icon: XCircle },
  dnc: { label: "DNC", color: "text-orange-600", icon: AlertCircle },
};

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAssignExisting, setShowAssignExisting] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [newContact, setNewContact] = useState({ phoneNumber: "", firstName: "", lastName: "" });
  const [actioningId, setActioningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaign, isLoading, refetch } = trpc.campaigns.get.useQuery({ id: params.id });
  const { data: stats } = trpc.campaigns.getStats.useQuery({ id: params.id });
  const { data: contactsData, refetch: refetchContacts } = trpc.contacts.list.useQuery({
    campaignId: params.id,
    limit: 50,
  });

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

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      setNewContact({ phoneNumber: "", firstName: "", lastName: "" });
      setShowAddContact(false);
      refetchContacts();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkCreate = trpc.contacts.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.created} contacts`);
      if (result.skippedDNC > 0) {
        toast.warning(`${result.skippedDNC} contacts skipped (DNC list)`);
      }
      if (result.skippedDuplicate > 0) {
        toast.info(`${result.skippedDuplicate} duplicates skipped`);
      }
      refetchContacts();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact removed");
      refetchContacts();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Fetch unassigned contacts for the "Assign Existing" modal
  const { data: unassignedContacts, isLoading: loadingUnassigned } = trpc.contacts.list.useQuery(
    { search: assignSearch, limit: 50, noCampaign: true },
    { enabled: showAssignExisting }
  );

  const assignToCampaign = trpc.contacts.assignToCampaign.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.updated} contact(s) assigned to campaign`);
      setShowAssignExisting(false);
      setSelectedContactIds(new Set());
      setAssignSearch("");
      refetchContacts();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (action: "start" | "pause" | "resume" | "complete") => {
    setActioningId(action);
    switch (action) {
      case "start":
        startCampaign.mutate({ id: params.id });
        break;
      case "pause":
        pauseCampaign.mutate({ id: params.id });
        break;
      case "resume":
        resumeCampaign.mutate({ id: params.id });
        break;
      case "complete":
        completeCampaign.mutate({ id: params.id });
        break;
    }
  };

  const handleAddContact = () => {
    if (!newContact.phoneNumber) {
      toast.error("Phone number is required");
      return;
    }
    createContact.mutate({ ...newContact, campaignId: params.id });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error("CSV file must have a header row and at least one contact");
        return;
      }

      const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
      const phoneIdx = headers.findIndex((h) => h.includes("phone"));
      const firstNameIdx = headers.findIndex((h) => h.includes("first"));
      const lastNameIdx = headers.findIndex((h) => h.includes("last"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const companyIdx = headers.findIndex((h) => h.includes("company"));

      if (phoneIdx === -1) {
        toast.error("CSV must have a column containing 'phone'");
        return;
      }

      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]!.split(",").map((v) => v.trim());
        const phone = values[phoneIdx];
        if (!phone) continue;

        contacts.push({
          phoneNumber: phone,
          firstName: firstNameIdx >= 0 ? values[firstNameIdx] : undefined,
          lastName: lastNameIdx >= 0 ? values[lastNameIdx] : undefined,
          email: emailIdx >= 0 ? values[emailIdx] : undefined,
          company: companyIdx >= 0 ? values[companyIdx] : undefined,
        });
      }

      if (contacts.length === 0) {
        toast.error("No valid contacts found in CSV");
        return;
      }

      bulkCreate.mutate({ contacts, campaignId: params.id });
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Campaign not found</h2>
        <Link href="/dashboard/campaigns" className="mt-4 inline-block text-primary hover:underline">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[campaign.status] ?? DEFAULT_STATUS;
  const callingHours = campaign.callingHours as { start: string; end: string };
  const isActioning = actioningId !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            {campaign.description && (
              <p className="mt-1 text-gray-500">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <Button onClick={() => handleAction("start")} disabled={isActioning}>
              {actioningId === "start" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Campaign
            </Button>
          )}
          {campaign.status === "running" && (
            <>
              <Button variant="outline" onClick={() => handleAction("pause")} disabled={isActioning}>
                {actioningId === "pause" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Pause
              </Button>
              <Button variant="outline" onClick={() => handleAction("complete")} disabled={isActioning}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <Button onClick={() => handleAction("resume")} disabled={isActioning}>
                {actioningId === "resume" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Resume
              </Button>
              <Button variant="outline" onClick={() => handleAction("complete")} disabled={isActioning}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            Total Contacts
          </div>
          <p className="mt-1 text-2xl font-bold">{stats?.contacts.total || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Phone className="h-4 w-4" />
            Calls Made
          </div>
          <p className="mt-1 text-2xl font-bold">{stats?.calls.total || 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            Progress
          </div>
          <p className="mt-1 text-2xl font-bold">{stats?.progress || 0}%</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Total Duration
          </div>
          <p className="mt-1 text-2xl font-bold">
            {Math.round((stats?.duration.total || 0) / 60)}m
          </p>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Agent</span>
              <Link
                href={`/dashboard/agents/${campaign.agent?.id}`}
                className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Bot className="h-4 w-4" />
                {campaign.agent?.name}
              </Link>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Calling Hours</span>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                <Clock className="h-4 w-4 text-gray-400" />
                {callingHours?.start} - {callingHours?.end} ({campaign.timeZone})
              </div>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Max Calls/Day</span>
              <p className="mt-1 text-sm text-gray-900">{campaign.maxCallsPerDay}</p>
            </div>
            {campaign.scheduleStart && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-400">Schedule</span>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(campaign.scheduleStart)}
                  {campaign.scheduleEnd && ` - ${formatDate(campaign.scheduleEnd)}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Status Breakdown */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contact Status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(CONTACT_STATUS).map(([key, config]) => {
              const count = stats?.contacts[key as keyof typeof stats.contacts] || 0;
              const total = stats?.contacts.total || 1;
              const percentage = Math.round((count / total) * 100) || 0;
              const Icon = config.icon;

              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{config.label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sentiment
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Positive</span>
              <span className="text-sm font-medium text-green-600">{stats?.sentiment.positive || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Neutral</span>
              <span className="text-sm font-medium text-gray-600">{stats?.sentiment.neutral || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Negative</span>
              <span className="text-sm font-medium text-red-600">{stats?.sentiment.negative || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Contacts ({contactsData?.pagination.total || 0})
          </h2>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkCreate.isPending}
            >
              {bulkCreate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAssignExisting(!showAssignExisting);
                setShowAddContact(false);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Existing
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowAddContact(!showAddContact);
                setShowAssignExisting(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Assign Existing Contacts Panel */}
        {showAssignExisting && (
          <div className="border-b bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Assign Existing Contacts</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowAssignExisting(false);
                setSelectedContactIds(new Set());
                setAssignSearch("");
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="max-h-60 overflow-y-auto rounded border bg-white">
              {loadingUnassigned ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : unassignedContacts?.contacts.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {assignSearch ? "No matching contacts found" : "No unassigned contacts available"}
                </p>
              ) : (
                unassignedContacts?.contacts.map((contact) => {
                  const isSelected = selectedContactIds.has(contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = new Set(selectedContactIds);
                          if (isSelected) {
                            next.delete(contact.id);
                          } else {
                            next.add(contact.id);
                          }
                          setSelectedContactIds(next);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                            : "Unknown"}
                        </p>
                        <p className="truncate text-xs text-gray-500">{contact.phoneNumber}</p>
                      </div>
                      {contact.company && (
                        <span className="text-xs text-gray-400">{contact.company}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""} selected
              </p>
              <Button
                size="sm"
                disabled={selectedContactIds.size === 0 || assignToCampaign.isPending}
                onClick={() => {
                  assignToCampaign.mutate({
                    contactIds: Array.from(selectedContactIds),
                    campaignId: params.id,
                  });
                }}
              >
                {assignToCampaign.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Assign to Campaign
              </Button>
            </div>
          </div>
        )}

        {/* Add Contact Form */}
        {showAddContact && (
          <div className="border-b bg-gray-50 p-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={newContact.phoneNumber}
                  onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                />
              </div>
              <Button onClick={handleAddContact} disabled={createContact.isPending}>
                {createContact.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setShowAddContact(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {contactsData?.contacts.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No contacts yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add contacts manually or import a CSV file to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {contactsData?.contacts.map((contact) => {
              const contactStatus = CONTACT_STATUS[contact.status] ?? DEFAULT_CONTACT_STATUS;
              const StatusIcon = contactStatus.icon;

              return (
                <div key={contact.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          : "Unknown"}
                      </p>
                      <p className="text-sm font-mono text-gray-500">{contact.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-1 text-sm ${contactStatus.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {contactStatus.label}
                    </span>
                    {contact._count.calls > 0 && (
                      <span className="text-sm text-gray-500">{contact._count.calls} calls</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Remove this contact from the campaign?")) {
                          deleteContact.mutate({ id: contact.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
