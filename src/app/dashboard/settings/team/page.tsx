"use client";

import { useState } from "react";
import {
  Users, UserPlus, Loader2, MoreVertical, Shield,
  Crown, UserCog, User, Eye, Trash2, Mail, Clock,
  RefreshCw, XCircle,
} from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { icon: typeof User; label: string; color: string; description: string }> = {
  owner: { icon: Crown, label: "Owner", color: "text-yellow-400 bg-yellow-500/10", description: "Full control over organization" },
  admin: { icon: Shield, label: "Admin", color: "text-purple-400 bg-purple-500/10", description: "Full access to all features and settings" },
  manager: { icon: UserCog, label: "Manager", color: "text-blue-400 bg-blue-500/10", description: "Can manage agents, campaigns, and calls" },
  member: { icon: User, label: "Member", color: "text-muted-foreground bg-secondary", description: "Can view and use agents, limited settings" },
  viewer: { icon: Eye, label: "Viewer", color: "text-muted-foreground bg-secondary", description: "Read-only access to analytics and calls" },
};

export default function TeamPage() {
  const { organization } = useOrganization();
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<{ id: string; role: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [revokeInvitationId, setRevokeInvitationId] = useState<string | null>(null);

  const { data: currentUser } = trpc.users.me.useQuery();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: pendingInvitations, isLoading: loadingInvitations } = trpc.users.listInvitations.useQuery(
    undefined,
    { enabled: currentUser?.role === "owner" || currentUser?.role === "admin" }
  );
  const utils = trpc.useUtils();

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.users.list.invalidate();
      setEditUser(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeUser = trpc.users.remove.useMutation({
    onSuccess: () => {
      toast.success("Team member removed");
      utils.users.list.invalidate();
      setRemoveUserId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const inviteMember = trpc.users.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully!");
      utils.users.listInvitations.invalidate();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeInvitation = trpc.users.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.users.listInvitations.invalidate();
      setRevokeInvitationId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendInvitation = trpc.users.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent");
      utils.users.listInvitations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  const handleRoleChange = (role: string) => {
    if (editUser) {
      updateRole.mutate({
        userId: editUser.id,
        role: role as "admin" | "manager" | "member" | "viewer",
      });
    }
  };

  const handleRemove = () => {
    if (removeUserId) {
      removeUser.mutate({ userId: removeUserId });
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    inviteMember.mutate({
      email: inviteEmail.trim(),
      role: inviteRole as "admin" | "manager" | "member" | "viewer",
    });
  };

  const handleRevokeInvitation = () => {
    if (revokeInvitationId) {
      revokeInvitation.mutate({ invitationId: revokeInvitationId });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground">Manage who has access to your organization</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users?.filter((u) => u.role === "admin" || u.role === "owner").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-500/10 p-3">
                <Mail className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvitations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {isAdmin && pendingInvitations && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
              </div>
            ) : (
              <div className="divide-y">
                {pendingInvitations.map((invitation: { id: string; email: string; role: string; createdAt: Date }) => {
                  const roleConfig = ROLE_CONFIG[invitation.role] ?? {
                    icon: User,
                    label: "Member",
                    color: "text-muted-foreground bg-secondary",
                    description: "",
                  };
                  const RoleIcon = roleConfig.icon;

                  return (
                    <div key={invitation.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited {formatTimeAgo(invitation.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={roleConfig.color}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {roleConfig.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInvitation.mutate({ invitationId: invitation.id })}
                          disabled={resendInvitation.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-foreground hover:bg-secondary"
                          onClick={() => setRevokeInvitationId(invitation.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to {organization?.name || "your organization"}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/70" />
              <p className="mt-2 text-muted-foreground">No team members yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] ?? {
                  icon: User,
                  label: "Member",
                  color: "text-muted-foreground bg-secondary",
                  description: "",
                };
                const RoleIcon = roleConfig.icon;
                const isCurrentUser = user.clerkId === currentUser?.clerkId;

                return (
                  <div key={user.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.imageUrl || undefined} />
                        <AvatarFallback>
                          {(user.name || user.email).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.name || "No name"}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={roleConfig.color}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {roleConfig.label}
                      </Badge>
                      {isAdmin && user.role !== "owner" && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditUser({ id: user.id, role: user.role })}>
                              <UserCog className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => setRemoveUserId(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>What each role can do in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ROLE_CONFIG).filter(([key]) => key !== "owner").map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium">{config.label}</h4>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Select a new role for this team member
            </DialogDescription>
          </DialogHeader>
          <Select value={editUser?.role} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin - Full access to all features</SelectItem>
              <SelectItem value="manager">Manager - Manage agents and campaigns</SelectItem>
              <SelectItem value="member">Member - Use agents, limited settings</SelectItem>
              <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeUserId} onOpenChange={() => setRemoveUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this team member? They will lose access to the organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUserId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeUser.isPending}
            >
              {removeUser.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. They&apos;ll receive an email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access to all features</SelectItem>
                  <SelectItem value="manager">Manager - Manage agents and campaigns</SelectItem>
                  <SelectItem value="member">Member - Use agents, limited settings</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMember.isPending}>
              {inviteMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Invitation Dialog */}
      <Dialog open={!!revokeInvitationId} onOpenChange={() => setRevokeInvitationId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this invitation? The recipient will no longer be able to join.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeInvitationId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvitation}
              disabled={revokeInvitation.isPending}
            >
              {revokeInvitation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
