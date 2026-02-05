"use client";

import { useState, useEffect } from "react";
import { Mail, Building, Palette, Image, Loader2, Save, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EmailSettingsPage() {
  const [formData, setFormData] = useState({
    emailBusinessName: "",
    emailFromAddress: "",
    emailReplyTo: "",
    emailPrimaryColor: "#22c55e",
    emailLogoUrl: "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = trpc.organization.getEmailSettings.useQuery();
  const updateSettings = trpc.organization.updateEmailSettings.useMutation({
    onSuccess: () => {
      toast.success("Email settings saved successfully");
      setHasChanges(false);
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
        emailReplyTo: settings.emailReplyTo || "",
        emailPrimaryColor: settings.emailPrimaryColor || "#22c55e",
        emailLogoUrl: settings.emailLogoUrl || "",
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate({
      emailBusinessName: formData.emailBusinessName || undefined,
      emailFromAddress: formData.emailFromAddress || null,
      emailReplyTo: formData.emailReplyTo || null,
      emailPrimaryColor: formData.emailPrimaryColor || undefined,
      emailLogoUrl: formData.emailLogoUrl || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-gray-500">
            Configure how your appointment confirmation emails appear to customers
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

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
            <p className="text-sm text-gray-500">
              Leave empty to use your organization name: &quot;{settings?.organizationName}&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Addresses
          </CardTitle>
          <CardDescription>
            Configure the sender and reply-to email addresses for your appointment emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">About Email Domains</p>
              <p className="mt-1">
                By default, emails are sent from our verified domain on your behalf. For a fully
                branded experience with your own domain, contact our support team to set up a custom
                sending domain.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailFromAddress">Custom From Email (Optional)</Label>
            <Input
              id="emailFromAddress"
              type="email"
              placeholder="noreply@yourbusiness.com"
              value={formData.emailFromAddress}
              onChange={(e) => handleChange("emailFromAddress", e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Requires domain verification. Leave empty to use our default sender.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailReplyTo">Reply-To Email</Label>
            <Input
              id="emailReplyTo"
              type="email"
              placeholder="support@yourbusiness.com"
              value={formData.emailReplyTo}
              onChange={(e) => handleChange("emailReplyTo", e.target.value)}
            />
            <p className="text-sm text-gray-500">
              When customers reply to emails, responses will go to this address.
            </p>
          </div>
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
              <span className="text-sm text-gray-500">Used for email headers and buttons</span>
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
            <p className="text-sm text-gray-500">
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
            <div className="p-4 bg-white">
              <p className="text-gray-700 mb-4">Hi Customer,</p>
              <p className="text-gray-600 text-sm mb-4">
                Your appointment has been scheduled. Here are the details:
              </p>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-medium">Sales Consultation</p>
                <p className="text-sm text-gray-500">Monday, February 10, 2026 at 2:00 PM</p>
                <p className="text-sm text-gray-500">30 minutes</p>
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

              <p className="text-center text-sm text-gray-500">
                From {formData.emailBusinessName || settings?.organizationName || "Your Business"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
