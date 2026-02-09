import Link from "next/link";
import {
  Bot,
  Phone,
  BarChart3,
  Zap,
  Shield,
  Users,
  ArrowRight,
  Mic,
  Globe,
  FileText,
  Clock,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Powerful Features for Modern Business
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Everything you need to deploy, manage, and scale AI voice agents.
          </p>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                AI Agents
              </span>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                Build Intelligent Voice Agents in Minutes
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Create sophisticated AI agents with natural language capabilities.
                No coding required - just describe what you want and deploy.
              </p>
              <ul className="mt-8 space-y-4">
                <FeatureListItem
                  icon={Bot}
                  title="Visual Agent Builder"
                  description="Intuitive interface to configure agent behavior and responses"
                />
                <FeatureListItem
                  icon={Mic}
                  title="Natural Voice Synthesis"
                  description="Choose from multiple voice providers including ElevenLabs and PlayHT"
                />
                <FeatureListItem
                  icon={FileText}
                  title="Knowledge Base Integration"
                  description="Upload documents and URLs to train your agents on your content"
                />
              </ul>
            </div>
            <div className="rounded-2xl bg-secondary p-8">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Bot className="h-24 w-24 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calling Features */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 rounded-2xl bg-card p-8 shadow-sm">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
                <Phone className="h-24 w-24 text-green-500/40" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                Voice Calling
              </span>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                Inbound & Outbound Calling at Scale
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Handle thousands of calls simultaneously with intelligent routing,
                scheduling, and automated follow-ups.
              </p>
              <ul className="mt-8 space-y-4">
                <FeatureListItem
                  icon={Globe}
                  title="Global Phone Numbers"
                  description="Get phone numbers in 30+ countries instantly"
                />
                <FeatureListItem
                  icon={Clock}
                  title="Smart Scheduling"
                  description="Automated campaigns with timezone-aware calling hours"
                />
                <FeatureListItem
                  icon={MessageSquare}
                  title="Real-time Transcription"
                  description="Every call is transcribed and analyzed in real-time"
                />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                Analytics & Intelligence
              </span>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                AI-Powered Conversation Intelligence
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Gain deep insights from every conversation with automated analysis,
                sentiment tracking, and actionable recommendations.
              </p>
              <ul className="mt-8 space-y-4">
                <FeatureListItem
                  icon={BarChart3}
                  title="Performance Dashboards"
                  description="Track call outcomes, conversion rates, and agent performance"
                />
                <FeatureListItem
                  icon={Zap}
                  title="Automated Lead Scoring"
                  description="AI scores leads based on conversation content and engagement"
                />
                <FeatureListItem
                  icon={FileText}
                  title="Smart Summaries"
                  description="Auto-generated summaries and action items from every call"
                />
              </ul>
            </div>
            <div className="rounded-2xl bg-secondary p-8">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                <BarChart3 className="h-24 w-24 text-blue-500/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Security */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">
              Compliance & Security
            </span>
            <h2 className="mt-2 text-3xl font-bold text-foreground">
              Enterprise-Grade Security & Compliance
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Built-in compliance tools to keep your business protected.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={Shield}
              title="TCPA Compliance"
              description="Automated DNC list checking, consent management, and calling hour restrictions."
            />
            <FeatureCard
              icon={Users}
              title="Role-Based Access"
              description="Granular permissions for team members with audit logging."
            />
            <FeatureCard
              icon={Settings}
              title="Data Security"
              description="SOC 2 compliant infrastructure with encryption at rest and in transit."
            />
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">
            Integrations
          </span>
          <h2 className="mt-2 text-3xl font-bold text-foreground">
            Connect Your Favorite Tools
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Seamlessly integrate with your existing CRM, calendar, and business tools.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            {["Salesforce", "HubSpot", "Zapier", "Google Calendar", "Slack", "Webhooks"].map((tool) => (
              <div
                key={tool}
                className="rounded-lg border bg-card px-6 py-4 text-sm font-medium text-muted-foreground shadow-sm"
              >
                {tool}
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            And many more through our API and webhook integrations.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Transform Your Voice Communications?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="mt-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function FeatureListItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
