import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Phone,
  BarChart3,
  Shield,
  Zap,
  Brain,
  Calendar,
  MessageSquare,
  Eye,
  Target,
  Webhook,
  Users,
  Clock,
  Globe,
  ArrowRight,
  CheckCircle2,
  Mic,
  FileText,
  TrendingUp,
  PhoneIncoming,
  PhoneMissed,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features | CallTone",
  description:
    "Powerful voice agent features — agent builder, inbound & outbound calling, conversation intelligence, compliance, and enterprise-grade integrations.",
};

const CORE_FEATURES = [
  {
    icon: Bot,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.15)",
    label: "Voice Agent Builder",
    title: "Build Intelligent Agents in Minutes",
    description:
      "Create production-ready voice agents without writing a single line of code. Configure personality, voice, knowledge base, and conversation flow through an intuitive interface.",
    bullets: [
      "Custom system prompts and conversation scripts",
      "Multiple voice providers: ElevenLabs, PlayHT, Deepgram",
      "Upload PDFs, URLs, and Q&A pairs as knowledge base",
      "Test calls directly from the dashboard",
    ],
  },
  {
    icon: Phone,
    color: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    label: "Inbound & Outbound Calling",
    title: "Handle Every Call, at Any Scale",
    description:
      "Launch outbound campaigns to hundreds of contacts per day and receive inbound calls 24/7 with no missed calls — all with consistent, professional quality.",
    bullets: [
      "Automated outbound campaigns with smart scheduling",
      "Timezone-aware calling hours (TCPA compliant)",
      "Real-time transcription and call summaries",
      "Concurrent inbound call handling",
    ],
  },
  {
    icon: Brain,
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
    label: "Conversation Intelligence",
    title: "Deep Insights from Every Call",
    description:
      "Every conversation is analyzed automatically — sentiment, objections, buying signals, and competitor mentions — giving you actionable data to sharpen your strategy.",
    bullets: [
      "Turn-by-turn sentiment scoring and trend analysis",
      "Automatic objection and buying-signal detection",
      "Competitor mention tracking across all calls",
      "AI-generated coaching recommendations per agent",
    ],
  },
  {
    icon: Target,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    label: "Smart Lead Scoring",
    title: "Prioritize Your Best Opportunities",
    description:
      "AI-driven lead scoring ranks every prospect 0–100 based on conversation data, engagement level, and intent signals. Know exactly who to call next.",
    bullets: [
      "Hot / Warm / Cool / Cold automatic tier classification",
      "Next-best-action recommendations per lead",
      "Scoring history and trend tracking",
      "CRM sync to push scored leads downstream",
    ],
  },
  {
    icon: Shield,
    color: "#ef4444",
    glow: "rgba(239,68,68,0.15)",
    label: "Compliance & Security",
    title: "Enterprise-Grade Protection Built In",
    description:
      "TCPA compliance tools, DNC list management, consent tracking, and audit logging are built directly into the platform — not bolted on as an afterthought.",
    bullets: [
      "National DNC registry + internal DNC list management",
      "Consent tracking with timestamp and source logging",
      "Automated calling hour restrictions by recipient timezone",
      "Full audit log for every action across your organization",
    ],
  },
  {
    icon: Zap,
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.15)",
    label: "Integrations & API",
    title: "Connect Your Entire Stack",
    description:
      "Nine native integrations plus a full REST API and webhook system with HMAC signing let you connect CallTone to any CRM, calendar, or workflow tool.",
    bullets: [
      "HubSpot, Salesforce, GHL, Google Calendar, Slack, Zapier",
      "Google Sheets for contact sync and reporting",
      "REST API with API key management and IP allowlisting",
      "Outbound webhooks with HMAC signature verification",
    ],
  },
];

