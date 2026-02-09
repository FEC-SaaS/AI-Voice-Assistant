"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Bot, Phone, BarChart3, Zap, Shield, Users, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hook to observe elements and add .is-visible when they enter viewport
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const children = el.querySelectorAll(".reveal");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function HomePage() {
  const revealRef = useScrollReveal();

  return (
    <div ref={revealRef}>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 text-center">
          <div className="reveal is-visible mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Voice Agents</span>
          </div>
          <h1 className="reveal is-visible mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            AI Voice Agents That Actually
            <span className="gradient-text"> Work</span>
          </h1>
          <p className="reveal is-visible reveal-delay-1 mx-auto mt-6 max-w-2xl text-base sm:text-lg text-foreground/70 leading-relaxed px-2">
            Deploy enterprise-grade AI voice agents for cold calling, customer support,
            and appointment scheduling. 24/7 availability, human-like conversations.
          </p>
          <div className="reveal is-visible reveal-delay-2 mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 border-border/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="reveal is-visible reveal-delay-3 mt-4 text-sm text-muted-foreground">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="reveal text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="reveal reveal-delay-1 mx-auto mt-4 max-w-2xl text-foreground/60">
              Get up and running in three simple steps.
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            <StepCard step={1} title="Create Your Agent" description="Use our visual builder to configure your AI agent's voice, personality, and conversation flow in minutes." delay={1} />
            <StepCard step={2} title="Configure Campaign" description="Upload your contact list, set calling hours, and define your campaign goals and compliance rules." delay={2} />
            <StepCard step={3} title="Start Calling" description="Launch your campaign and watch as your AI agent makes calls, schedules appointments, and qualifies leads automatically." delay={3} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-16 sm:py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-secondary to-secondary/50" />
        <div className="relative container mx-auto px-4">
          <div className="text-center">
            <h2 className="reveal text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need
            </h2>
            <p className="reveal reveal-delay-1 mx-auto mt-4 max-w-2xl text-foreground/60">
              Build, deploy, and manage AI voice agents without any coding.
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Bot} title="Visual Agent Builder" description="Create AI agents in minutes with our intuitive drag-and-drop builder." delay={1} />
            <FeatureCard icon={Phone} title="Outbound Campaigns" description="Launch automated calling campaigns with intelligent scheduling." delay={2} />
            <FeatureCard icon={BarChart3} title="Conversation Intelligence" description="AI-powered analytics with sentiment analysis and lead scoring." delay={3} />
            <FeatureCard icon={Zap} title="Instant Deployment" description="Go live in minutes, not weeks. No infrastructure to manage." delay={4} />
            <FeatureCard icon={Shield} title="TCPA Compliant" description="Built-in compliance tools for DNC, consent, and calling hours." delay={5} />
            <FeatureCard icon={Users} title="Team Collaboration" description="Role-based access control and team management built-in." delay={1} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 sm:py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="reveal text-3xl font-bold text-foreground sm:text-4xl">Ready to Get Started?</h2>
          <p className="reveal reveal-delay-1 mx-auto mt-4 max-w-xl text-foreground/60 px-2">
            Start automating your voice communications with AI-powered agents today.
          </p>
          <div className="reveal reveal-delay-2">
            <Link href="/sign-up">
              <Button size="lg" className="mt-8 px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 animate-glow-pulse">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  delay,
}: {
  step: number;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div className={`reveal reveal-delay-${delay} group relative rounded-xl border border-border/50 bg-card p-6 sm:p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-white shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-shadow duration-300">
        {step}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-foreground/60 text-sm sm:text-base">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div className={`reveal reveal-delay-${delay} group rounded-xl border border-border/50 bg-card p-6 sm:p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-foreground/60 text-sm sm:text-base">{description}</p>
    </div>
  );
}
