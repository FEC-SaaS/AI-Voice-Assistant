"use client";

import { MessageSquare, Clock, User, Building2 } from "lucide-react";

interface Message {
  id: string;
  callerName: string | null;
  callerPhone: string | null;
  callerCompany: string | null;
  body: string;
  urgency: string;
  status: string;
  department: { id: string; name: string } | null;
  staffMember: { id: string; name: string } | null;
  createdAt: string | Date;
}

interface MessageListProps {
  messages: Message[];
  onSelect?: (id: string) => void;
}

const urgencyBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const statusBadge: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  forwarded: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
};

export function MessageList({ messages, onSelect }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => {
        const date = new Date(msg.createdAt);
        const timeAgo = getTimeAgo(date);

        return (
          <div
            key={msg.id}
            onClick={() => onSelect?.(msg.id)}
            className={`rounded-lg border bg-white p-4 transition-colors hover:border-primary/30 ${onSelect ? "cursor-pointer" : ""} ${msg.status === "new" ? "border-l-4 border-l-blue-500" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{msg.callerName || "Unknown Caller"}</span>
                  {msg.callerCompany && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="h-3 w-3" />
                      {msg.callerCompany}
                    </span>
                  )}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${urgencyBadge[msg.urgency] || urgencyBadge.normal}`}>
                    {msg.urgency}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[msg.status] || statusBadge.new}`}>
                    {msg.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{msg.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  {msg.department && <span>{msg.department.name}</span>}
                  {msg.staffMember && <span>for {msg.staffMember.name}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
