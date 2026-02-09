"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X } from "lucide-react";

interface StaffFormProps {
  staff?: {
    id: string;
    name: string;
    role: string | null;
    phoneNumber: string | null;
    email: string | null;
    departmentId: string;
  };
  defaultDepartmentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffForm({ staff, defaultDepartmentId, onClose, onSuccess }: StaffFormProps) {
  const [name, setName] = useState(staff?.name || "");
  const [role, setRole] = useState(staff?.role || "");
  const [phoneNumber, setPhoneNumber] = useState(staff?.phoneNumber || "");
  const [email, setEmail] = useState(staff?.email || "");
  const [departmentId, setDepartmentId] = useState(staff?.departmentId || defaultDepartmentId || "");

  const { data: departments } = trpc.receptionist["departments.list"].useQuery();

  const createStaff = trpc.receptionist["staff.create"].useMutation({
    onSuccess: () => { toast.success("Staff member added"); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const updateStaff = trpc.receptionist["staff.update"].useMutation({
    onSuccess: () => { toast.success("Staff member updated"); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const isLoading = createStaff.isLoading || updateStaff.isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!departmentId) { toast.error("Department is required"); return; }

    if (staff) {
      updateStaff.mutate({ id: staff.id, data: { name, role, phoneNumber, email, departmentId } });
    } else {
      createStaff.mutate({ name, role, phoneNumber, email, departmentId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{staff ? "Edit Staff Member" : "Add Staff Member"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Manager, Specialist" />
          </div>
          <div className="space-y-2">
            <Label>Department *</Label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select department...</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
