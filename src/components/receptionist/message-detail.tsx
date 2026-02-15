"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Mail, CheckCircle, ArrowLeft } from "lucide-react";

interface MessageDetailProps {
  messageId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function MessageDetail({ messageId, onClose, onUpdate }: MessageDetailProps) {
  const { data: msg, isLoading } = trpc.receptionist["messages.get"].useQuery({ id: messageId });
  const [forwardTo, setForwardTo] = useState("");
  const [forwardVia] = useState<"email" | "sms">("email");
  const [showForward, setShowForward] = useState(false);

  const updateStatus = trpc.receptionist["messages.updateStatus"].useMutation({
    onSuccess: () => { toast.success("Status updated"); onUpdate(); },
    onError: (err) => toast.error(err.message),
  });

  const forwardMsg = trpc.receptionist["messages.forward"].useMutation({
    onSuccess: () => { toast.success("Message forwarded"); setShowForward(false); onUpdate(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !msg) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-card p-8">Loading...</div>
      </div>
    );
  }

  const urgencyColors: Record<string, string> = {
    low: "bg-secondary text-muted-foreground",
    normal: "bg-blue-100 text-blue-400",
    high: "bg-amber-500/10 text-amber-400",
    urgent: "bg-red-100 text-red-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyColors[msg.urgency]}`}>
              {msg.urgency} priority
            </span>
            <span className="text-xs text-muted-foreground/70">
              {new Date(msg.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg bg-secondary p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{msg.callerName || "Unknown"}</span></div>
              {msg.callerPhone && <div><span className="text-muted-foreground">Phone:</span> {msg.callerPhone}</div>}
              {msg.callerEmail && <div><span className="text-muted-foreground">Email:</span> {msg.callerEmail}</div>}
              {msg.callerCompany && <div><span className="text-muted-foreground">Company:</span> {msg.callerCompany}</div>}
              {msg.department && <div><span className="text-muted-foreground">Department:</span> {msg.department.name}</div>}
              {msg.staffMember && <div><span className="text-muted-foreground">For:</span> {msg.staffMember.name}</div>}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Message</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap bg-card border rounded-lg p-4">{msg.body}</p>
          </div>

          {msg.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {msg.status === "new" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: msg.id, status: "read" })}>
                Mark as Read
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowForward(!showForward)}>
              <Mail className="mr-1 h-3 w-3" /> Forward
            </Button>
            {msg.status !== "resolved" && (
              <Button size="sm" onClick={() => updateStatus.mutate({ id: msg.id, status: "resolved" })}>
                <CheckCircle className="mr-1 h-3 w-3" /> Resolve
              </Button>
            )}
          </div>

          {showForward && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => forwardMsg.mutate({ id: msg.id, via: forwardVia, to: forwardTo })}
                  disabled={forwardMsg.isLoading || !forwardTo.trim()}
                >
                  {forwardMsg.isLoading ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
