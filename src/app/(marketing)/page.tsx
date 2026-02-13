"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Phone,
  BarChart3,
  Zap,
  Users,
  Calendar,
  Clock,
  BookOpen,
  Brain,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioWave } from "@/components/marketing/audio-wave";
import { TalkToAgent } from "@/components/marketing/talk-to-agent";

const HEADLINES = [
  "Your receptionist never takes a day off",
  "Turn every missed call into a booked appointment",
  "Handle 100 calls simultaneously while you focus on growth",
  "Let CallTone handle the phones. You handle the business.",
];

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

function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % HEADLINES.length);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`block transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2"
      }`}
    >
      {HEADLINES[index]}
    </span>
  );
}

export default function HomePage() {
  const revealRef = useScrollReveal();

  return (
    <div ref={revealRef}>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        {/* Audio wave visualization */}
        <AudioWave />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-float" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="reveal is-visible mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl min-h-[1.2em]">
            <RotatingHeadline />
          </h1>
          <p className="reveal is-visible reveal-delay-1 mx-auto mt-6 max-w-2xl text-base sm:text-lg text-foreground/70 leading-relaxed px-2">
            CallTone is a voice agent that answers your calls, books
            appointments, and handles customer inquiries — 24/7, with
            natural conversation.
          </p>
          <div className="reveal is-visible reveal-delay-2 mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/docs">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 border-border/50 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Read Docs
              </Button>
            </Link>
          </div>
          <div className="reveal is-visible reveal-delay-3 mt-10">
            <TalkToAgent />
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="reveal grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50">
            {[
              { stat: "1M+", label: "Calls Handled" },
              { stat: "50K+", label: "Appointments Booked" },
              { stat: "24/7", label: "Availability" },
              { stat: "95%", label: "Satisfaction" },
            ].map((item) => (
              <div key={item.label} className="py-8 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {item.stat}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
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
              Go live in three simple steps.
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            <StepCard
              step={1}
              title="Describe Your Agent"
              description="Tell us about your business and how you want your agent to sound."
              delay={1}
            />
            <StepCard
              step={2}
              title="Connect Your Number"
              description="Assign a phone number and your agent is live."
              delay={2}
            />
            <StepCard
              step={3}
              title="Watch Results Flow"
              description="See appointments booked and insights generated in real-time."
              delay={3}
            />
          </div>
        </div>
      </section>

      {/* Value-Driven Features */}
      <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-secondary to-secondary/50" />
        <AudioWave className="opacity-20" />
        <div className="relative container mx-auto px-4">
          <div className="text-center">
            <h2 className="reveal text-3xl font-bold text-foreground sm:text-4xl">
              Built for Results
            </h2>
            <p className="reveal reveal-delay-1 mx-auto mt-4 max-w-2xl text-foreground/60">
              Every feature is designed to save you time and grow your business.
            </p>
          </div>
          <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Phone}
              title="Never Miss a Call Again"
              description="Your agent answers every call instantly, 24/7, even on holidays and weekends."
              delay={1}
            />
            <FeatureCard
              icon={Calendar}
              title="Appointments on Autopilot"
              description="Automatically books appointments into your calendar and sends confirmation emails."
              delay={2}
            />
            <FeatureCard
              icon={Clock}
              title="Save 40+ Hours Per Week"
              description="Automate repetitive phone tasks so your team can focus on high-value work."
              delay={3}
            />
            <FeatureCard
              icon={Brain}
              title="Intelligence From Every Call"
              description="Get instant summaries, sentiment analysis, and lead scores after every conversation."
              delay={4}
            />
            <FeatureCard
              icon={Mic}
              title="Sounds Like Your Best Employee"
              description="Natural-sounding voices with custom personalities tailored to your brand."
              delay={5}
            />
            <FeatureCard
              icon={Users}
              title="Scale Without Hiring"
              description="Handle 100 simultaneous calls with a single agent. No new hires needed."
              delay={1}
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden py-16 sm:py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/10" />
        <AudioWave className="opacity-25" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="reveal text-3xl font-bold text-foreground sm:text-4xl">
            Hear the Difference Yourself
          </h2>
          <p className="reveal reveal-delay-1 mx-auto mt-4 max-w-xl text-foreground/60 px-2">
            Talk to our voice agent right now. No signup needed.
          </p>
          <div className="reveal reveal-delay-2 mt-10">
            <TalkToAgent />
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
    <div
      className={`reveal reveal-delay-${delay} group relative rounded-xl border border-border/50 bg-card p-6 sm:p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-white shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-shadow duration-300">
        {step}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-foreground/60 text-sm sm:text-base">
        {description}
      </p>
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
    <div
      className={`reveal reveal-delay-${delay} group rounded-xl border border-border/50 bg-card p-6 sm:p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-foreground/60 text-sm sm:text-base">
        {description}
      </p>
    </div>
  );
}
