import Link from "next/link";
import { Bot, Phone, Megaphone, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { SetupGuideBanner } from "@/components/dashboard/setup-guide-banner";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  // -- Previously hardcoded stats (always showed 0) --
  // const stats = {
  //   agents: { count: 0 },
  //   calls: { count: 0 },
  //   campaigns: { count: 0 },
  //   minutes: { count: 0 },
  // };

  const { userId, orgId: clerkOrgId } = await auth();

  const org = clerkOrgId
    ? await db.organization.findFirst({ where: { clerkOrgId }, select: { id: true } })
    : null;

  const dbUser = userId
    ? await db.user.findFirst({ where: { clerkId: userId }, select: { name: true } })
    : null;

  const orgId = org?.id ?? null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [agentCount, callCount, campaignCount, minutesAgg] = orgId
    ? await Promise.all([
        db.agent.count({ where: { organizationId: orgId, isActive: true } }),
        db.call.count({ where: { organizationId: orgId } }),
        db.campaign.count({ where: { organizationId: orgId } }),
        db.call.aggregate({
          where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
          _sum: { durationSeconds: true },
        }),
      ])
    : [0, 0, 0, { _sum: { durationSeconds: 0 } }];

  const minutesUsed = Math.round(
    ((minutesAgg as { _sum: { durationSeconds: number | null } })._sum.durationSeconds ?? 0) / 60
  );

  const stats = {
    agents: { count: agentCount as number },
    calls: { count: callCount as number },
    campaigns: { count: campaignCount as number },
    minutes: { count: minutesUsed },
  };

  const firstName = dbUser?.name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto">
      {/* Setup Guide Banner — shown only for new accounts */}
      <SetupGuideBanner />

      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 lg:p-8 text-white shadow-lg shadow-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* Previously: <h1>Welcome back!</h1> — static, no name, wrong for new users */}
            <h1 className="text-2xl lg:text-3xl font-bold">
              {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
            </h1>
            <p className="mt-1 text-white/80 text-sm lg:text-base">
              {stats.agents.count === 0
                ? "Get started by creating your first voice agent."
                : "Here's an overview of your account activity."}
            </p>
          </div>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-5 py-2.5 text-sm font-semibold text-primary shadow-md hover:shadow-lg transition-all hover:scale-105"
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
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-3 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard title="Create Agent" description="Build a new voice agent" href="/dashboard/agents/new" icon={Bot} />
          <QuickActionCard title="Start Campaign" description="Launch outbound calls" href="/dashboard/campaigns/new" icon={Megaphone} />
          <QuickActionCard title="View Analytics" description="Track performance" href="/dashboard/analytics" icon={BarChart3} />
        </div>
      </div>

      {/* Recent Calls */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Calls</h2>
          <Link href="/dashboard/calls" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm">
          <div className="p-8 lg:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <Phone className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <p className="mt-4 font-medium text-foreground">No calls yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create an agent and make a test call to see activity here.</p>
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

// Previously: bg/text fields were defined but never consumed by StatCard.
// Previously: violet/amber/emerald used *-50 (near-white) which clashes with the dark theme.
// Fixed: only `icon` is kept (the only field actually used), colors updated to dark-mode-safe variants.
const colorClasses = {
  violet: { icon: "bg-violet-500" },
  blue:   { icon: "bg-blue-500"   },
  amber:  { icon: "bg-amber-500"  },
  emerald:{ icon: "bg-emerald-500"},
};

function StatCard({ title, value, icon: Icon, href, color }: { title: string; value: number; icon: React.ElementType; href: string; color: keyof typeof colorClasses }) {
  const { icon: iconClass } = colorClasses[color];
  return (
    <Link href={href} className="group rounded-2xl border border-border/50 bg-card p-4 lg:p-6 transition-all hover:shadow-lg hover:shadow-border/50 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl ${iconClass} p-2.5 lg:p-3 shadow-lg`}>
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-3 lg:mt-4">
        <p className="text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs lg:text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </Link>
  );
}

function QuickActionCard({ title, description, href, icon: Icon }: { title: string; description: string; href: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 lg:p-5 transition-all hover:shadow-lg hover:shadow-border/50 hover:border-primary/20 hover:-translate-y-0.5">
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
    </Link>
  );
}
