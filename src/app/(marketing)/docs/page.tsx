import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Code,
  GraduationCap,
  Bot,
  Megaphone,
  Phone,
  Calendar,
  BarChart3,
  Users,
  Shield,
  Webhook,
  ArrowRight,
  Terminal,
  Layers,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | CallTone",
  description:
    "Learn how to create voice agents, manage campaigns, book appointments, and integrate CallTone into your workflow.",
};

const QUICK_START = [
  {
    icon: BookOpen,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.15)",
    title: "Getting Started",
    description: "Set up your account, create your first voice agent, and make a test call in under 30 minutes.",
    href: "/docs/getting-started",
    tag: "Start here",
  },
  {
    icon: Code,
    color: "#10b981",
    glow: "rgba(16,185,129,0.12)",
    title: "API Reference",
    description: "Full REST API documentation for agents, campaigns, calls, contacts, appointments, and more.",
    href: "/docs/api-reference",
    tag: "Developers",
  },
  {
    icon: GraduationCap,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.12)",
    title: "Tutorials",
    description: "Step-by-step walkthroughs for appointment booking, lead qualification, and outbound campaigns.",
    href: "/docs/tutorials",
    tag: "Guides",
  },
];

const TOPICS = [
  { icon: Bot,       color: "#6366f1", title: "Creating Agents",        desc: "Build agents with custom prompts, voice, and knowledge base",  href: "/docs/agents" },
  { icon: Megaphone, color: "#10b981", title: "Campaigns",              desc: "Launch outbound campaigns with smart scheduling",              href: "/docs/campaigns" },
  { icon: Phone,     color: "#8b5cf6", title: "Phone Numbers",          desc: "Provision or import numbers for voice and SMS",               href: "/docs/phone-numbers" },
  { icon: Calendar,  color: "#f59e0b", title: "Appointments",           desc: "Book meetings into calendars with confirmation emails",        href: "/docs/appointments" },
  { icon: BarChart3, color: "#06b6d4", title: "Analytics",              desc: "Call outcomes, sentiment, lead scores, and agent performance", href: "/docs/analytics" },
  { icon: Users,     color: "#f97316", title: "Team Management",        desc: "Invite members, assign roles, and manage permissions",         href: "/docs/team" },
  { icon: Shield,    color: "#ef4444", title: "Compliance",             desc: "DNC lists, consent tracking, TCPA tools, and audit logs",     href: "/docs/compliance" },
  { icon: Webhook,   color: "#14b8a6", title: "Webhooks & Integrations",desc: "CRM sync, Slack, Zapier, and custom webhook events",           href: "/docs/webhooks" },
];

export default function DocsPage() {
  return (
    <div style={{ background: "#08080f", minHeight: "100vh", color: "#c8c8d8" }}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ paddingTop: "6rem", paddingBottom: "5rem" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full blur-3xl"
            style={{ width: 700, height: 360, background: "rgba(99,102,241,0.1)" }} />
          <div className="absolute bottom-0 right-1/4 rounded-full blur-3xl"
            style={{ width: 300, height: 200, background: "rgba(16,185,129,0.06)" }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}>
            Documentation
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #d0d0f0 50%, #9090d0 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              lineHeight: 1.15,
            }}>
            Build, Deploy, and Scale<br />with Confidence
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed" style={{ color: "rgba(200,200,216,0.6)" }}>
            Everything you need to get the most out of CallTone — from your first agent to enterprise-scale campaigns.
          </p>
        </div>
      </div>

      {/* ── Quick Start ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white">Quick Start</h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(200,200,216,0.45)" }}>
            Jump right in with these three guides
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {QUICK_START.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href}
                className="group relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 2px 20px rgba(0,0,0,0.35)",
                }}>
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(350px circle at 50% 0%, ${item.glow}, transparent)` }} />
                <div className="relative flex flex-col flex-1">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}18`, boxShadow: `0 0 16px ${item.glow}` }}>
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: `${item.color}15`, color: item.color }}>
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-white/90 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.5)" }}>
                    {item.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-2"
                    style={{ color: item.color }}>
                    Read guide
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Topics ───────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white">Topics</h2>
            <p className="mt-1 text-sm" style={{ color: "rgba(200,200,216,0.45)" }}>
              Explore by area of functionality
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <Link key={topic.title} href={topic.href}
                  className="group flex flex-col gap-3 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: `${topic.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: topic.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                      {topic.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "rgba(200,200,216,0.45)" }}>
                      {topic.desc}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 self-start opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: topic.color }} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── For Developers ───────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white">For Developers</h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(200,200,216,0.45)" }}>
            Build custom integrations with the CallTone API
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              icon: Terminal,
              color: "#6366f1",
              title: "REST API Documentation",
              desc: "Agents, calls, campaigns, contacts, appointments, and analytics — all programmatically accessible.",
              href: "/docs/api-reference",
            },
            {
              icon: Webhook,
              color: "#8b5cf6",
              title: "Webhook Reference",
              desc: "Event payloads for call.started, call.ended, appointment.booked, and more — with HMAC signature verification.",
              href: "/docs/webhooks",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href}
                className="group flex items-start gap-4 rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${item.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(200,200,216,0.5)" }}>
                    {item.desc}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                  style={{ color: item.color }} />
              </Link>
            );
          })}
        </div>

        {/* Code snippet teaser */}
        <div className="mt-6 rounded-xl p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4" style={{ color: "#6366f1" }} />
            <span className="text-xs font-semibold text-white/70">Quick example — list your agents</span>
          </div>
          <pre className="overflow-x-auto text-xs leading-relaxed" style={{ color: "#a8b8d8", fontFamily: "monospace" }}>{`curl https://api.calltone.ai/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre>
          <Link href="/docs/api-reference"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-indigo-300"
            style={{ color: "#818cf8" }}>
            View full API reference
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Support CTA ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-10"
          style={{
            background: "linear-gradient(135deg, #0d0d22 0%, #12102e 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 0 50px rgba(99,102,241,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          <div className="pointer-events-none absolute right-0 top-0 rounded-full blur-3xl"
            style={{ width: 300, height: 200, background: "rgba(99,102,241,0.12)" }} />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Can&apos;t find what you&apos;re looking for?</h2>
              <p className="mt-1.5 text-sm" style={{ color: "rgba(200,200,216,0.55)" }}>
                Our support team typically responds within a few hours on business days.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/contact"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,200,216,0.8)" }}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
