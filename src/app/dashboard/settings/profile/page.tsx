"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Shield, Building2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner:   { label: "Owner",   color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  admin:   { label: "Admin",   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  manager: { label: "Manager", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  member:  { label: "Member",  color: "bg-secondary text-secondary-foreground" },
  viewer:  { label: "Viewer",  color: "bg-secondary text-secondary-foreground" },
};

export default function ProfileSettingsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const utils = trpc.useUtils();

  const { data: me, isLoading } = trpc.users.me.useQuery();

  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);

  // Hydrate form once data arrives
  useEffect(() => {
    if (me?.name) {
      setName(me.name);
    }
  }, [me?.name]);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      setDirty(false);
      utils.users.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleNameChange(v: string) {
    setName(v);
    setDirty(v.trim() !== (me?.name ?? "").trim());
  }

  function handleSave() {
    if (!name.trim()) return;
    updateProfile.mutate({ name: name.trim() });
  }

  const roleInfo = ROLE_LABELS[me?.role ?? "member"] ?? ROLE_LABELS.member!;

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
          <p className="text-sm text-muted-foreground">
            Manage your personal information and account details
          </p>
        </div>
        {dirty && (
          <Button onClick={handleSave} disabled={updateProfile.isLoading}>
            {updateProfile.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        )}
      </div>

      {/* Avatar section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Your avatar is managed through your Clerk account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {clerkUser?.imageUrl ? (
              <img
                src={clerkUser.imageUrl}
                alt={clerkUser.fullName ?? "Profile picture"}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {clerkUser?.fullName ?? me?.name ?? "No name set"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{me?.email}</p>
              <a
                href="https://accounts.clerk.com/user"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Change avatar in account settings
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Display Name
          </CardTitle>
          <CardDescription>
            Your name as it appears to teammates and in reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Your full name"
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & account info — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Account Information
          </CardTitle>
          <CardDescription>
            These fields are managed by your authentication provider and cannot be changed here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email address</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">{me?.email ?? "—"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Organization role</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Organization</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {me?.organization?.name ?? "—"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Member since</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2">
                <span className="text-sm text-foreground">
                  {me?.createdAt
                    ? new Date(me.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security note */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Password &amp; Security</p>
              <p className="text-xs text-muted-foreground">
                Password changes, two-factor authentication, and connected accounts are managed through your Clerk account portal.
              </p>
              <a
                href="https://accounts.clerk.com/user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open security settings
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
