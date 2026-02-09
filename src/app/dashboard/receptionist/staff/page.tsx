"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, User, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StaffForm } from "@/components/receptionist/staff-form";
import { StaffAvailability } from "@/components/receptionist/staff-availability";

export default function StaffPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { data: staff, isLoading, refetch } = trpc.receptionist["staff.list"].useQuery();

  const deleteStaff = trpc.receptionist["staff.delete"].useMutation({
    onSuccess: () => { toast.success("Staff member removed"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/receptionist">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Directory</h1>
            <p className="text-muted-foreground">Manage staff members and their availability</p>
          </div>
        </div>
        <Button onClick={() => { setEditingStaff(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" /></div>
      ) : staff && staff.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">Availability</h2>
          <StaffAvailability staff={staff as any} onUpdate={() => refetch()} />

          <h2 className="text-lg font-semibold mb-3 mt-6">All Staff</h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-secondary">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${member.isAvailable ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                        <span className="font-medium text-foreground text-sm">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.role || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.department.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.phoneNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{member.email || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditingStaff(member); setShowForm(true); }} className="rounded p-1 hover:bg-secondary">
                          <Edit className="h-4 w-4 text-muted-foreground/70" />
                        </button>
                        <button onClick={() => { if (confirm("Remove this staff member?")) deleteStaff.mutate({ id: member.id }); }} className="rounded p-1 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/70" />
          <h3 className="mt-3 text-lg font-medium text-foreground">No staff members yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add staff members so your AI receptionist can look them up and transfer calls</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Add First Staff Member
          </Button>
        </div>
      )}

      {showForm && (
        <StaffForm
          staff={editingStaff}
          onClose={() => setShowForm(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
