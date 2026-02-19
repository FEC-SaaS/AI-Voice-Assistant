"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Ban, RefreshCw, Clock, CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ActionDropdownProps {
  orgId: string;
  orgName: string;
  isSuspended: boolean;
  currentPlan: string;
  onSuccess?: () => void;
}

export function ActionDropdown({ orgId, orgName, isSuspended, currentPlan, onSuccess }: ActionDropdownProps) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [trialDays, setTrialDays] = useState("14");
  const [newPlan, setNewPlan] = useState(currentPlan);

  const utils = trpc.useUtils();

  const suspend = trpc.admin.orgs.suspendOrg.useMutation({
    onSuccess: () => { toast.success("Organization suspended"); setSuspendOpen(false); utils.admin.orgs.list.invalidate(); onSuccess?.(); },
    onError: (e) => toast.error(e.message),
  });

  const unsuspend = trpc.admin.orgs.unsuspendOrg.useMutation({
    onSuccess: () => { toast.success("Organization unsuspended"); utils.admin.orgs.list.invalidate(); onSuccess?.(); },
    onError: (e) => toast.error(e.message),
  });

  const extendTrial = trpc.admin.orgs.extendTrial.useMutation({
    onSuccess: () => { toast.success("Trial extended"); setTrialOpen(false); onSuccess?.(); },
    onError: (e) => toast.error(e.message),
  });

  const changePlan = trpc.admin.orgs.changePlan.useMutation({
    onSuccess: () => { toast.success("Plan updated"); setPlanOpen(false); utils.admin.orgs.list.invalidate(); onSuccess?.(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isSuspended ? (
            <DropdownMenuItem onClick={() => unsuspend.mutate({ orgId })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Unsuspend
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="text-destructive" onClick={() => setSuspendOpen(true)}>
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTrialOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            Extend Trial
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPlanOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Change Plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend Dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              Suspend <strong>{orgName}</strong>? They will lose access to all features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => suspend.mutate({ orgId })} disabled={suspend.isPending}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>Extend the trial for <strong>{orgName}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Additional days</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialOpen(false)}>Cancel</Button>
            <Button onClick={() => extendTrial.mutate({ orgId, days: Number(trialDays) })} disabled={extendTrial.isPending}>
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>Update the plan for <strong>{orgName}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New Plan</Label>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free-trial">Free Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={() => changePlan.mutate({ orgId, planId: newPlan })} disabled={changePlan.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