const ADDITIONAL = [
  { icon: PhoneIncoming, label: "AI Receptionist", color: "#6366f1", desc: "24/7 inbound answering with department routing and message-taking" },
  { icon: PhoneMissed, label: "Missed Call Text-Back", color: "#10b981", desc: "Auto-SMS and callback scheduling for every missed inbound call" },
  { icon: Calendar, label: "Appointment Scheduling", color: "#8b5cf6", desc: "Calendar integration, reminders, and a self-service booking portal" },
  { icon: MessageSquare, label: "Two-Way SMS", color: "#f59e0b", desc: "Send and receive SMS messages with full conversation history" },
  { icon: Eye, label: "Real-time Monitoring", color: "#ef4444", desc: "Listen live, whisper coaching, or barge into active calls as a supervisor" },
  { icon: BarChart3, label: "Advanced Analytics", color: "#06b6d4", desc: "Dashboards for call volume, conversion rate, sentiment trends, and ROI" },
  { icon: TrendingUp, label: "Campaign ROI Tracking", color: "#f97316", desc: "Per-campaign revenue attribution, cost-per-lead, and booking-rate metrics" },
  { icon: Users, label: "Team Management", color: "#14b8a6", desc: "Role-based access control with member invitations and permission scopes" },
];

const INTEGRATIONS = [
  "HubSpot", "Salesforce", "GoHighLevel", "Google Calendar",
  "Google Sheets", "Slack", "Zapier", "Make", "MCP Protocol",
];

export default function FeaturesPage() {
  return (
    <div style={{ background: "#08080f", minHeight: "100vh", color: "#c8c8d8" }}>
      <style>{`
        @keyframes featureFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .feat-reveal { animation: featureFadeUp 0.6s ease both; }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full blur-3xl"
            style={{ width: 800, height: 400, background: "rgba(99,102,241,0.1)" }} />
          <div className="absolute bottom-0 left-0 rounded-full blur-3xl"
            style={{ width: 400, height: 300, background: "rgba(139,92,246,0.06)" }} />
          <div className="absolute bottom-0 right-0 rounded-full blur-3xl"
            style={{ width: 400, height: 300, background: "rgba(16,185,129,0.06)" }} />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center feat-reveal">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}>
            Platform Features
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #d0d0f0 50%, #9090d0 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              lineHeight: 1.1,
            }}>
            Every Feature You Need<br />to Scale Voice
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "rgba(200,200,216,0.65)" }}>
            From building your first AI voice agent to running enterprise-scale outbound campaigns —
            everything is included, nothing is hidden behind add-ons.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,200,216,0.8)" }}>
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* ── Core Features Grid ────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-white">Core Platform</h2>
          <p className="mt-2 text-sm" style={{ color: "rgba(200,200,216,0.5)" }}>
            Six pillars that power every voice operation
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {CORE_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.label}
                className="group relative rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 2px 20px rgba(0,0,0,0.35)",
                }}>
                {/* top glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(400px circle at 50% -40%, ${feat.glow}, transparent)` }} />
                <div className="relative">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: `${feat.color}18`, boxShadow: `0 0 20px ${feat.glow}` }}>
                      <Icon className="h-5 w-5" style={{ color: feat.color }} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: feat.color }}>
                      {feat.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>
                    {feat.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {feat.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(200,200,216,0.7)" }}>
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: feat.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Additional Capabilities ───────────────────────────── */}
      <div style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-white">More Capabilities</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(200,200,216,0.5)" }}>
              Additional tools included in every plan
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADDITIONAL.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}
                  className="group rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: `${item.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(200,200,216,0.5)" }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Integrations ─────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>
          Integrations
        </div>
        <h2 className="text-2xl font-bold text-white">Connect Your Existing Tools</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>
          Native connections to your CRM, calendar, automation platform, and more.
          Plus REST API and webhooks for anything custom.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {INTEGRATIONS.map((name) => (
            <div key={name}
              className="rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(200,200,216,0.75)",
              }}>
              {name}
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs" style={{ color: "rgba(200,200,216,0.35)" }}>
          And more through our open API and webhook system
        </p>
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl p-10 text-center"
          style={{
            background: "linear-gradient(135deg, #0d0d22 0%, #12102e 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ width: 400, height: 200, background: "rgba(99,102,241,0.18)" }} />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Transform Your Business Communications?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>
              Set up your first AI voice agent in under 30 minutes. No credit card required.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,200,216,0.8)" }}>
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
