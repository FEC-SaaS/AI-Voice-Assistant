"use client";

import { Phone, Clock, Users, Megaphone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewData {
  calls: { total: number; completed: number; successRate: number };
  minutes: { total: number; avgPerCall: number };
  agents: { total: number; active: number };
  campaigns: { total: number; active: number };
}

interface DashboardCardsProps {
  overview: OverviewData | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle: string;
  isLoading: boolean;
}

function StatCard({ title, icon, value, subtitle, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCards({ overview, isLoading }: DashboardCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Calls"
        icon={<Phone className="h-4 w-4 text-muted-foreground" />}
        value={overview?.calls.total || 0}
        subtitle={`${overview?.calls.completed || 0} completed (${overview?.calls.successRate || 0}% success)`}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Minutes"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        value={overview?.minutes.total || 0}
        subtitle={`Avg ${overview?.minutes.avgPerCall || 0} min per call`}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Agents"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        value={overview?.agents.active || 0}
        subtitle={`of ${overview?.agents.total || 0} total agents`}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Campaigns"
        icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
        value={overview?.campaigns.active || 0}
        subtitle={`of ${overview?.campaigns.total || 0} total campaigns`}
        isLoading={isLoading}
      />
    </div>
  );
}
