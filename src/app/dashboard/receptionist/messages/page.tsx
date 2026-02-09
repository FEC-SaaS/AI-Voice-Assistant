"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageList } from "@/components/receptionist/message-list";
import { MessageDetail } from "@/components/receptionist/message-detail";

export default function MessagesPage() {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [urgencyFilter, setUrgencyFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = trpc.receptionist["messages.list"].useQuery({
    status: statusFilter as any,
    urgency: urgencyFilter as any,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/receptionist">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Messages taken by your AI receptionist</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={statusFilter || ""}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="forwarded">Forwarded</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={urgencyFilter || ""}
          onChange={(e) => setUrgencyFilter(e.target.value || undefined)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Urgency</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" /></div>
      ) : data?.messages ? (
        <MessageList messages={data.messages as any} onSelect={(id) => setSelectedMessageId(id)} />
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/70" />
          <h3 className="mt-3 text-lg font-medium text-foreground">No messages</h3>
          <p className="mt-1 text-sm text-muted-foreground">Messages from callers will appear here</p>
        </div>
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
