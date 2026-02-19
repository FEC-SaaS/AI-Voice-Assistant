"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, BarChart3, Megaphone, Bot, CreditCard, PhoneCall } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface NotifSetting {
  key: keyof NotifState;
  label: string;
  description: string;
  icon: React.ElementType;
  tooltip?: string;
}

interface NotifState {
  notifyCallCompleted: boolean;
  notifyDailyDigest: boolean;
  notifyCampaignCompleted: boolean;
  notifyWeeklyReport: boolean;
  notifyAgentErrors: boolean;
  notifyBillingAlerts: boolean;
}

const NOTIFICATION_SETTINGS: NotifSetting[] = [
  {
    key: "notifyCallCompleted",
    label: "Call completed",
    description: "Receive an email summary each time a call finishes with outcome and transcript",
    icon: PhoneCall,
  },
  {
    key: "notifyDailyDigest",
    label: "Daily digest",
    description: "A morning summary of yesterday's call volume, outcomes, and top agents",
    icon: BarChart3,
    tooltip: "Sent every morning at 8 AM covering the previous day's activity across all campaigns and agents.",
  },
  {
    key: "notifyCampaignCompleted",
    label: "Campaign completed",
    description: "Notified when an outbound campaign finishes all contacts",
    icon: Megaphone,
  },
  {
    key: "notifyWeeklyReport",
    label: "Weekly performance report",
    description: "A weekly email with trends, comparisons, and actionable insights",
    icon: BarChart3,
    tooltip: "Delivered every Monday morning. Includes week-over-week comparisons, top-performing agents, and recommended next steps.",
  },
  {
    key: "notifyAgentErrors",
    label: "Agent errors &amp; failures",
    description: "Immediate alert when an agent encounters a critical error or fails to connect",
    icon: Bot,
  },
  {
    key: "notifyBillingAlerts",
    label: "Billing alerts",
    description: "Notifications for payment issues, upcoming renewals, and overage thresholds",
    icon: CreditCard,
  },
];

const DEFAULT_STATE: NotifState = {
  notifyCallCompleted: true,
  notifyDailyDigest: true,
  notifyCampaignCompleted: true,
  notifyWeeklyReport: false,
  notifyAgentErrors: true,
  notifyBillingAlerts: true,
};

export default function NotificationsSettingsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.organization.getNotificationSettings.useQuery();

  const [settings, setSettings] = useState<NotifState>(DEFAULT_STATE);
  const [dirty, setDirty] = useState(false);

  // Hydrate once server data arrives
  useEffect(() => {
    if (data) {
      setSettings({
        notifyCallCompleted:    data.notifyCallCompleted,
        notifyDailyDigest:      data.notifyDailyDigest,
        notifyCampaignCompleted:data.notifyCampaignCompleted,
        notifyWeeklyReport:     data.notifyWeeklyReport,
        notifyAgentErrors:      data.notifyAgentErrors,
        notifyBillingAlerts:    data.notifyBillingAlerts,
      });
    }
  }, [data]);

  const update = trpc.organization.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
      setDirty(false);
      utils.organization.getNotificationSettings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function toggle(key: keyof NotifState) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(true);
      return next;
    });
  }

  function handleSave() {
    update.mutate(settings);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Choose which email notifications your organization receives
          </p>
        </div>
        {dirty && (
          <Button onClick={handleSave} disabled={update.isLoading}>
            {update.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        )}
      </div>

      {/* Email notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Emails are sent to all admin and owner members of your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TooltipProvider>
              <div className="divide-y divide-border">
                {NOTIFICATION_SETTINGS.map(({ key, label, description, icon: Icon, tooltip }) => (
                  <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3 pr-4">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                            {label}
                          </Label>
                          {tooltip && <HelpTooltip content={tooltip} />}
                        </div>
                        <p
                          className="text-xs text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: description }}
                        />
                      </div>
                    </div>
                    <Switch
                      id={key}
                      checked={settings[key]}
                      onCheckedChange={() => toggle(key)}
                      disabled={update.isLoading}
                    />
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">About notification delivery</p>
              <p className="text-xs text-muted-foreground">
                Emails are delivered to addresses associated with owner and admin accounts.
                Ensure your custom email domain is verified under{" "}
                <a href="/dashboard/settings/email" className="text-primary hover:underline">
                  Email Branding
                </a>{" "}
                for reliable delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
