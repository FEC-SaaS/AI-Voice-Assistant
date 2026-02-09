"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Building2, Edit, Trash2, Loader2, Users, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DepartmentForm } from "@/components/receptionist/department-form";

export default function DepartmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const { data: departments, isLoading, refetch } = trpc.receptionist["departments.list"].useQuery();

  const deleteDept = trpc.receptionist["departments.delete"].useMutation({
    onSuccess: () => { toast.success("Department deleted"); refetch(); },
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
            <h1 className="text-2xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground">Manage your company departments and business hours</p>
          </div>
        </div>
        <Button onClick={() => { setEditingDept(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Department
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" /></div>
      ) : departments && departments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Link key={dept.id} href={`/dashboard/receptionist/departments/${dept.id}`} className="block">
              <div className="rounded-lg border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${(dept as any).isOpen ? "bg-green-500/10" : "bg-secondary"}`}>
                      <Building2 className={`h-5 w-5 ${(dept as any).isOpen ? "text-green-400" : "text-muted-foreground/70"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{dept.name}</h3>
                      <span className={`text-xs font-medium ${(dept as any).isOpen ? "text-green-400" : "text-muted-foreground/70"}`}>
                        {(dept as any).isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                    <button onClick={() => { setEditingDept(dept); setShowForm(true); }} className="rounded p-1 hover:bg-secondary">
                      <Edit className="h-4 w-4 text-muted-foreground/70" />
                    </button>
                    <button onClick={() => { if (confirm("Delete this department?")) deleteDept.mutate({ id: dept.id }); }} className="rounded p-1 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
                {dept.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{dept.description}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{dept._count.staffMembers} staff</span>
                  {dept.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{dept.phoneNumber}</span>}
                  {dept.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{dept.email}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/70" />
          <h3 className="mt-3 text-lg font-medium text-foreground">No departments yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create departments so your AI receptionist can direct callers</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />Create First Department
          </Button>
        </div>
      )}

      {showForm && <DepartmentForm department={editingDept} onClose={() => setShowForm(false)} onSuccess={() => refetch()} />}
    </div>
  );
}
