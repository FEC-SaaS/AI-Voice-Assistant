import Link from "next/link";
import { Bot, Phone, Megaphone, BarChart3, ArrowRight, Sparkles, Radio, Target, Brain, Zap } from "lucide-react";
import { SetupGuideBanner } from "@/components/dashboard/setup-guide-banner";

export default async function DashboardPage() {
  const stats = {
    agents:    { count: 0 },
    calls:     { count: 0 },
    campaigns: { count: 0 },
    minutes:   { count: 0 },
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Setup Guide Banner */}
      <SetupGuideBanner />

      {/* ── Hero Welcome Banner ───────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #1e1060 0%, #2d1b8e 40%, #1a0f6e 70%, #0e0830 100%)",
          boxShadow: "0 8px 40px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
          border: "1px solid rgba(129,140,248,0.2)",
        }}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl" />
        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "32px 32px" }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Platform Active
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome back! 👋</h1>
            <p className="mt-1.5 text-white/65 text-sm lg:text-base max-w-md">
              Your AI voice platform is ready. Create agents, launch campaigns, and watch your business grow.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Create Agent
            </Link>
            <Link href="/dashboard/live" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
              <Radio className="h-3.5 w-3.5" /> View live calls
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:gap-5 lg:grid-cols-4">
        <StatCard
          title="Active Agents"
          value={stats.agents.count}
          icon={Bot}
          href="/dashboard/agents"
          gradient="from-violet-600 to-indigo-600"
          glow="rgba(139,92,246,0.35)"
          textClass="text-gradient-primary"
          label="agents online"
        />
        <StatCard
          title="Total Calls"
          value={stats.calls.count}
          icon={Phone}
          href="/dashboard/calls"
          gradient="from-cyan-500 to-blue-600"
          glow="rgba(34,211,238,0.35)"
          textClass="text-gradient-cyan"
          label="calls made"
        />
        <StatCard
          title="Campaigns"
          value={stats.campaigns.count}
          icon={Megaphone}
          href="/dashboard/campaigns"
          gradient="from-amber-500 to-orange-600"
          glow="rgba(251,191,36,0.35)"
          textClass="text-gradient-amber"
          label="campaigns running"
        />
        <StatCard
          title="Minutes Used"
          value={stats.minutes.count}
          icon={BarChart3}
          href="/dashboard/analytics"
          gradient="from-emerald-500 to-teal-600"
          glow="rgba(52,211,153,0.35)"
          textClass="text-gradient-green"
          label="this month"
        />
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="section-label">Quick Actions</p>
        </div>
        <div className="grid gap-3 lg:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Create Voice Agent"
            description="Build an AI agent with custom prompts and voice"
            href="/dashboard/agents/new"
            icon={Bot}
            gradient="from-violet-600 to-indigo-600"
            glow="rgba(139,92,246,0.3)"
          />
          <QuickActionCard
            title="Launch Campaign"
            description="Start outbound calling at scale"
            href="/dashboard/campaigns/new"
            icon={Megaphone}
            gradient="from-amber-500 to-orange-600"
            glow="rgba(251,191,36,0.3)"
          />
          <QuickActionCard
            title="View Analytics"
            description="Track calls, sentiment, and performance"
            href="/dashboard/analytics"
            icon={BarChart3}
            gradient="from-sky-500 to-blue-600"
            glow="rgba(56,189,248,0.3)"
          />
        </div>
      </div>

      {/* ── Feature Highlights ────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureHighlight
          icon={Target}
          title="Smart Lead Scoring"
          description="AI-driven lead prioritization and next-best-action recommendations"
          href="/dashboard/leads"
          color="text-yellow-400"
          bg="bg-yellow-500/10"
          border="border-yellow-500/20"
        />
        <FeatureHighlight
          icon={Brain}
          title="Conversation Intelligence"
          description="Surface objections, competitor mentions, and coaching insights"
          href="/dashboard/intelligence"
          color="text-purple-400"
          bg="bg-purple-500/10"
          border="border-purple-500/20"
        />
        <FeatureHighlight
          icon={Zap}
          title="Live Call Monitoring"
          description="Real-time supervision with barge-in and whisper capabilities"
          href="/dashboard/live"
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/20"
        />
      </div>

      {/* ── Recent Calls ──────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="section-label">Recent Calls</p>
          <Link href="/dashboard/calls" className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0c0c1e, #10102a)",
            border: "1px solid rgba(99,102,241,0.1)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="p-10 lg:p-14 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <Phone className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="font-semibold text-foreground text-base">No calls yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
              Create an agent and make a test call to see activity here.
            </p>
            <Link
              href="/dashboard/agents/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-white">Create your first agent</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────── */
function StatCard({
  title, value, icon: Icon, href, gradient, glow, textClass, label,
}: {
  title: string; value: number; icon: React.ElementType; href: string;
  gradient: string; glow: string; textClass: string; label: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: "1px solid rgba(99,102,241,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2), 0 0 32px ${glow}, inset 0 1px 0 rgba(255,255,255,0.06)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)";
      }}
    >
      {/* Corner glow orb */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-xl opacity-60 transition-opacity group-hover:opacity-90"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
      />

      <div className="relative">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-4`}
          style={{ boxShadow: `0 4px 16px ${glow}` }}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Value */}
        <p className={`text-3xl font-bold tracking-tight ${textClass}`}>{value}</p>

        {/* Title + label */}
        <p className="mt-1 text-sm font-semibold text-foreground/90">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>

      {/* Arrow indicator */}
      <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

/* ── QuickActionCard ──────────────────────────────────────────────── */
function QuickActionCard({
  title, description, href, icon: Icon, gradient, glow,
}: {
  title: string; description: string; href: string; icon: React.ElementType;
  gradient: string; glow: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl p-4 lg:p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: "1px solid rgba(99,102,241,0.1)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.06)`;
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.1)";
      }}
    >
      <div
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} transition-transform duration-200 group-hover:scale-110`}
        style={{ boxShadow: `0 4px 16px ${glow}` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

/* ── FeatureHighlight ─────────────────────────────────────────────── */
function FeatureHighlight({
  icon: Icon, title, description, href, color, bg, border,
}: {
  icon: React.ElementType; title: string; description: string; href: string;
  color: string; bg: string; border: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${border}`}
      style={{ background: "linear-gradient(135deg, #0c0c1e, #10102a)" }}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${bg} ${border} border transition-transform group-hover:scale-110`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <h3 className={`font-semibold text-sm ${color}`}>{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
