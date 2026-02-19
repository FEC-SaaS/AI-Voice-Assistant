"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Building,
  Palette,
  Image,
  Loader2,
  Save,
  Info,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  RefreshCw,
  Trash2,
  ExternalLink,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Domain status badge component
function DomainStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    verified: { icon: CheckCircle2, color: "text-green-400 bg-green-500/10", label: "Verified" },
    pending: { icon: Clock, color: "text-yellow-400 bg-yellow-500/10", label: "Pending Verification" },
    not_started: { icon: AlertCircle, color: "text-muted-foreground bg-secondary", label: "Not Started" },
    failed: { icon: AlertCircle, color: "text-red-400 bg-red-500/10", label: "Verification Failed" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export default function EmailSettingsPage() {
  const [formData, setFormData] = useState({
    emailBusinessName: "",
    emailFromAddress: "",
    emailPrimaryColor: "#22c55e",
    emailLogoUrl: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [useCustomDomain, setUseCustomDomain] = useState(false);

  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.organization.getEmailSettings.useQuery();
  const { data: domainData, isLoading: domainLoading, refetch: refetchDomain } = trpc.organization.getCustomDomain.useQuery();

  const updateSettings = trpc.organization.updateEmailSettings.useMutation({
    onSuccess: () => {
      toast.success("Email settings saved successfully");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addDomain = trpc.organization.addCustomDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added! Please configure the DNS records shown below.");
      setNewDomain("");
      utils.organization.getCustomDomain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyDomain = trpc.organization.verifyCustomDomain.useMutation({
    onSuccess: (data) => {
      if (data.status === "verified") {
        toast.success("Domain verified successfully! You can now send emails from this domain.");
      } else {
        toast.info("Verification in progress. DNS changes may take up to 48 hours to propagate.");
      }
      utils.organization.getCustomDomain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeDomain = trpc.organization.removeCustomDomain.useMutation({
    onSuccess: () => {
      toast.success("Custom domain removed");
      utils.organization.getCustomDomain.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTestEmail = trpc.organization.sendTestEmail.useMutation({
    onSuccess: () => {
      toast.success("Test email sent to your account email address");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Initialize form with fetched settings
  useEffect(() => {
    if (settings) {
      setFormData({
        emailBusinessName: settings.emailBusinessName || "",
        emailFromAddress: settings.emailFromAddress || "",
        emailPrimaryColor: settings.emailPrimaryColor || "#22c55e",
        emailLogoUrl: settings.emailLogoUrl || "",
      });
    }
  }, [settings]);

  // Set custom domain preference based on existing domain
  useEffect(() => {
    if (domainData?.hasCustomDomain) {
      setUseCustomDomain(true);
    }
  }, [domainData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }
    addDomain.mutate({ domain: newDomain.trim() });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate({
      emailBusinessName: formData.emailBusinessName || undefined,
      emailFromAddress: formData.emailFromAddress || null,
      emailPrimaryColor: formData.emailPrimaryColor || undefined,
      emailLogoUrl: formData.emailLogoUrl || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure how your appointment confirmation emails appear to customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => sendTestEmail.mutate()}
            disabled={sendTestEmail.isPending}
          >
            {sendTestEmail.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Test Email
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Test email note */}
      <p className="text-xs text-muted-foreground -mt-4">
        Test email will be sent to your account email address using the current branding settings.
      </p>

      {/* Business Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Name
          </CardTitle>
          <CardDescription>
            This name will appear in all emails sent to your customers. Use your actual business
            name rather than your account name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailBusinessName">Business Name for Emails</Label>
            <Input
              id="emailBusinessName"
              placeholder={settings?.organizationName || "Your Business Name"}
              value={formData.emailBusinessName}
              onChange={(e) => handleChange("emailBusinessName", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to use your organization name: &quot;{settings?.organizationName}&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Email Sending Domain
          </CardTitle>
          <CardDescription>
            Choose how emails are sent to your customers. Either use our shared domain or set up your own custom domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Option Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Shared Domain */}
            <div
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                !useCustomDomain
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border"
              }`}
              onClick={() => setUseCustomDomain(false)}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${!useCustomDomain ? "bg-primary/10" : "bg-secondary"}`}>
                  <Mail className={`h-5 w-5 ${!useCustomDomain ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Shared Domain</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Emails sent from our verified domain on your behalf. Quick setup, no DNS changes needed.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Sent from: noreply@calltone.ai
                  </p>
                </div>
              </div>
              {!useCustomDomain && (
                <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />
              )}
            </div>

            {/* Option B: Custom Domain */}
            <div
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                useCustomDomain
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border"
              }`}
              onClick={() => setUseCustomDomain(true)}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${useCustomDomain ? "bg-primary/10" : "bg-secondary"}`}>
                  <Globe className={`h-5 w-5 ${useCustomDomain ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Custom Domain</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send emails from your own domain for full brand control. Requires DNS verification.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Example: mail.yourbusiness.com
                  </p>
                </div>
              </div>
              {useCustomDomain && (
                <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />
              )}
            </div>
          </div>

          {/* Custom Domain Setup Section */}
          {useCustomDomain && (
            <div className="border-t pt-6 space-y-4">
              {domainLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
                </div>
              ) : domainData?.hasCustomDomain && domainData.domain ? (
                // Show existing domain configuration
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground/70" />
                      <div>
                        <p className="font-medium text-foreground">{domainData.domain.name}</p>
                        <p className="text-xs text-muted-foreground">Added domain</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DomainStatusBadge status={domainData.domain.status} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-foreground hover:bg-secondary">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Custom Domain</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this custom domain? Emails will be sent from
                              our shared domain instead. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeDomain.mutate()}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {removeDomain.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Remove Domain"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* DNS Records */}
                  {domainData.domain.status !== "verified" && domainData.domain.records.length > 0 && (
                    <div className="rounded-lg border bg-secondary p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">Configure DNS Records</p>
                          <p className="text-muted-foreground mt-1">
                            Add the following DNS records to your domain provider. DNS changes may take up to 48 hours to propagate.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Value</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                              <th className="py-2 px-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainData.domain.records.map((record, index) => (
                              <tr key={index} className="border-b last:border-0">
                                <td className="py-2 px-2">
                                  <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                                    {record.type}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <code className="text-xs break-all">{record.name}</code>
                                </td>
                                <td className="py-2 px-2 max-w-[200px]">
                                  <code className="text-xs break-all block">{record.value}</code>
                                </td>
                                <td className="py-2 px-2">
                                  <span className={`text-xs ${
                                    record.status === "verified" ? "text-green-400" : "text-yellow-400"
                                  }`}>
                                    {record.status === "verified" ? "Verified" : "Pending"}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(record.value)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={() => verifyDomain.mutate()}
                          disabled={verifyDomain.isPending}
                          size="sm"
                        >
                          {verifyDomain.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Verify DNS Records
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchDomain()}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh Status
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Verified domain success message */}
                  {domainData.domain.status === "verified" && (
                    <div className="rounded-lg bg-green-500/10 border border-border p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-400">Domain Verified</p>
                        <p className="text-green-400 mt-1">
                          Your domain is verified and ready to use. Emails will be sent from{" "}
                          <strong>noreply@{domainData.domain.name}</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Add new domain form
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-500/10 p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium">Setting Up a Custom Domain</p>
                      <p className="mt-1">
                        We recommend using a subdomain like <strong>mail.yourbusiness.com</strong> or{" "}
                        <strong>notify.yourbusiness.com</strong>. After adding the domain, you&apos;ll
                        need to configure DNS records with your domain provider.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="newDomain" className="sr-only">Domain Name</Label>
                      <Input
                        id="newDomain"
                        placeholder="mail.yourbusiness.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      />
                    </div>
                    <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
                      {addDomain.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add Domain"
                      )}
                    </Button>
                  </div>

                  <a
                    href="https://resend.com/docs/dashboard/domains/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Learn more about domain verification
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Email Branding
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your appointment emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailPrimaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="emailPrimaryColor"
                type="color"
                className="w-16 h-10 p-1 cursor-pointer"
                value={formData.emailPrimaryColor}
                onChange={(e) => handleChange("emailPrimaryColor", e.target.value)}
              />
              <Input
                value={formData.emailPrimaryColor}
                onChange={(e) => handleChange("emailPrimaryColor", e.target.value)}
                className="w-32"
                placeholder="#22c55e"
              />
              <span className="text-sm text-muted-foreground">Used for email headers and buttons</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailLogoUrl" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo URL (Optional)
            </Label>
            <Input
              id="emailLogoUrl"
              type="url"
              placeholder="https://yourbusiness.com/logo.png"
              value={formData.emailLogoUrl}
              onChange={(e) => handleChange("emailLogoUrl", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              A URL to your logo image. Recommended size: 200x50 pixels. PNG format works best.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>
            Here&apos;s how your appointment confirmation emails will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden max-w-md mx-auto">
            {/* Header */}
            <div
              className="p-4 text-white text-center"
              style={{ backgroundColor: formData.emailPrimaryColor || "#22c55e" }}
            >
              {formData.emailLogoUrl && (
                <img
                  src={formData.emailLogoUrl}
                  alt="Logo"
                  className="max-h-10 mx-auto mb-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <h3 className="font-semibold">Appointment Confirmed</h3>
            </div>

            {/* Body */}
            <div className="p-4 bg-card">
              <p className="text-foreground/80 mb-4">Hi Customer,</p>
              <p className="text-muted-foreground text-sm mb-4">
                Your appointment has been scheduled. Here are the details:
              </p>

              <div className="bg-secondary p-3 rounded-lg mb-4">
                <p className="font-medium">Sales Consultation</p>
                <p className="text-sm text-muted-foreground">Monday, February 10, 2026 at 2:00 PM</p>
                <p className="text-sm text-muted-foreground">30 minutes</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <span
                  className="px-3 py-1.5 text-white text-sm rounded"
                  style={{ backgroundColor: "#22c55e" }}
                >
                  Confirm
                </span>
                <span
                  className="px-3 py-1.5 text-white text-sm rounded"
                  style={{ backgroundColor: "#3b82f6" }}
                >
                  Reschedule
                </span>
                <span
                  className="px-3 py-1.5 text-white text-sm rounded"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  Cancel
                </span>
              </div>

              <hr className="my-4" />

              <p className="text-center text-sm text-muted-foreground">
                From {formData.emailBusinessName || settings?.organizationName || "Your Business"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
