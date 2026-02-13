import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting Started | CallTone Documentation",
  description:
    "Set up your CallTone account, create your first AI voice agent, provision a phone number, and make your first test call.",
};

export default function GettingStartedPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Getting Started
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Go from zero to your first AI-powered phone call in under ten
            minutes.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <Link
            href="/docs"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Documentation
          </Link>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8">
            {/* 1 — Account Creation */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                1. Creating Your Account
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Visit{" "}
                <strong className="text-foreground">calltone.ai/sign-up</strong>{" "}
                and create an account using your email address, Google, or
                Microsoft login. Once authenticated you will be prompted to
                create an{" "}
                <strong className="text-foreground">organization</strong> — this
                is the workspace that holds your agents, phone numbers,
                contacts, and billing information.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                During organization setup you will provide a company name, your
                industry, and your primary use case (sales, support, or
                receptionist). These details help CallTone pre-configure
                sensible defaults such as calling-hour restrictions and
                compliance settings for your region.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After creating your organization you will land on the guided
                setup wizard. The wizard walks you through six quick steps:
                profile, first agent, phone number, test call, campaign basics,
                and billing. You can skip any step and return to it later from
                the Setup Guide banner on the dashboard.
              </p>
            </div>

            {/* 2 — Dashboard Overview */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                2. Dashboard Overview
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The CallTone dashboard is your command center. When you sign in
                you will see:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Quick stats</strong> —
                  total calls today, active campaigns, upcoming appointments,
                  and minutes used this billing cycle.
                </li>
                <li>
                  <strong className="text-foreground">Recent calls</strong> — a
                  live feed of the most recent inbound and outbound calls with
                  status, duration, and sentiment indicators.
                </li>
                <li>
                  <strong className="text-foreground">Setup Guide</strong> — a
                  dismissable banner that tracks your onboarding progress and
                  links to any incomplete setup steps.
                </li>
                <li>
                  <strong className="text-foreground">Sidebar navigation</strong>{" "}
                  — quick access to Agents, Campaigns, Calls, Contacts,
                  Appointments, Analytics, Compliance, Settings, and more.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The sidebar also includes access to the Live Call Monitor where
                you can observe active calls in real time, and the Intelligence
                page for AI-driven conversation insights.
              </p>
            </div>

            {/* 3 — Creating Your First Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                3. Creating Your First Voice Agent
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Navigate to{" "}
                <strong className="text-foreground">Agents</strong> in the
                sidebar and click{" "}
                <strong className="text-foreground">Create Agent</strong>. You
                will configure the following:
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Name
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Give your agent a descriptive name, for example &quot;Sales
                Outreach - Q1&quot; or &quot;Front Desk Receptionist.&quot; The
                name is internal and is not spoken to callers.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                System Prompt
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                The system prompt defines your agent&apos;s personality,
                knowledge, and behavior. Write it in plain English. Tell the
                agent who it is, what company it represents, what its goal is
                on the call, and how it should handle objections. The more
                specific you are, the better the agent will perform.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Voice Selection
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Choose a voice from one of our supported providers — Vapi
                built-in voices, ElevenLabs, or PlayHT. You can preview each
                voice before selecting. Consider your audience: a warm,
                conversational voice works well for appointment reminders while
                a confident, energetic voice may be better for sales outreach.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Model Selection
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Select the AI language model that powers your agent&apos;s
                responses. GPT-4o is recommended for most use cases — it offers
                the best balance of intelligence and speed. GPT-4o Mini is a
                great choice when you need faster response times at a lower cost.
                GPT-3.5 Turbo is the most economical option for simple,
                scripted conversations.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                First Message
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                This is what your agent says when it answers or initiates a
                call. For outbound calls a strong opening is critical. Example:
                &quot;Hi, this is Sarah from Acme Solutions. I&apos;m calling
                because we help businesses like yours reduce scheduling
                overhead by 60 percent. Do you have a quick moment?&quot;
              </p>
            </div>

            {/* 4 — Getting a Phone Number */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                4. Getting a Phone Number
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Your agent needs a phone number to make and receive calls. Go
                to{" "}
                <strong className="text-foreground">
                  Settings &rarr; Phone Numbers
                </strong>{" "}
                and choose one of two options:
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Option A: Choose from Pool
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                CallTone maintains a pool of pre-provisioned local and
                toll-free numbers via our Twilio Messaging Service. Browse
                available numbers by area code, select one, and it will be
                assigned to your organization instantly. These numbers support
                both voice and SMS out of the box.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Option B: Import Your Own Twilio Number
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                If you already have phone numbers on Twilio, you can import
                them by providing your Twilio Account SID and Auth Token.
                CallTone will configure the necessary webhooks on your Twilio
                number so that calls are routed through the platform. This
                option is ideal if you want to keep an existing business number
                that your customers already recognize.
              </p>
            </div>

            {/* 5 — Making a Test Call */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                5. Making a Test Call
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Before launching any campaign, test your agent with a live
                call. From the agent detail page, click{" "}
                <strong className="text-foreground">Test Call</strong>. Enter
                your own phone number and CallTone will initiate an outbound
                call from your provisioned number to you. Interact with the
                agent as a real prospect would.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After the call ends, review the call recording, transcript,
                and AI-generated summary in the{" "}
                <strong className="text-foreground">Calls</strong> section.
                This is a great time to refine your system prompt, adjust the
                first message, or try a different voice.
              </p>
            </div>

            {/* 6 — Next Steps */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                6. Next Steps
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Once you are happy with your agent, explore these features to
                get the most out of CallTone:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Campaigns</strong> —
                  Upload a contact list and launch an automated outbound calling
                  campaign. Configure calling windows, retry logic, and daily
                  limits.
                </li>
                <li>
                  <strong className="text-foreground">Appointments</strong> —
                  Enable the appointment scheduling capability on your agent so
                  it can book meetings directly into your calendar during calls.
                </li>
                <li>
                  <strong className="text-foreground">Analytics</strong> —
                  Monitor call volume, average duration, sentiment trends, and
                  conversion rates from the Analytics dashboard.
                </li>
                <li>
                  <strong className="text-foreground">Compliance</strong> —
                  Upload your Do-Not-Call list, enable consent tracking, and
                  configure calling-hour restrictions to stay TCPA-compliant.
                </li>
                <li>
                  <strong className="text-foreground">REST API</strong> —
                  Integrate CallTone into your existing CRM, helpdesk, or
                  marketing automation tools via our{" "}
                  <Link href="/docs/api-reference" className="text-primary hover:underline">
                    REST API
                  </Link>
                  .
                </li>
                <li>
                  <strong className="text-foreground">Team Management</strong>{" "}
                  — Invite colleagues to your organization and assign roles so
                  your whole team can collaborate on agents and campaigns.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
