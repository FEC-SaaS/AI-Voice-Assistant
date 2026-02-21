"use client";

import { useState } from "react";
import {
  Phone,
  Hash,
  Loader2,
  Trash2,
  Plus,
  Globe,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  Building2,
  Save,
  Pencil,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ProvisionMethod = "search" | "import";

// Number types supported per country — mirrors SUPPORTED_COUNTRIES in twilio.ts
const COUNTRY_NUMBER_TYPES: Record<string, { value: "local" | "toll-free" | "mobile"; label: string }[]> = {
  US: [
    { value: "local",     label: "Local" },
    { value: "toll-free", label: "Toll-Free" },
  ],
  CA: [
    { value: "local",     label: "Local" },
    { value: "toll-free", label: "Toll-Free" },
  ],
  GB: [
    { value: "local",  label: "Local" },
    { value: "mobile", label: "Mobile" },
  ],
};

// ── Component ───────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const { data: phoneNumbers, isLoading, refetch } = trpc.phoneNumbers.list.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: twilioStatus, refetch: refetchTwilioStatus } = trpc.phoneNumbers.getTwilioStatus.useQuery();

  // Panel state
  const [showPanel, setShowPanel] = useState(false);
  const [provisionMethod, setProvisionMethod] = useState<ProvisionMethod>("search");
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credSid, setCredSid] = useState("");
  const [credToken, setCredToken] = useState("");

  // Shared form state
  const [friendlyName, setFriendlyName] = useState("");
  const [callerIdName, setCallerIdName] = useState("");

  // Search & Buy state
  const [searchCountry, setSearchCountry] = useState("US");
  const [searchType, setSearchType] = useState<"local" | "toll-free" | "mobile">("local");
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ phone_number: string; friendly_name: string; locality: string; region: string }>>([]);
  const [selectedSearchNumber, setSelectedSearchNumber] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Import state
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [importPhoneNumber, setImportPhoneNumber] = useState("");

  // Inline edit state
  const [editingCallerId, setEditingCallerId] = useState<string | null>(null);
  const [editCallerIdValue, setEditCallerIdValue] = useState("");

  // ── Mutations ───────────────────────────────────────────────
  const searchAvailable = trpc.phoneNumbers.searchAvailable.useMutation({
    onSuccess: (data) => {
      setSearchResults(data.numbers);
      setHasSearched(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const buyNumber = trpc.phoneNumbers.buyNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number purchased and registered for SMS!");
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const importTwilio = trpc.phoneNumbers.importTwilio.useMutation({
    onSuccess: () => {
      toast.success("Phone number imported successfully!");
      resetForm();
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

  const retryVapiImport = trpc.phoneNumbers.retryVapiImport.useMutation({
    onSuccess: () => {
      toast.success("Phone number synced successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTwilioCredentials = trpc.phoneNumbers.updateTwilioCredentials.useMutation({
    onSuccess: () => {
      toast.success("Twilio credentials updated. SMS features enabled.");
      setShowCredentialForm(false);
      setCredSid("");
      setCredToken("");
      refetchTwilioStatus();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCallerIdName = trpc.phoneNumbers.updateCallerIdName.useMutation({
    onSuccess: () => {
      toast.success("Caller ID name updated. Changes may take 24-48h to propagate.");
      setEditingCallerId(null);
      setEditCallerIdValue("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const resetForm = () => {
    setShowPanel(false);
    setProvisionMethod("search");
    setFriendlyName("");
    setCallerIdName("");
    setSearchCountry("US");
    setSearchType("local");
    setSearchAreaCode("");
    setSearchResults([]);
    setSelectedSearchNumber(null);
    setHasSearched(false);
    setTwilioAccountSid("");
    setTwilioAuthToken("");
    setImportPhoneNumber("");
  };

  const handleSearch = () => {
    setSelectedSearchNumber(null);
    searchAvailable.mutate({
      countryCode: searchCountry,
      type: searchType,
      areaCode: searchAreaCode || undefined,
      limit: 10,
    });
  };

  const handleBuyNumber = () => {
    if (!selectedSearchNumber) return;
    buyNumber.mutate({
      phoneNumber: selectedSearchNumber,
      countryCode: searchCountry,
      type: searchType,
      friendlyName: friendlyName || undefined,
      callerIdName: callerIdName || undefined,
    });
  };

  const handleImport = () => {
    importTwilio.mutate({
      twilioAccountSid,
      twilioAuthToken,
      phoneNumber: importPhoneNumber,
      friendlyName: friendlyName || undefined,
      callerIdName: callerIdName || undefined,
    });
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case "pool":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <ShieldCheck className="h-3 w-3" />
            A2P Verified
          </span>
        );
      case "twilio-managed":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-400">
            Managed
          </span>
        );
      case "twilio-imported":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-400">
            Imported
          </span>
        );
      case "vapi":
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-400">
            Cloud Voice
          </span>
        );
      default:
        return null;
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phone Numbers</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phone Numbers</h1>
          <p className="text-muted-foreground">
            {phoneNumbers?.length
              ? `${phoneNumbers.length} phone number${phoneNumbers.length !== 1 ? "s" : ""}`
              : "Get phone numbers for your voice agents"}
          </p>
        </div>
        <Button onClick={() => setShowPanel(!showPanel)}>
          <Plus className="mr-2 h-4 w-4" />
          Get Phone Number
        </Button>
      </div>

      {/* ── Provision Panel ────────────────────────────────── */}
      {showPanel && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {/* Method tabs */}
          <div className="mb-6">
            <Label className="text-base font-semibold">How would you like to get a phone number?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setProvisionMethod("search")}
                className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  provisionMethod === "search"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  <span className="font-medium">Search & Buy</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search for a new number by area code. Auto-registered for A2P SMS.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProvisionMethod("import")}
                className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  provisionMethod === "import"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-400" />
                  <span className="font-medium">Import from Twilio</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use your existing Twilio phone number with your voice agents.
                </p>
              </button>
            </div>
          </div>

          {/* ── Search & Buy ───────────────────────────────── */}
          {provisionMethod === "search" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-medium">Auto A2P Registration</span>
                  <span className="text-emerald-600">
                    — Purchased numbers are automatically registered for compliant SMS delivery.
                  </span>
                </div>
              </div>

              {/* Search filters */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="searchCountry">Country</Label>
                  <select
                    id="searchCountry"
                    value={searchCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setSearchCountry(newCountry);
                      // Reset type if the current selection isn't valid for the new country
                      const validTypes = COUNTRY_NUMBER_TYPES[newCountry] ?? [];
                      if (!validTypes.some((t) => t.value === searchType)) {
                        setSearchType("local");
                      }
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="searchType">Type</Label>
                  <select
                    id="searchType"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as "local" | "toll-free" | "mobile")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {(COUNTRY_NUMBER_TYPES[searchCountry] ?? []).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="searchAreaCode">Area Code (optional)</Label>
                  <Input
                    id="searchAreaCode"
                    placeholder="e.g., 415"
                    value={searchAreaCode}
                    onChange={(e) => setSearchAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    maxLength={3}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={searchAvailable.isPending}
                    className="w-full"
                  >
                    {searchAvailable.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</>
                    ) : (
                      <><Search className="mr-2 h-4 w-4" /> Search Numbers</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Search results */}
              {searchAvailable.isPending && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching available numbers...</span>
                </div>
              )}

              {hasSearched && !searchAvailable.isPending && searchResults.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Phone className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p>No numbers found matching your criteria. Try a different area code or type.</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <Label>Results ({searchResults.length})</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((num) => (
                      <button
                        key={num.phone_number}
                        type="button"
                        onClick={() => setSelectedSearchNumber(num.phone_number)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          selectedSearchNumber === num.phone_number
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-medium">{num.phone_number}</span>
                          {(num.locality || num.region) && (
                            <p className="text-xs text-muted-foreground">
                              {[num.locality, num.region].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {selectedSearchNumber === num.phone_number && (
                          <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configure & Buy */}
              {selectedSearchNumber && (
                <div className="space-y-4 rounded-lg bg-secondary p-4">
                  <h4 className="flex items-center gap-2 font-medium text-foreground">
                    <Building2 className="h-4 w-4" />
                    Business Branding & Caller ID
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="buyCallerIdName">Business Caller ID Name</Label>
                      <Input
                        id="buyCallerIdName"
                        placeholder="e.g., ACME INC"
                        value={callerIdName}
                        onChange={(e) => setCallerIdName(e.target.value.toUpperCase().slice(0, 15))}
                        maxLength={15}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max 15 chars. Shown on recipient&apos;s phone screen during calls.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buyFriendlyName">Internal Label (optional)</Label>
                      <Input
                        id="buyFriendlyName"
                        placeholder="e.g., Sales Line, Support"
                        value={friendlyName}
                        onChange={(e) => setFriendlyName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        For your own reference only. Not visible to callers.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleBuyNumber} disabled={buyNumber.isPending}>
                      {buyNumber.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Purchasing...</>
                      ) : (
                        <>Purchase {selectedSearchNumber}</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Import from Twilio ─────────────────────────── */}
          {provisionMethod === "import" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-blue-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="text-sm text-blue-400">
                    <p className="font-medium">Import your existing Twilio number</p>
                    <p className="mt-1">
                      You&apos;ll need your Twilio Account SID and Auth Token from your{" "}
                      <a
                        href="https://console.twilio.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline"
                      >
                        Twilio Console
                      </a>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="Your auth token"
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="importPhoneNumber">Phone Number</Label>
                <Input
                  id="importPhoneNumber"
                  placeholder="+14155551234"
                  value={importPhoneNumber}
                  onChange={(e) => setImportPhoneNumber(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">E.164 format (include + and country code)</p>
              </div>

              {/* Business Branding for Import */}
              <div className="rounded-lg bg-secondary p-4 space-y-4">
                <h4 className="flex items-center gap-2 font-medium text-foreground">
                  <Building2 className="h-4 w-4" />
                  Business Branding & Caller ID
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="importCallerIdName">
                      Business Caller ID Name
                    </Label>
                    <Input
                      id="importCallerIdName"
                      placeholder="e.g., ACME INC"
                      value={callerIdName}
                      onChange={(e) => setCallerIdName(e.target.value.toUpperCase().slice(0, 15))}
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max 15 chars. Shown on recipient&apos;s phone screen during calls.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importFriendlyName">Internal Label (optional)</Label>
                    <Input
                      id="importFriendlyName"
                      placeholder="e.g., Main Office Line"
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleImport}
                  disabled={!twilioAccountSid || !twilioAuthToken || !importPhoneNumber || importTwilio.isPending}
                >
                  {importTwilio.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                  ) : (
                    <>Import Number</>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Twilio Credentials Warning ─────────────────────── */}
      {phoneNumbers?.some((pn) => pn.provider === "twilio-imported") && twilioStatus && !twilioStatus.hasCredentials && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <KeyRound className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-400">Twilio credentials needed for SMS</h4>
              <p className="mt-1 text-sm text-amber-400">
                You have imported Twilio numbers but your credentials are not saved.
                SMS features will not work until you add your credentials.
              </p>
              {!showCredentialForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setShowCredentialForm(true)}
                >
                  <KeyRound className="mr-2 h-3.5 w-3.5" />
                  Add Twilio Credentials
                </Button>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="credSid" className="text-xs text-amber-400">Account SID</Label>
                      <Input
                        id="credSid"
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={credSid}
                        onChange={(e) => setCredSid(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="credToken" className="text-xs text-amber-400">Auth Token</Label>
                      <Input
                        id="credToken"
                        type="password"
                        placeholder="Your auth token"
                        value={credToken}
                        onChange={(e) => setCredToken(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateTwilioCredentials.mutate({ twilioAccountSid: credSid, twilioAuthToken: credToken })}
                      disabled={!credSid || !credToken || updateTwilioCredentials.isPending}
                    >
                      {updateTwilioCredentials.isPending ? (
                        <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving...</>
                      ) : (
                        "Save Credentials"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowCredentialForm(false); setCredSid(""); setCredToken(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Phone Numbers Table ────────────────────────────── */}
      {!phoneNumbers?.length ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Hash className="mx-auto h-12 w-12 text-muted-foreground/70" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No phone numbers yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get a phone number to enable voice calls with your voice agents.
          </p>
          <Button className="mt-6" onClick={() => setShowPanel(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Get Phone Number
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                  <th className="px-6 py-3">Number</th>
                  <th className="px-6 py-3">Caller ID</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Assigned Agent</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {phoneNumbers.map((pn) => {
                  const cnam = (pn as Record<string, unknown>).callerIdName as string | null;
                  return (
                    <tr key={pn.id} className="hover:bg-secondary">
                      {/* Number + Label */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground/70" />
                          <div>
                            <span className="font-mono text-sm font-medium text-foreground">
                              {pn.number}
                            </span>
                            {pn.friendlyName && (
                              <p className="text-xs text-muted-foreground">{pn.friendlyName}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Caller ID (inline editable) */}
                      <td className="px-6 py-4">
                        {editingCallerId === pn.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editCallerIdValue}
                              onChange={(e) => setEditCallerIdValue(e.target.value.toUpperCase().slice(0, 15))}
                              maxLength={15}
                              className="h-7 w-36 text-xs"
                              placeholder="BUSINESS NAME"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editCallerIdValue.trim()) {
                                  updateCallerIdName.mutate({ id: pn.id, callerIdName: editCallerIdValue });
                                }
                                if (e.key === "Escape") {
                                  setEditingCallerId(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (editCallerIdValue.trim()) {
                                  updateCallerIdName.mutate({ id: pn.id, callerIdName: editCallerIdValue });
                                }
                              }}
                              disabled={!editCallerIdValue.trim() || updateCallerIdName.isPending}
                              className="rounded p-1 text-green-400 hover:bg-green-100 disabled:opacity-50"
                              title="Save"
                            >
                              {updateCallerIdName.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCallerId(pn.id);
                              setEditCallerIdValue(cnam || "");
                            }}
                            className="group inline-flex items-center gap-1.5 text-sm"
                            title="Click to edit caller ID"
                          >
                            {cnam ? (
                              <>
                                <Building2 className="h-3.5 w-3.5 text-green-500" />
                                <span className="font-medium text-foreground">{cnam}</span>
                                <Pencil className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100" />
                              </>
                            ) : (
                              <span className="text-amber-400 hover:text-amber-400">
                                + Set Caller ID
                              </span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          pn.type === "toll_free"
                            ? "bg-purple-100 text-purple-400"
                            : pn.type === "mobile"
                            ? "bg-orange-500/10 text-orange-400"
                            : "bg-blue-100 text-blue-400"
                        }`}>
                          {pn.type === "toll_free" ? "Toll-Free" : pn.type === "mobile" ? "Mobile" : "Local"}
                        </span>
                      </td>

                      {/* Provider */}
                      <td className="px-6 py-4">{getProviderBadge(pn.provider)}</td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {pn.vapiPhoneId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <button
                            onClick={() => retryVapiImport.mutate({ id: pn.id })}
                            disabled={retryVapiImport.isPending}
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-400"
                          >
                            {retryVapiImport.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Sync
                          </button>
                        )}
                      </td>

                      {/* Agent Assignment */}
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

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Release this phone number? This cannot be undone.")) {
                              release.mutate({ id: pn.id });
                            }
                          }}
                          className="rounded p-1.5 text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-400"
                          title="Release number"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Caller ID & Branding Info ──────────────────────── */}
      <div className="rounded-lg border border-border bg-green-500/10 p-4">
        <div className="flex gap-3">
          <Building2 className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <h4 className="font-medium text-green-400">Caller ID & Business Branding</h4>
            <ul className="mt-2 list-disc list-inside text-sm text-green-400 space-y-1">
              <li><strong>CNAM (Caller Name):</strong> Set your business name to display on recipient phones during calls. All numbers should have Caller ID configured for trust and professionalism.</li>
              <li><strong>Character limit:</strong> CNAM is limited to 15 characters by telecom standards (e.g., &quot;ACME INC&quot;, &quot;DR SMITH OFFICE&quot;).</li>
              <li><strong>Propagation:</strong> CNAM updates take 24-48 hours to propagate across carrier networks.</li>
              <li><strong>Coverage:</strong> CNAM display is most reliable for US/Canada calls. UK coverage varies by carrier.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Compliance & Regulatory ────────────────────────── */}
      <div className="rounded-lg border border-border bg-purple-500/10 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0" />
          <div>
            <h4 className="font-medium text-purple-400">Compliance & Regulatory</h4>
            <div className="mt-2 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-purple-400">STIR/SHAKEN Verified</span>
                </div>
                <p className="ml-6 text-sm text-purple-400">
                  All managed Twilio numbers include STIR/SHAKEN attestation, reducing the chance of calls being marked as spam.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-purple-400">A2P 10DLC Registered (SMS)</span>
                </div>
                <p className="ml-6 text-sm text-purple-400">
                  Phone numbers are registered under our A2P 10DLC campaign for compliant SMS delivery. Messages go through Twilio Messaging Service for maximum deliverability.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-purple-400">TCPA Compliance</span>
                </div>
                <p className="ml-6 text-sm text-purple-400">
                  Ensure prior express consent before making automated outbound calls. Maintain Do Not Call lists and honor opt-out requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Phone Number Options Info ──────────────────────── */}
      <div className="rounded-lg border border-border bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <Globe className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <h4 className="font-medium text-blue-400">Phone Number Options</h4>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-400 space-y-1">
              <li><strong>Managed numbers:</strong> Pre-registered A2P numbers with SMS and voice support. We handle compliance.</li>
              <li><strong>Imported numbers:</strong> Use your own Twilio numbers. You pay Twilio directly.</li>
              <li>All numbers support inbound and outbound calling with your voice agents.</li>
              <li>Numbers are automatically connected for voice calling with STIR/SHAKEN verification.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
