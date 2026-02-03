import Link from "next/link";
import { Bot, Phone, Megaphone, BarChart3, ArrowRight, Sparkles } from "lucide-react";

export default async function DashboardPage() {

  const stats = {
    agents: { count: 0 },
    calls: { count: 0 },
    campaigns: { count: 0 },
    minutes: { count: 0 },
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 lg:p-8 text-white shadow-lg shadow-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Welcome back!</h1>
            <p className="mt-1 text-white/80 text-sm lg:text-base">
              Get started by creating your first AI agent or launch a campaign.
            </p>
          </div>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            Create Agent
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:gap-6 lg:grid-cols-4">
        <StatCard title="Active Agents" value={stats.agents.count} icon={Bot} href="/dashboard/agents" color="violet" />
        <StatCard title="Total Calls" value={stats.calls.count} icon={Phone} href="/dashboard/calls" color="blue" />
        <StatCard title="Campaigns" value={stats.campaigns.count} icon={Megaphone} href="/dashboard/campaigns" color="amber" />
        <StatCard title="Minutes" value={stats.minutes.count} icon={BarChart3} href="/dashboard/analytics" color="emerald" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-3 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard title="Create Agent" description="Build a new AI voice agent" href="/dashboard/agents/new" icon={Bot} />
          <QuickActionCard title="Start Campaign" description="Launch outbound calls" href="/dashboard/campaigns/new" icon={Megaphone} />
          <QuickActionCard title="View Analytics" description="Track performance" href="/dashboard/analytics" icon={BarChart3} />
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          <Link href="/dashboard/calls" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200/50 bg-white shadow-sm">
          <div className="p-8 lg:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Phone className="h-8 w-8 text-gray-400" />
            </div>
            <p className="mt-4 font-medium text-gray-900">No calls yet</p>
            <p className="mt-1 text-sm text-gray-500">Create an agent and make a test call to see activity here.</p>
            <Link
              href="/dashboard/agents/new"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Create your first agent <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const colorClasses = {
  violet: {
    bg: "bg-violet-50",
    icon: "bg-violet-500",
    text: "text-violet-600",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-500",
    text: "text-blue-600",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-500",
    text: "text-amber-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-500",
    text: "text-emerald-600",
  },
};

function StatCard({ title, value, icon: Icon, href, color }: { title: string; value: number; icon: React.ElementType; href: string; color: keyof typeof colorClasses }) {
  const colors = colorClasses[color];
  return (
    <Link href={href} className="group rounded-2xl border border-gray-200/50 bg-white p-4 lg:p-6 transition-all hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl ${colors.icon} p-2.5 lg:p-3 shadow-lg`}>
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-3 lg:mt-4">
        <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
        <p className="mt-0.5 text-xs lg:text-sm font-medium text-gray-500">{title}</p>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, description, href, icon: Icon }: { title: string; description: string; href: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-gray-200/50 bg-white p-4 lg:p-5 transition-all hover:shadow-lg hover:shadow-gray-200/50 hover:border-primary/20 hover:-translate-y-0.5">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
    </Link>
  );
}
