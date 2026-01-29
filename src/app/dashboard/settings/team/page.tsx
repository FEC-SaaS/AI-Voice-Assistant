"use client";

import { useState } from "react";
import {
  Users, UserPlus, Loader2, MoreVertical, Shield,
  Crown, UserCog, User, Eye, Trash2, Mail,
} from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const ROLE_CONFIG: Record<string, { icon: typeof User; label: string; color: string }> = {
  owner: { icon: Crown, label: "Owner", color: "text-yellow-600 bg-yellow-50" },
  admin: { icon: Shield, label: "Admin", color: "text-purple-600 bg-purple-50" },
  manager: { icon: UserCog, label: "Manager", color: "text-blue-600 bg-blue-50" },
  member: { icon: User, label: "Member", color: "text-gray-600 bg-gray-50" },
  viewer: { icon: Eye, label: "Viewer", color: "text-gray-500 bg-gray-50" },
};

export default function TeamPage() {
  const { organization } = useOrganization();
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<{ id: string; role: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: currentUser } = trpc.users.me.useQuery();
  const { data: users, isLoading } = trpc.users.list.useQuery();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500">Manage who has access to your organization</p>
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
                <p className="text-sm text-gray-500">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users?.filter((u) => u.role === "admin" || u.role === "owner").length || 0}
                </p>
                <p className="text-sm text-gray-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to {organization?.name || "your organization"}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.member;
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
                        <p className="font-medium text-gray-900">
                          {user.name || "No name"}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
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
                              className="text-red-600"
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
                    <Icon className="h-5 w-5 text-gray-600" />
                    <h4 className="font-medium">{config.label}</h4>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {key === "admin" && "Full access to all features and settings"}
                    {key === "manager" && "Can manage agents, campaigns, and calls"}
                    {key === "member" && "Can view and use agents, limited settings"}
                    {key === "viewer" && "Read-only access to analytics and calls"}
                  </p>
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
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
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
              Team invitations are managed through Clerk. Use your Clerk dashboard to invite new members.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm text-blue-800">
                  To invite team members, go to your Clerk Dashboard and use the organization management
                  features to send invitations. New members will automatically appear here once they accept.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer">
                Open Clerk Dashboard
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
