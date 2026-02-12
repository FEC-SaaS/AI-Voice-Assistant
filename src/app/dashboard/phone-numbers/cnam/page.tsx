"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Phone,
  RefreshCw,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
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

const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2; description: string }
> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    icon: Building2,
    description: "Profile saved locally. Submit for Twilio verification.",
  },
  pending_review: {
    label: "Pending Review",
    color: "text-yellow-500",
    icon: Clock,
    description: "Submitted to Twilio. Waiting for review.",
  },
  in_review: {
    label: "In Review",
    color: "text-blue-500",
    icon: Clock,
    description: "Twilio is reviewing your business profile.",
  },
  approved: {
    label: "Approved",
    color: "text-green-500",
    icon: CheckCircle2,
    description: "Verified! You can now register CNAM for your phone numbers.",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-500",
    icon: XCircle,
    description: "Profile was rejected. Update your information and try again.",
  },
  failed: {
    label: "Failed",
    color: "text-red-500",
    icon: AlertCircle,
    description: "Submission failed. Check your details and retry.",
  },
};

const CNAM_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-yellow-500" },
  registered: { label: "Active", color: "text-green-500" },
  failed: { label: "Failed", color: "text-red-500" },
};

export default function CnamPage() {
  const { data, isLoading, refetch } = trpc.cnam.getProfile.useQuery();

  const createProfile = trpc.cnam.createProfile.useMutation({
    onSuccess: () => refetch(),
  });
  const submitForReview = trpc.cnam.submitForReview.useMutation({
    onSuccess: () => refetch(),
  });
  const refreshStatus = trpc.cnam.refreshStatus.useMutation({
    onSuccess: () => refetch(),
  });
  const registerNumber = trpc.cnam.registerNumber.useMutation({
    onSuccess: () => refetch(),
  });

  const profile = data?.profile;
  const phoneNumbers = data?.phoneNumbers ?? [];

  // Form state
  const [form, setForm] = useState<{
    businessName: string;
    businessType: "sole_proprietorship" | "partnership" | "llc" | "corporation";
    ein: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZip: string;
    businessCountry: string;
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
  }>({
    businessName: "",
    businessType: "llc",
    ein: "",
    businessAddress: "",
    businessCity: "",
    businessState: "",
    businessZip: "",
    businessCountry: "US",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [formLoaded, setFormLoaded] = useState(false);

  // Load existing profile into form
  if (profile && !formLoaded) {
    setForm({
      businessName: profile.businessName,
      businessType: profile.businessType as typeof form.businessType,
      ein: profile.ein || "",
      businessAddress: profile.businessAddress,
      businessCity: profile.businessCity,
      businessState: profile.businessState,
      businessZip: profile.businessZip,
      businessCountry: profile.businessCountry,
      contactFirstName: profile.contactFirstName,
      contactLastName: profile.contactLastName,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
    });
    setFormLoaded(true);
  }

  // Per-number CNAM input state
  const [cnamInputs, setCnamInputs] = useState<Record<string, string>>({});

  const handleSaveProfile = () => {
    createProfile.mutate({
      ...form,
      ein: form.ein || undefined,
    });
  };

  const handleSubmitForReview = () => {
    submitForReview.mutate();
  };

  const handleRefreshStatus = () => {
    refreshStatus.mutate();
  };

  const handleRegisterCnam = (phoneNumberId: string) => {
    const name = cnamInputs[phoneNumberId];
    if (!name) return;
    registerNumber.mutate({ phoneNumberId, callerIdName: name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusConfig = (STATUS_CONFIG[profile?.status ?? "draft"] ?? STATUS_CONFIG.draft)!;
  const StatusIcon = statusConfig.icon;
  const isApproved = profile?.status === "approved";
  const canEdit =
    !profile || ["draft", "rejected", "failed"].includes(profile.status);
  const canSubmit =
    profile && ["draft", "rejected", "failed"].includes(profile.status);
  const canRefresh =
    profile &&
    ["pending_review", "in_review"].includes(profile.status);

  // Filter to US/CA numbers with Twilio SID
  const eligibleNumbers = phoneNumbers.filter(
    (pn) =>
      pn.twilioSid &&
      pn.isActive &&
      ["US", "CA"].includes(pn.countryCode || "US")
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Caller ID (CNAM) Registration
        </h1>
        <p className="mt-1 text-muted-foreground">
          Register your business name as the Caller ID that recipients see when
          you call them.
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How CNAM works</p>
            <p>
              CNAM (Caller Name) registration adds your business name to the
              national caller ID database. When your voice agent calls someone,
              they&apos;ll see your business name instead of just a phone number.
            </p>
            <p>
              Available for <strong>US and Canada</strong> numbers only.
              Propagation takes <strong>24-72 hours</strong> after registration.
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      {profile && (
        <div className="rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
              <div>
                <p className="font-semibold">
                  Business Profile:{" "}
                  <span className={statusConfig.color}>
                    {statusConfig.label}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {statusConfig.description}
                </p>
                {profile.rejectionReason && (
                  <p className="text-sm text-red-500 mt-1">
                    Reason: {profile.rejectionReason}
                  </p>
                )}
              </div>
            </div>
            {canRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={refreshStatus.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshStatus.isPending ? "animate-spin" : ""}`}
                />
                Check Status
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Business Profile Form */}
      {canEdit && (
        <div className="rounded-xl border p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Verification
          </h2>

          {/* Business Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={form.businessName}
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label>Business Type *</Label>
              <Select
                value={form.businessType}
                onValueChange={(v) => setForm({ ...form, businessType: v as typeof form.businessType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>EIN / Tax ID</Label>
              <Input
                value={form.ein}
                onChange={(e) => setForm({ ...form, ein: e.target.value })}
                placeholder="XX-XXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Highly recommended for faster approval
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Street Address *</Label>
              <Input
                value={form.businessAddress}
                onChange={(e) =>
                  setForm({ ...form, businessAddress: e.target.value })
                }
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={form.businessCity}
                onChange={(e) =>
                  setForm({ ...form, businessCity: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input
                value={form.businessState}
                onChange={(e) =>
                  setForm({ ...form, businessState: e.target.value })
                }
                placeholder="CA"
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input
                value={form.businessZip}
                onChange={(e) =>
                  setForm({ ...form, businessZip: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={form.businessCountry}
                onValueChange={(v) =>
                  setForm({ ...form, businessCountry: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <h3 className="font-medium mb-3">Authorized Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={form.contactFirstName}
                  onChange={(e) =>
                    setForm({ ...form, contactFirstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={form.contactLastName}
                  onChange={(e) =>
                    setForm({ ...form, contactLastName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm({ ...form, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm({ ...form, contactPhone: e.target.value })
                  }
                  placeholder="+1..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={
                createProfile.isPending || !form.businessName || !form.businessAddress
              }
            >
              {createProfile.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {profile ? "Update Profile" : "Save Profile"}
            </Button>
            {canSubmit && (
              <Button
                onClick={handleSubmitForReview}
                disabled={submitForReview.isPending}
                variant="default"
              >
                {submitForReview.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Submit for Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {(createProfile.error || submitForReview.error) && (
            <p className="text-sm text-red-500">
              {createProfile.error?.message || submitForReview.error?.message}
            </p>
          )}
        </div>
      )}

      {/* Phone Number CNAM Registration */}
      {isApproved && (
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Register Caller ID for Phone Numbers
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a display name for each number (max 15 characters). After
            registration, it takes 24-72 hours for the name to appear on
            recipients&apos; phones.
          </p>

          {eligibleNumbers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No eligible US/Canada phone numbers found. Buy a phone number
              first.
            </p>
          ) : (
            <div className="space-y-3">
              {eligibleNumbers.map((pn) => {
                const cnamLabel =
                  CNAM_STATUS_LABELS[pn.cnamStatus || ""] ?? null;
                return (
                  <div
                    key={pn.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-medium">{pn.number}</p>
                      {pn.friendlyName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {pn.friendlyName}
                        </p>
                      )}
                      {cnamLabel && (
                        <p className={`text-xs font-medium ${cnamLabel.color}`}>
                          CNAM: {cnamLabel.label}
                          {pn.callerIdName && ` — "${pn.callerIdName}"`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-48"
                        maxLength={15}
                        placeholder="Business Name"
                        value={
                          cnamInputs[pn.id] ?? pn.callerIdName ?? ""
                        }
                        onChange={(e) =>
                          setCnamInputs({
                            ...cnamInputs,
                            [pn.id]: e.target.value,
                          })
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRegisterCnam(pn.id)}
                        disabled={
                          registerNumber.isPending ||
                          !(cnamInputs[pn.id] ?? pn.callerIdName)
                        }
                      >
                        {registerNumber.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : pn.cnamStatus === "registered" ? (
                          "Update"
                        ) : (
                          "Register"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {registerNumber.error && (
            <p className="text-sm text-red-500">
              {registerNumber.error.message}
            </p>
          )}
        </div>
      )}

      {/* Timeline / Help */}
      <div className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Registration Timeline</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Fill Out Business Profile",
              desc: "Enter your business name, address, EIN, and contact info.",
              done: !!profile,
            },
            {
              step: "2",
              title: "Submit for Verification",
              desc: "Twilio verifies your business identity. Usually instant, up to 5 business days.",
              done: isApproved,
            },
            {
              step: "3",
              title: "Register CNAM Per Number",
              desc: "Choose the display name for each phone number.",
              done:
                eligibleNumbers.some((pn) => pn.cnamStatus === "registered"),
            },
            {
              step: "4",
              title: "Carrier Propagation",
              desc: "24-72 hours for the name to appear on recipients' phones.",
              done: false,
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  item.done
                    ? "bg-green-500/10 text-green-500"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  item.step
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
