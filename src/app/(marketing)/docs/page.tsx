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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | CallTone",
  description:
    "Learn how to create AI voice agents, manage campaigns, book appointments, and integrate CallTone into your workflow.",
};

const QUICK_START = [
  {
    title: "Getting Started",
    description:
      "Set up your account, create your first agent, and make a test call in minutes.",
    icon: BookOpen,
    href: "/docs",
  },
  {
    title: "API Reference",
    description:
      "Comprehensive REST API docs for building custom integrations and automations.",
    icon: Code,
    href: "/docs",
  },
  {
    title: "Tutorials",
    description:
      "Step-by-step guides for common use cases like appointment booking and lead qualification.",
    icon: GraduationCap,
    href: "/docs",
  },
];

const TOPICS = [
  {
    title: "Creating Agents",
    description: "Build and configure AI voice agents with custom personalities, prompts, and behaviors.",
    icon: Bot,
    href: "/docs",
  },
  {
    title: "Campaigns",
    description: "Launch automated calling campaigns with intelligent scheduling and contact management.",
    icon: Megaphone,
    href: "/docs",
  },
  {
    title: "Phone Numbers",
    description: "Provision local, toll-free, and international numbers or import your existing Twilio numbers.",
    icon: Phone,
    href: "/docs",
  },
  {
    title: "Appointments",
    description: "Let your AI agent book appointments directly into calendars with confirmation emails.",
    icon: Calendar,
    href: "/docs",
  },
  {
    title: "Analytics",
    description: "Track call outcomes, sentiment, lead scores, and agent performance in real time.",
    icon: BarChart3,
    href: "/docs",
  },
  {
    title: "Team Management",
    description: "Invite team members, assign roles, and manage permissions across your organization.",
    icon: Users,
    href: "/docs",
  },
  {
    title: "Compliance",
    description: "DNC list management, consent tracking, calling hour restrictions, and TCPA tools.",
    icon: Shield,
    href: "/docs",
  },
  {
    title: "Webhooks & Integrations",
    description: "Connect CallTone to your CRM, Slack, Zapier, and custom systems via webhooks and API.",
    icon: Webhook,
    href: "/docs",
  },
];

export default function DocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Documentation
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Everything you need to build, deploy, and scale AI voice agents with
            CallTone.
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground">Quick Start</h2>
          <p className="mt-2 text-muted-foreground">
            Jump right in with these guides.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {QUICK_START.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-secondary to-secondary/50" />
        <div className="relative container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground">Topics</h2>
          <p className="mt-2 text-muted-foreground">
            Explore by area of functionality.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <Link
                  key={topic.title}
                  href={topic.href}
                  className="group rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-300">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground">
            For Developers
          </h2>
          <p className="mt-2 text-muted-foreground">
            Build custom integrations with the CallTone API.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Link
              href="/docs"
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Code className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    REST API Documentation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Agents, calls, campaigns, contacts, and more
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/docs"
              className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Webhook className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Webhook Reference
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Event payloads, signature verification, and retry logic
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
