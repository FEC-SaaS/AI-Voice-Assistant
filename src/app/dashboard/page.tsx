import Link from "next/link";
import { Bot, Phone, Megaphone, BarChart3, ArrowRight } from "lucide-react";

export default async function DashboardPage() {

  const stats = {
    agents: { count: 0 },
    calls: { count: 0 },
    campaigns: { count: 0 },
    minutes: { count: 0 },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome to VoxForge AI. Get started by creating your first AI agent.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Agents" value={stats.agents.count} icon={Bot} href="/dashboard/agents" />
        <StatCard title="Total Calls" value={stats.calls.count} icon={Phone} href="/dashboard/calls" />
        <StatCard title="Active Campaigns" value={stats.campaigns.count} icon={Megaphone} href="/dashboard/campaigns" />
        <StatCard title="Minutes Used" value={stats.minutes.count} icon={BarChart3} href="/dashboard/analytics" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard title="Create Agent" description="Build a new AI voice agent" href="/dashboard/agents/new" icon={Bot} />
          <QuickActionCard title="Start Campaign" description="Launch an outbound calling campaign" href="/dashboard/campaigns/new" icon={Megaphone} />
          <QuickActionCard title="View Analytics" description="See how your agents are performing" href="/dashboard/analytics" icon={BarChart3} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          <Link href="/dashboard/calls" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="p-8 text-center text-gray-500">
            <Phone className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4">No calls yet</p>
            <p className="text-sm">Create an agent and make a test call to see activity here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, href }: { title: string; value: number; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, description, href, icon: Icon }: { title: string; description: string; href: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-lg border bg-white p-6 transition-all hover:border-primary hover:shadow-md">
      <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary">
        <Icon className="h-5 w-5 text-primary group-hover:text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
