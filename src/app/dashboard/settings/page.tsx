"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const settingsNav = [
  { title: "General", href: "/dashboard/settings" },
  { title: "Billing", href: "/dashboard/settings/billing" },
  { title: "Team", href: "/dashboard/settings/team" },
  { title: "API Keys", href: "/dashboard/settings/api-keys" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const CALLING_HOURS_OPTIONS = [
  { value: "08:00-17:00", label: "8:00 AM - 5:00 PM" },
  { value: "09:00-18:00", label: "9:00 AM - 6:00 PM" },
  { value: "09:00-21:00", label: "9:00 AM - 9:00 PM (TCPA Max)" },
  { value: "10:00-19:00", label: "10:00 AM - 7:00 PM" },
];

interface OrgSettings {
  defaultTimezone?: string;
  defaultCallingHours?: string;
  aiDisclosure?: string;
  companyWebsite?: string;
}

export default function SettingsPage() {
  const pathname = usePathname();
  const utils = trpc.useUtils();

  // Fetch current user and organization data
  const { data: currentUser, isLoading } = trpc.users.me.useQuery();

  // Form state
  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [callingHours, setCallingHours] = useState("09:00-17:00");
  const [aiDisclosure, setAiDisclosure] = useState(
    "This call may be recorded for quality assurance. You are speaking with an AI assistant."
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update organization mutation
  const updateOrg = trpc.users.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      utils.users.me.invalidate();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  // Load current values when data is fetched
  useEffect(() => {
    if (currentUser?.organization) {
      const org = currentUser.organization;
      const settings = org.settings as OrgSettings | null;

      setOrgName(org.name || "");
      setWebsite(settings?.companyWebsite || "");
      setTimezone(settings?.defaultTimezone || "America/New_York");
      setCallingHours(settings?.defaultCallingHours || "09:00-17:00");
      setAiDisclosure(
        settings?.aiDisclosure ||
          "This call may be recorded for quality assurance. You are speaking with an AI assistant."
      );
    }
  }, [currentUser]);

  const handleSaveGeneral = () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setIsSaving(true);
    const currentSettings = (currentUser?.organization?.settings as OrgSettings) || {};

    updateOrg.mutate({
      name: orgName.trim(),
      settings: {
        ...currentSettings,
        companyWebsite: website.trim(),
      },
    });
  };

  const handleSaveDefaults = () => {
    setIsSaving(true);
    const currentSettings = (currentUser?.organization?.settings as OrgSettings) || {};

    updateOrg.mutate({
      settings: {
        ...currentSettings,
        defaultTimezone: timezone,
        defaultCallingHours: callingHours,
        aiDisclosure: aiDisclosure.trim(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">
          Manage your organization settings and preferences
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-48 space-y-1">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Organization Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Update your organization&apos;s basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  value={currentUser?.organization?.id || ""}
                  disabled
                  className="font-mono text-sm bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  Use this ID for API integrations
                </p>
              </div>
              <Button onClick={handleSaveGeneral} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Default Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Default Settings</CardTitle>
              <CardDescription>
                Configure default behavior for your agents and campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Used for campaign scheduling and calling hours
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="callingHours">Default Calling Hours</Label>
                <Select value={callingHours} onValueChange={setCallingHours}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calling hours" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALLING_HOURS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  TCPA requires calls between 8am-9pm local time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiDisclosure">AI Disclosure Message</Label>
                <textarea
                  id="aiDisclosure"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="This call may be recorded..."
                  value={aiDisclosure}
                  onChange={(e) => setAiDisclosure(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Required disclosure at the start of each call (FTC compliance)
                </p>
              </div>

              <Button onClick={handleSaveDefaults} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Defaults
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
                <div>
                  <h4 className="font-medium text-red-900">Delete Organization</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete your organization and all its data
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
