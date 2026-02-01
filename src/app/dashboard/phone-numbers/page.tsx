"use client";

import { useState } from "react";
import {
  Phone,
  Hash,
  Loader2,
  Trash2,
  Plus,
  Globe,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type ProvisionMethod = "instant" | "import";
type NumberType = "local" | "toll-free" | "mobile";

interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  iso_country: string;
}

export default function PhoneNumbersPage() {
  const { data: phoneNumbers, isLoading, refetch } = trpc.phoneNumbers.list.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: countries } = trpc.phoneNumbers.getSupportedCountries.useQuery();

  // Panel state
  const [showPanel, setShowPanel] = useState(false);
  const [provisionMethod, setProvisionMethod] = useState<ProvisionMethod>("instant");

  // Instant purchase state
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [selectedType, setSelectedType] = useState<NumberType>("local");
  const [areaCode, setAreaCode] = useState("");
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState("");
  const [pricing, setPricing] = useState<{ monthlyBase: number; monthlySaaS: number } | null>(null);

  // Import state
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [importPhoneNumber, setImportPhoneNumber] = useState("");

  // Get available number types for selected country
  const { data: numberTypes } = trpc.phoneNumbers.getCountryNumberTypes.useQuery(
    { countryCode: selectedCountry },
    { enabled: !!selectedCountry }
  );

  const searchAvailable = trpc.phoneNumbers.searchAvailable.useMutation({
    onSuccess: (data) => {
      setSearchResults(data.numbers);
      setPricing(data.pricing);
      if (data.numbers.length === 0) {
        toast.info("No numbers available. Try a different area code or number type.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const buyNumber = trpc.phoneNumbers.buyNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number purchased successfully!");
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
      toast.success("Phone number synced with Vapi");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setShowPanel(false);
    setProvisionMethod("instant");
    setSelectedNumber(null);
    setSearchResults([]);
    setPricing(null);
    setFriendlyName("");
    setAreaCode("");
    setTwilioAccountSid("");
    setTwilioAuthToken("");
    setImportPhoneNumber("");
  };

  const handleSearch = () => {
    searchAvailable.mutate({
      countryCode: selectedCountry,
      type: selectedType,
      areaCode: areaCode || undefined,
      limit: 10,
    });
  };

  const handleBuy = () => {
    if (!selectedNumber) return;
    buyNumber.mutate({
      phoneNumber: selectedNumber,
      countryCode: selectedCountry,
      type: selectedType,
      friendlyName: friendlyName || undefined,
    });
  };

  const handleImport = () => {
    importTwilio.mutate({
      twilioAccountSid,
      twilioAuthToken,
      phoneNumber: importPhoneNumber,
      friendlyName: friendlyName || undefined,
    });
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case "twilio-managed":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Managed
          </span>
        );
      case "twilio-imported":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Imported
          </span>
        );
      case "vapi":
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            Vapi
          </span>
        );
      default:
        return null;
    }
  };

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
              : "Get phone numbers for your AI agents"}
          </p>
        </div>
        <Button onClick={() => setShowPanel(!showPanel)}>
          <Plus className="mr-2 h-4 w-4" />
          Get Phone Number
        </Button>
      </div>

      {/* Provision Panel */}
      {showPanel && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          {/* Method Selection */}
          <div className="mb-6">
            <Label className="text-base font-semibold">How would you like to get a phone number?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setProvisionMethod("instant")}
                className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  provisionMethod === "instant"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="font-medium">Get Number Instantly</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Recommended
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Search and purchase phone numbers from 30+ countries instantly.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProvisionMethod("import")}
                className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  provisionMethod === "import"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Import from Twilio</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Use your existing Twilio phone number with VoxForge.
                </p>
              </button>
            </div>
          </div>

          {/* Instant Purchase Form */}
          {provisionMethod === "instant" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={selectedCountry} onValueChange={(v) => {
                    setSelectedCountry(v);
                    setSearchResults([]);
                    setSelectedNumber(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries?.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(v) => {
                      setSelectedType(v as NumberType);
                      setSearchResults([]);
                      setSelectedNumber(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numberTypes?.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "toll-free" ? "Toll-Free" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaCode">Area Code (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="areaCode"
                      placeholder="e.g., 415"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value)}
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={searchAvailable.isPending}
                    >
                      {searchAvailable.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Available Numbers</Label>
                    {pricing && (
                      <span className="text-sm text-gray-500">
                        ${pricing.monthlySaaS.toFixed(2)}/month per number
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {searchResults.map((num) => (
                      <button
                        key={num.phone_number}
                        type="button"
                        onClick={() => setSelectedNumber(num.phone_number)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          selectedNumber === num.phone_number
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-medium">{num.phone_number}</span>
                          <p className="text-xs text-gray-500">
                            {num.locality && `${num.locality}, `}{num.region}
                          </p>
                        </div>
                        {selectedNumber === num.phone_number && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Friendly Name & Purchase */}
              {selectedNumber && (
                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="friendlyName">Label (optional)</Label>
                    <Input
                      id="friendlyName"
                      placeholder="e.g., Sales Line, Support"
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleBuy}
                      disabled={buyNumber.isPending}
                    >
                      {buyNumber.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Purchasing...</>
                      ) : (
                        <>Purchase {selectedNumber}</>
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

          {/* Import Form */}
          {provisionMethod === "import" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Importing from your Twilio account</p>
                    <p className="mt-1">
                      You&apos;ll need your Twilio Account SID and Auth Token.
                      Find them in your{" "}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="importPhoneNumber">Phone Number</Label>
                  <Input
                    id="importPhoneNumber"
                    placeholder="+14155551234"
                    value={importPhoneNumber}
                    onChange={(e) => setImportPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">E.164 format (include + and country code)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importFriendlyName">Label (optional)</Label>
                  <Input
                    id="importFriendlyName"
                    placeholder="e.g., My Twilio Number"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                  />
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

      {/* Phone Numbers List */}
      {!phoneNumbers?.length ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Hash className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No phone numbers yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get a phone number to enable voice calls with your AI agents.
          </p>
          <Button className="mt-6" onClick={() => setShowPanel(true)}>
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
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Status</th>
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
                          : pn.type === "mobile"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {pn.type === "toll_free" ? "Toll-Free" : pn.type === "mobile" ? "Mobile" : "Local"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getProviderBadge(pn.provider)}
                    </td>
                    <td className="px-6 py-4">
                      {pn.vapiPhoneId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Ready
                        </span>
                      ) : (
                        <button
                          onClick={() => retryVapiImport.mutate({ id: pn.id })}
                          disabled={retryVapiImport.isPending}
                          className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                        >
                          {retryVapiImport.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Sync to Vapi
                        </button>
                      )}
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
                          if (confirm("Release this phone number? This cannot be undone.")) {
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
            <h4 className="font-medium text-blue-900">Phone Number Options</h4>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700 space-y-1">
              <li><strong>Managed numbers:</strong> We provision and bill you monthly. Simplest option.</li>
              <li><strong>Imported numbers:</strong> Use your own Twilio numbers. You pay Twilio directly.</li>
              <li>All numbers support inbound and outbound calling with your AI agents.</li>
              <li>Numbers are automatically connected to Vapi for voice AI capabilities.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
