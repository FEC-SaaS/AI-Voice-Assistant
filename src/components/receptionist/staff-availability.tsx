"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
  isAvailable: boolean;
  department: { id: string; name: string };
}

interface StaffAvailabilityProps {
  staff: StaffMember[];
  onUpdate: () => void;
}

export function StaffAvailability({ staff, onUpdate }: StaffAvailabilityProps) {
  const toggleAvailability = trpc.receptionist["staff.toggleAvailability"].useMutation({
    onSuccess: () => { toast.success("Availability updated"); onUpdate(); },
    onError: (err) => toast.error(err.message),
  });

  if (staff.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <User className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No staff members yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white divide-y">
      {staff.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${member.isAvailable ? "bg-green-100" : "bg-gray-100"}`}>
              <User className={`h-4 w-4 ${member.isAvailable ? "text-green-600" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role ? `${member.role} — ` : ""}{member.department.name}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={member.isAvailable}
              onChange={() => toggleAvailability.mutate({ id: member.id })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      ))}
    </div>
  );
}
