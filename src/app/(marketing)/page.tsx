import Link from "next/link";
import { Bot, Phone, BarChart3, Zap, Shield, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            AI Voice Agents That Actually
            <span className="text-primary"> Work</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
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
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="border-y bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 text-center md:grid-cols-3">
            <div>
              <div className="text-4xl font-bold text-foreground">500+</div>
              <p className="mt-1 text-sm text-muted-foreground">Businesses Served</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">1M+</div>
              <p className="mt-1 text-sm text-muted-foreground">Calls Made</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">98%</div>
              <p className="mt-1 text-sm text-muted-foreground">Uptime Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Get up and running in three simple steps.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <StepCard
              step={1}
              title="Create Your Agent"
              description="Use our visual builder to configure your AI agent's voice, personality, and conversation flow in minutes."
            />
            <StepCard
              step={2}
              title="Configure Campaign"
              description="Upload your contact list, set calling hours, and define your campaign goals and compliance rules."
            />
            <StepCard
              step={3}
              title="Start Calling"
              description="Launch your campaign and watch as your AI agent makes calls, schedules appointments, and qualifies leads automatically."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">
            Everything You Need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
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

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">
            Trusted by Growing Teams
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            See what business leaders are saying about CallTone AI.
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <TestimonialCard
              quote="CallTone AI tripled our outbound call volume while maintaining a personal touch. Our pipeline has never been healthier."
              name="Sarah Chen"
              role="VP of Sales, TechCorp"
            />
            <TestimonialCard
              quote="The AI receptionist handles 80% of our inbound calls now. Our team can focus on high-value conversations instead."
              name="Marcus Johnson"
              role="Operations Director, MedSchedule"
            />
            <TestimonialCard
              quote="Setup was incredibly fast. We went from signing up to making our first campaign calls in under an hour."
              name="Emily Rodriguez"
              role="Founder, GrowthDialer"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join hundreds of businesses using CallTone AI to automate their voice communications.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="mt-8">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-lg border bg-card p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
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
    <div className="rounded-lg border bg-card p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="mt-4 text-muted-foreground">&ldquo;{quote}&rdquo;</p>
      <div className="mt-4 border-t pt-4">
        <p className="font-semibold text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
