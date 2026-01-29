import Link from "next/link";
import { Bot, Phone, BarChart3, Zap, Shield, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">VoxForge AI</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link href="/features" className="text-sm text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            AI Voice Agents That Actually
            <span className="text-primary"> Work</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Deploy enterprise-grade AI voice agents for cold calling, customer support,
            and appointment scheduling. 24/7 availability, human-like conversations.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything You Need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Build, deploy, and manage AI voice agents without any coding.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Bot}
              title="Visual Agent Builder"
              description="Create AI agents in minutes with our intuitive drag-and-drop builder."
            />
            <FeatureCard
              icon={Phone}
              title="Outbound Campaigns"
              description="Launch automated calling campaigns with intelligent scheduling."
            />
            <FeatureCard
              icon={BarChart3}
              title="Conversation Intelligence"
              description="AI-powered analytics with sentiment analysis and lead scoring."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Deployment"
              description="Go live in minutes, not weeks. No infrastructure to manage."
            />
            <FeatureCard
              icon={Shield}
              title="TCPA Compliant"
              description="Built-in compliance tools for DNC, consent, and calling hours."
            />
            <FeatureCard
              icon={Users}
              title="Team Collaboration"
              description="Role-based access control and team management built-in."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join hundreds of businesses using VoxForge AI to automate their voice communications.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="mt-8">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-semibold">VoxForge AI</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 VoxForge AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
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
    <div className="rounded-lg border bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
