import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Tutorials | CallTone Documentation",
  description:
    "Step-by-step tutorials for building sales agents, running campaigns, booking appointments, creating a virtual receptionist, and integrating with your CRM.",
};

export default function TutorialsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Tutorials
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Hands-on guides that walk you through common workflows from start to
            finish.
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

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-12">
            {/* Tutorial 1 — Cold-calling Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Tutorial 1: Setting Up a Sales Cold-Calling Agent
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A well-configured sales agent can qualify leads, handle
                objections, and book follow-up meetings without human
                intervention. This tutorial walks you through creating one from
                scratch.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 1 &mdash; Define the Goal
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Before you write a single word of your system prompt, decide
                what success looks like for each call. Common goals for cold
                calling include booking a demo, qualifying the prospect against
                a checklist (budget, authority, need, timeline), or simply
                confirming interest so a human rep can follow up.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 2 &mdash; Write the System Prompt
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Your system prompt is the single most important factor in agent
                performance. Include the following sections:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Identity</strong> — Who
                  the agent is, what company it represents, and why it is
                  calling.
                </li>
                <li>
                  <strong className="text-foreground">
                    Value proposition
                  </strong>{" "}
                  — A one-sentence benefit statement the agent can deliver early
                  in the conversation.
                </li>
                <li>
                  <strong className="text-foreground">
                    Qualifying questions
                  </strong>{" "}
                  — List three to five questions the agent should ask, in order.
                </li>
                <li>
                  <strong className="text-foreground">
                    Objection handling
                  </strong>{" "}
                  — Provide scripted responses for the most common pushbacks:
                  &quot;I&apos;m not interested,&quot; &quot;Send me an
                  email,&quot; &quot;I&apos;m busy right now,&quot; and &quot;How
                  much does it cost?&quot;
                </li>
                <li>
                  <strong className="text-foreground">Boundaries</strong> —
                  Instruct the agent on what it should never do (e.g., never
                  make up pricing, never guarantee specific results, always
                  offer to schedule a callback if the prospect is busy).
                </li>
              </ul>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 3 &mdash; Choose a Voice
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                For sales, choose a voice that sounds confident and
                approachable. Preview several options. ElevenLabs voices tend to
                have the most natural inflection. If speed is critical, Vapi
                built-in voices offer the lowest latency.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 4 &mdash; Craft the First Message
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                The first message is what the prospect hears immediately when
                they pick up. Keep it under 20 seconds. Introduce yourself,
                state the reason for the call, and ask a permission-based
                opener. Example: &quot;Hi, this is Alex from Acme. We help
                companies like yours cut scheduling overhead by 60 percent. Do
                you have a quick moment?&quot;
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 5 &mdash; Test and Iterate
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Use the Test Call feature to call yourself. Try different
                objections. Review the transcript and adjust your prompt until
                the agent handles each scenario smoothly.
              </p>
            </div>

            {/* Tutorial 2 — Outbound Campaign */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Tutorial 2: Running Your First Outbound Campaign
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Campaigns let you call hundreds or thousands of contacts
                automatically. The platform handles scheduling, retries, and
                compliance so you can focus on results.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 1 &mdash; Prepare Your Contact List
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Navigate to{" "}
                <strong className="text-foreground">Contacts</strong> and click{" "}
                <strong className="text-foreground">Import</strong>. Upload a
                CSV with columns for first name, last name, phone number
                (E.164 format), email (optional), and company (optional). The
                system will validate numbers and flag any duplicates or numbers
                on your Do-Not-Call list.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 2 &mdash; Create the Campaign
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Go to{" "}
                <strong className="text-foreground">Campaigns</strong> and
                click{" "}
                <strong className="text-foreground">New Campaign</strong>. Give
                it a name, select the agent that will handle the calls, choose
                the phone number to call from, and assign the contact list you
                just imported.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 3 &mdash; Configure the Schedule
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Set a start and end date, calling hours (e.g., 9 AM to 5 PM),
                and the timezone. CallTone will only place calls during the
                window you specify. You can also set a maximum number of calls
                per day and configure retry logic for unanswered calls (e.g.,
                retry up to two times with a four-hour gap between attempts).
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 4 &mdash; Launch
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Review the campaign summary and click{" "}
                <strong className="text-foreground">Start Campaign</strong>.
                Monitor progress in real time from the campaign dashboard. You
                will see calls queued, in progress, completed, and any that
                resulted in voicemail or no answer.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 5 &mdash; Review Results
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                After the campaign finishes, visit the Analytics page for a
                breakdown of call outcomes, average call duration, sentiment
                distribution, and conversion rate. You can export the results
                as a CSV for your CRM.
              </p>
            </div>

            {/* Tutorial 3 — Appointment Booking */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Tutorial 3: Automating Appointment Booking
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone agents can book appointments directly during a call
                and send confirmation emails automatically.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 1 &mdash; Enable Appointments on Your Agent
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Open your agent, scroll to{" "}
                <strong className="text-foreground">Capabilities</strong>, and
                toggle on{" "}
                <strong className="text-foreground">
                  Appointment Scheduling
                </strong>
                . This gives the agent the ability to check calendar
                availability, propose time slots, and confirm bookings during
                live calls.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 2 &mdash; Configure Your Calendar
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Go to{" "}
                <strong className="text-foreground">
                  Settings &rarr; Appointments
                </strong>
                . Set your available days and time slots. You can create
                different appointment types with different durations (e.g., a
                15-minute discovery call vs. a 30-minute demo). Buffer time
                between appointments can also be configured to prevent
                back-to-back bookings.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 3 &mdash; Set Up Confirmation Emails
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                CallTone automatically sends a confirmation email when an
                appointment is booked. Customize the email template from{" "}
                <strong className="text-foreground">
                  Settings &rarr; Email Branding
                </strong>
                . You can include your logo, brand colors, and a link to a
                self-service portal where the customer can confirm, reschedule,
                or cancel.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 4 &mdash; Enable Reminders
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Turn on multi-channel reminders to reduce no-shows. CallTone
                can send reminders via email, SMS, or even an automated voice
                call. Configure when reminders are sent (e.g., 24 hours before
                and 1 hour before the appointment).
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 5 &mdash; Update Your System Prompt
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Add instructions to your system prompt so the agent knows when
                and how to offer an appointment. For example: &quot;If the
                prospect is interested, offer to schedule a 15-minute demo.
                Check available slots and confirm the booking before ending the
                call.&quot;
              </p>
            </div>

            {/* Tutorial 4 — Virtual Receptionist */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Tutorial 4: Building a Virtual Receptionist
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A virtual receptionist answers inbound calls, routes callers to
                the right department, takes messages, and operates around the
                clock.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 1 &mdash; Create a Receptionist Agent
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Create a new agent and toggle on{" "}
                <strong className="text-foreground">Receptionist Mode</strong>{" "}
                under Capabilities. Write a system prompt that greets callers
                warmly, asks how it can help, and knows how to look up
                departments and staff members.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 2 &mdash; Set Up Departments
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Navigate to{" "}
                <strong className="text-foreground">
                  Dashboard &rarr; Receptionist
                </strong>{" "}
                and create your departments (e.g., Sales, Support, Billing).
                For each department, add staff members with their name, role,
                email, and direct phone number.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 3 &mdash; Configure Call Routing
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                When a caller asks to speak with someone, the receptionist
                agent uses Vapi&apos;s transferCall function to connect the
                caller to the right staff member&apos;s phone number. If the
                staff member is unavailable, the agent offers to take a message
                instead.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 4 &mdash; After-Hours Handling
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Configure business hours under{" "}
                <strong className="text-foreground">
                  Receptionist &rarr; Settings
                </strong>
                . During off-hours the agent automatically switches to message-taking
                mode, collects the caller&apos;s name, number, and reason for
                calling, and notifies the relevant staff member via email or
                SMS.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 5 &mdash; Review Messages
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                All messages taken by the receptionist appear on the
                Receptionist dashboard with caller details, timestamp, the
                department they were trying to reach, and the full message.
                Staff members can mark messages as read or follow up directly.
              </p>
            </div>

            {/* Tutorial 5 — CRM Integration */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Tutorial 5: Connecting to Your CRM via API
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Sync call data, contacts, and outcomes with your CRM
                automatically using the CallTone REST API and webhooks.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 1 &mdash; Generate an API Key
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Go to{" "}
                <strong className="text-foreground">
                  Settings &rarr; API Keys
                </strong>{" "}
                and click{" "}
                <strong className="text-foreground">Create Key</strong>. Give
                the key a descriptive label like &quot;CRM Integration.&quot;
                Copy the key immediately — it will only be shown once. The key
                is prefixed with{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  vxf_
                </code>{" "}
                and should be stored securely in your CRM&apos;s environment
                variables.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 2 &mdash; Set Up a Webhook
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Navigate to{" "}
                <strong className="text-foreground">
                  Settings &rarr; Webhooks
                </strong>{" "}
                and add your CRM&apos;s webhook endpoint URL. Select which
                events to subscribe to — most CRM integrations need{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  call.completed
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  appointment.booked
                </code>
                , and{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  contact.created
                </code>
                . CallTone will send a POST request to your endpoint every time
                a subscribed event occurs.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 3 &mdash; Verify Webhook Signatures
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Each webhook request includes a{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  X-CallTone-Signature
                </code>{" "}
                header containing an HMAC-SHA256 signature. Verify this
                signature in your receiving application to ensure the request
                genuinely came from CallTone and was not tampered with in
                transit. Your webhook signing secret is available on the
                Webhooks settings page.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 4 &mdash; Map Fields to Your CRM
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                When a{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
                  call.completed
                </code>{" "}
                event fires, the payload includes the contact ID, call
                duration, transcript, AI-generated summary, sentiment, and lead
                score. Use these fields to create or update a contact record,
                log the call as an activity, and update the lead status in your
                CRM.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Step 5 &mdash; Pull Data on Demand
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                In addition to webhooks you can poll the{" "}
                <Link
                  href="/docs/api-reference"
                  className="text-primary hover:underline"
                >
                  REST API
                </Link>{" "}
                to fetch agents, calls, campaigns, and contacts at any time.
                This is useful for building dashboards or running batch syncs
                on a schedule.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
