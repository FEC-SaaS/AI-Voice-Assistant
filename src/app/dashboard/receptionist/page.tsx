"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneForwarded, Building2, Users, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ReceptionistStats } from "@/components/receptionist/receptionist-stats";
import { MessageList } from "@/components/receptionist/message-list";
import { StaffAvailability } from "@/components/receptionist/staff-availability";
import { MessageDetail } from "@/components/receptionist/message-detail";

export default function ReceptionistDashboardPage() {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const { data: stats, isLoading: statsLoading } = trpc.receptionist["dashboard.stats"].useQuery();
  const { data: messagesData, refetch: refetchMessages } = trpc.receptionist["messages.list"].useQuery(
    { status: "new", limit: 10 }
  );
  const { data: staff, refetch: refetchStaff } = trpc.receptionist["staff.list"].useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receptionist</h1>
          <p className="text-muted-foreground">Manage your AI receptionist, departments, and messages</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/receptionist/departments">
            <Button variant="outline" size="sm"><Building2 className="mr-2 h-4 w-4" />Departments</Button>
          </Link>
          <Link href="/dashboard/receptionist/staff">
            <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Staff</Button>
          </Link>
          <Link href="/dashboard/receptionist/messages">
            <Button variant="outline" size="sm"><MessageSquare className="mr-2 h-4 w-4" />Messages</Button>
          </Link>
        </div>
      </div>

      {stats && <ReceptionistStats stats={stats} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">New Messages</h2>
            <Link href="/dashboard/receptionist/messages" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          {messagesData?.messages ? (
            <MessageList messages={messagesData.messages as any} onSelect={(id) => setSelectedMessageId(id)} />
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <p className="mt-2 text-sm text-muted-foreground">No new messages</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Staff Availability</h2>
            <Link href="/dashboard/receptionist/staff" className="text-sm text-primary hover:underline">Manage</Link>
          </div>
          {staff ? (
            <StaffAvailability staff={staff as any} onUpdate={() => refetchStaff()} />
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <p className="mt-2 text-sm text-muted-foreground">No staff members</p>
            </div>
          )}
        </div>
      </div>

      {selectedMessageId && (
        <MessageDetail
          messageId={selectedMessageId}
          onClose={() => setSelectedMessageId(null)}
          onUpdate={() => { refetchMessages(); setSelectedMessageId(null); }}
        />
      )}
    </div>
  );
}
