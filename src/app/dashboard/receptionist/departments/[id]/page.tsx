"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StaffForm } from "@/components/receptionist/staff-form";
import { StaffAvailability } from "@/components/receptionist/staff-availability";
import { MessageList } from "@/components/receptionist/message-list";
import { MessageDetail } from "@/components/receptionist/message-detail";

export default function DepartmentDetailPage({ params }: { params: { id: string } }) {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const { data: dept, isLoading, refetch } = trpc.receptionist["departments.get"].useQuery({ id: params.id });

  const deleteStaff = trpc.receptionist["staff.delete"].useMutation({
    onSuccess: () => { toast.success("Staff member removed"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
    );
  }

  if (!dept) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Department not found</h2>
        <Link href="/dashboard/receptionist/departments" className="mt-4 inline-block text-primary hover:underline">Back to Departments</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/receptionist/departments">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${(dept as any).isOpen ? "bg-green-100" : "bg-gray-100"}`}>
              <Building2 className={`h-6 w-6 ${(dept as any).isOpen ? "text-green-600" : "text-gray-400"}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`font-medium ${(dept as any).isOpen ? "text-green-600" : "text-gray-400"}`}>
                  {(dept as any).isOpen ? "Open" : "Closed"}
                </span>
                {dept.description && <>&middot; {dept.description}</>}
              </div>
            </div>
          </div>
        </div>
        <Button onClick={() => { setEditingStaff(null); setShowStaffForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Staff
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Department Info</h2>
          <div className="space-y-2 text-sm">
            {dept.phoneNumber && <p><span className="text-gray-500">Phone:</span> {dept.phoneNumber}</p>}
            {dept.extension && <p><span className="text-gray-500">Extension:</span> {dept.extension}</p>}
            {dept.email && <p><span className="text-gray-500">Email:</span> {dept.email}</p>}
            <p><span className="text-gray-500">Staff members:</span> {dept.staffMembers.length}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Staff Members</h2>
          {dept.staffMembers.length > 0 ? (
            <div className="space-y-2">
              {dept.staffMembers.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${staff.isAvailable ? "bg-green-100" : "bg-gray-100"}`}>
                      <User className={`h-4 w-4 ${staff.isAvailable ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{staff.name}</p>
                      <p className="text-xs text-gray-500">{staff.role || "Staff"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingStaff(staff); setShowStaffForm(true); }} className="rounded p-1 hover:bg-gray-200">
                      <Edit className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => { if (confirm("Remove this staff member?")) deleteStaff.mutate({ id: staff.id }); }} className="rounded p-1 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No staff in this department</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowStaffForm(true)}>
                <Plus className="mr-1 h-3 w-3" />Add Staff
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Messages</h2>
        <MessageList
          messages={(dept.messages as any) || []}
          onSelect={(id) => setSelectedMessageId(id)}
        />
      </div>

      {showStaffForm && (
        <StaffForm
          staff={editingStaff}
          defaultDepartmentId={dept.id}
          onClose={() => setShowStaffForm(false)}
          onSuccess={() => refetch()}
        />
      )}

      {selectedMessageId && (
        <MessageDetail
          messageId={selectedMessageId}
          onClose={() => setSelectedMessageId(null)}
          onUpdate={() => { refetch(); setSelectedMessageId(null); }}
        />
      )}
    </div>
  );
}
