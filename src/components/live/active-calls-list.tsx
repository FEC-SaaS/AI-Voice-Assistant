"use client";

import { Phone, Radio } from "lucide-react";
import { CallCard } from "@/components/live/call-card";

interface ActiveCall {
  id: string;
  vapiCallId: string | null;
  status: string | null;
  direction: string;
  fromNumber: string | null;
  toNumber: string | null;
  startedAt: string | Date | null;
  agentName: string | null;
  contactName: string | null;
  contactCompany: string | null;
  contactPhone: string | null;
  campaignName: string | null;
}

interface ActiveCallsListProps {
  calls: ActiveCall[];
  selectedCallId: string | null;
  onSelectCall: (callId: string) => void;
}

export function ActiveCallsList({
  calls,
  selectedCallId,
  onSelectCall,
}: ActiveCallsListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-gray-900">Active Calls</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {calls.length}
        </span>
      </div>

      {/* Call list */}
      {calls.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
            <Phone className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            No active calls
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-[200px]">
            Active calls will appear here in real-time when agents are on the
            phone.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              isSelected={selectedCallId === call.id}
              onClick={onSelectCall}
            />
          ))}
        </div>
      )}
    </div>
  );
}
