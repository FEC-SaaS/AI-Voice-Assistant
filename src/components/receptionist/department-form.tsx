"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X } from "lucide-react";

interface DepartmentFormProps {
  department?: {
    id: string;
    name: string;
    description: string | null;
    phoneNumber: string | null;
    extension: string | null;
    email: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DepartmentForm({ department, onClose, onSuccess }: DepartmentFormProps) {
  const [name, setName] = useState(department?.name || "");
  const [description, setDescription] = useState(department?.description || "");
  const [phoneNumber, setPhoneNumber] = useState(department?.phoneNumber || "");
  const [extension, setExtension] = useState(department?.extension || "");
  const [email, setEmail] = useState(department?.email || "");

  const createDept = trpc.receptionist["departments.create"].useMutation({
    onSuccess: () => { toast.success("Department created"); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const updateDept = trpc.receptionist["departments.update"].useMutation({
    onSuccess: () => { toast.success("Department updated"); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const isLoading = createDept.isLoading || updateDept.isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }

    if (department) {
      updateDept.mutate({ id: department.id, data: { name, description, phoneNumber, extension, email } });
    } else {
      createDept.mutate({ name, description, phoneNumber, extension, email });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{department ? "Edit Department" : "New Department"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Sales" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this department handles" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Extension</Label>
              <Input value={extension} onChange={(e) => setExtension(e.target.value)} placeholder="101" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@company.com" />
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
