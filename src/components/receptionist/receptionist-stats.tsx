"use client";

import { Phone, MessageSquare, Building2, Users } from "lucide-react";

interface ReceptionistStatsProps {
  stats: {
    callsHandled: number;
    messages: { new: number; total: number };
    departmentCount: number;
    staffCount: number;
    availableStaff: number;
    receptionistAgentCount: number;
  };
}

export function ReceptionistStats({ stats }: ReceptionistStatsProps) {
  const cards = [
    { label: "Calls Handled (30d)", value: stats.callsHandled, icon: Phone, color: "text-blue-400 bg-blue-500/10" },
    { label: "New Messages", value: stats.messages.new, icon: MessageSquare, color: "text-orange-400 bg-orange-500/10" },
    { label: "Total Messages", value: stats.messages.total, icon: MessageSquare, color: "text-muted-foreground bg-secondary" },
    { label: "Departments", value: stats.departmentCount, icon: Building2, color: "text-purple-400 bg-purple-500/10" },
    { label: "Staff Available", value: `${stats.availableStaff}/${stats.staffCount}`, icon: Users, color: "text-green-400 bg-green-500/10" },
    { label: "Receptionist Agents", value: stats.receptionistAgentCount, icon: Phone, color: "text-indigo-400 bg-indigo-500/10" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
