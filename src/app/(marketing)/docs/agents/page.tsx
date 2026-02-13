import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Voice Agents | CallTone Documentation",
  description:
    "Learn how to create, configure, and optimize AI voice agents on the CallTone platform — system prompts, voice selection, model options, knowledge base, and more.",
};

export default function AgentsDocPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Voice Agents
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Everything you need to know about creating, configuring, and
            managing AI voice agents.
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
            {/* What is a Voice Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                What Is a Voice Agent?
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A voice agent is an AI-powered virtual caller that can make and
                receive phone calls on behalf of your business. Under the hood,
                each agent is backed by a large language model (LLM) for
                conversation, a text-to-speech engine for speaking, and
                real-time speech-to-text for listening. You control the
                agent&apos;s behavior entirely through its configuration — no
                code required.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Agents are the core building block of CallTone. Every campaign,
                inbound call flow, and receptionist service is powered by an
                agent that you create and customize.
              </p>
            </div>

            {/* Creating an Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Creating an Agent
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Navigate to{" "}
                <strong className="text-foreground">
                  Dashboard &rarr; Agents
                </strong>{" "}
                and click{" "}
                <strong className="text-foreground">Create Agent</strong>. The
                creation form guides you through the following fields:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Name</strong> — An
                  internal label for your reference (e.g., &quot;Q1 Sales
                  Agent&quot;). Not spoken to callers.
                </li>
                <li>
                  <strong className="text-foreground">System Prompt</strong> —
                  Instructions that define the agent&apos;s personality,
                  knowledge, and behavior. See best practices below.
                </li>
                <li>
                  <strong className="text-foreground">First Message</strong> —
                  The opening line the agent speaks when a call connects.
                </li>
                <li>
                  <strong className="text-foreground">Voice</strong> — The
                  text-to-speech voice the agent will use.
                </li>
                <li>
                  <strong className="text-foreground">Model</strong> — The
                  LLM that powers the agent&apos;s responses.
                </li>
                <li>
                  <strong className="text-foreground">Capabilities</strong> —
                  Optional toggles for appointment scheduling and receptionist
                  mode.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After filling in the fields, click{" "}
                <strong className="text-foreground">Save</strong>. Your agent
                is now ready to be assigned to a phone number and used in
                campaigns or for inbound calls.
              </p>
            </div>

            {/* System Prompt Best Practices */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                System Prompt Best Practices
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The system prompt is the single most important factor in
                determining how well your agent performs. Think of it as a
                detailed brief that you would give a new employee on their
                first day.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Be Specific
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Vague instructions produce vague results. Instead of &quot;Be
                helpful,&quot; write &quot;You are a customer success
                representative for Acme Software. Your goal is to help the
                customer resolve their billing issue. If you cannot resolve it,
                offer to transfer them to a human agent.&quot;
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Include Objection Handling
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                For sales agents, list the three to five most common objections
                and the ideal response for each. For example: &quot;If the
                prospect says &apos;I&apos;m not interested,&apos; respond
                with: &apos;I completely understand. Many of our best customers
                felt the same way before seeing a quick demo. Would you be open
                to a five-minute walkthrough?&apos;&quot;
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Set Clear Boundaries
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Tell the agent what it must never do. Examples: &quot;Never
                make up pricing or feature information. Never claim to be a
                human. Never provide legal or medical advice. If asked about
                something outside your knowledge, say you will have a team
                member follow up.&quot;
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Structure the Conversation
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Outline the flow of the conversation step by step. For a
                qualification call this might be: (1) Greet and introduce,
                (2) Ask about their current solution, (3) Identify pain points,
                (4) Present your value proposition, (5) Offer a next step
                (demo, meeting, resource). The agent will follow this order
                naturally.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Keep It Concise
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                While detail is important, avoid writing a novel. Aim for 200
                to 500 words. The model performs best when instructions are
                clear and direct. Use bullet points rather than long paragraphs
                where possible.
              </p>
            </div>

            {/* Voice Configuration */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Voice Configuration
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone supports multiple text-to-speech providers, giving you
                a wide selection of voices with different characteristics:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Vapi</strong> — Built-in
                  voices optimized for low latency. Best for use cases where
                  fast response time is critical. Voices include alloy, echo,
                  fable, onyx, nova, and shimmer.
                </li>
                <li>
                  <strong className="text-foreground">ElevenLabs</strong> —
                  Premium voices with the most natural-sounding inflection and
                  emotion. Ideal for customer-facing agents where voice quality
                  is a top priority. Offers a large library of pre-made voices
                  and the option to clone a custom voice.
                </li>
                <li>
                  <strong className="text-foreground">PlayHT</strong> — A wide
                  variety of voices with good quality and competitive pricing.
                  Strong multilingual support for agents that need to operate in
                  multiple languages.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can preview any voice before committing. Select a voice,
                click the play button, and listen to a sample. When choosing,
                consider your audience, brand personality, and the type of
                conversation the agent will have.
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Model Selection
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The language model determines how intelligently your agent
                responds. CallTone supports the following models:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    GPT-4o (Recommended)
                  </strong>{" "}
                  — The best overall model for most use cases. Handles complex
                  conversations, nuanced objections, and multi-step reasoning
                  with high accuracy. The preferred choice for sales,
                  receptionist, and support agents.
                </li>
                <li>
                  <strong className="text-foreground">GPT-4o Mini</strong> —
                  Faster response times at a lower cost. Ideal for simpler
                  conversations such as appointment confirmations, FAQ
                  handling, and basic lead qualification. Slightly less capable
                  with complex reasoning.
                </li>
                <li>
                  <strong className="text-foreground">GPT-3.5 Turbo</strong> —
                  The most economical option. Best for highly scripted
                  conversations where the agent follows a rigid flow and does
                  not need to improvise. Not recommended for complex sales or
                  support interactions.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can change the model at any time without losing any other
                configuration. Test different models to find the right balance
                of quality, speed, and cost for your specific use case.
              </p>
            </div>

            {/* Capabilities */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Capabilities
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Capabilities are optional features you can enable on a
                per-agent basis:
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Appointment Scheduling
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                When enabled, the agent gains the ability to check your
                calendar for availability, propose time slots to the caller,
                and book confirmed appointments — all during a live call.
                Confirmation emails and reminders are sent automatically. You
                must configure your calendar settings under{" "}
                <strong className="text-foreground">
                  Settings &rarr; Appointments
                </strong>{" "}
                before enabling this capability.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">
                Receptionist Mode
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Turns the agent into a virtual front-desk receptionist. The
                agent can greet inbound callers, look up departments and staff
                members, transfer calls to the right person using
                Vapi&apos;s transferCall function, and take messages when
                staff are unavailable. Configure departments and staff under{" "}
                <strong className="text-foreground">
                  Dashboard &rarr; Receptionist
                </strong>
                .
              </p>
            </div>

            {/* Knowledge Base */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Knowledge Base
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can upload documents that your agent can reference during
                calls. This is useful for providing the agent with detailed
                product information, pricing sheets, FAQs, or company policies
                that would be too long to include in the system prompt.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Supported file formats include PDF, DOCX, TXT, and CSV.
                Navigate to the agent&apos;s detail page and open the{" "}
                <strong className="text-foreground">Knowledge Base</strong>{" "}
                tab to upload documents. The platform processes and indexes
                the content so the agent can retrieve relevant information
                on the fly when a caller asks a question.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                For best results, keep documents focused on a single topic
                and use clear headings and formatting. The agent will
                reference these documents to provide accurate, grounded
                answers rather than generating information from its general
                training data.
              </p>
            </div>

            {/* Testing Your Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Testing Your Agent
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Before deploying an agent to a live campaign, always test it
                thoroughly. From the agent detail page, click{" "}
                <strong className="text-foreground">Test Call</strong> and
                enter your own phone number. The platform will initiate a live
                call so you can interact with the agent exactly as a real
                prospect or customer would.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                During testing, try the following:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Let the agent deliver its first message and assess whether
                  the opening is clear and engaging.
                </li>
                <li>
                  Ask questions that are covered in your system prompt to
                  verify the agent responds correctly.
                </li>
                <li>
                  Throw common objections at the agent (&quot;I&apos;m not
                  interested,&quot; &quot;How much does it cost?&quot;) and
                  see how it handles them.
                </li>
                <li>
                  Ask something outside the agent&apos;s knowledge to verify
                  it respects its boundaries and does not fabricate answers.
                </li>
                <li>
                  If appointment scheduling is enabled, try to book an
                  appointment and check that the confirmation email arrives.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After each test call, review the full transcript and
                AI-generated summary in the{" "}
                <strong className="text-foreground">Calls</strong> section.
                Use what you learn to refine the system prompt, adjust the
                first message, or switch to a different voice or model.
              </p>
            </div>

            {/* Editing and Updating */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Editing and Updating Agents
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Agents can be edited at any time. Navigate to{" "}
                <strong className="text-foreground">
                  Dashboard &rarr; Agents
                </strong>
                , click on the agent you want to modify, and update any field.
                Changes take effect immediately for new calls — calls already
                in progress will continue using the previous configuration.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Common reasons to update an agent include:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Refining the system prompt after reviewing call transcripts
                  and identifying areas where the agent could perform better.
                </li>
                <li>
                  Changing the voice or model based on caller feedback or cost
                  considerations.
                </li>
                <li>
                  Updating product information or pricing in the system prompt
                  and knowledge base.
                </li>
                <li>
                  Enabling or disabling capabilities like appointment
                  scheduling as your business needs evolve.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We recommend reviewing agent performance weekly using the{" "}
                <strong className="text-foreground">Analytics</strong> and{" "}
                <strong className="text-foreground">Intelligence</strong>{" "}
                dashboards. Look for patterns in negative-sentiment calls,
                common objections the agent struggles with, and drop-off
                points in conversations. Continuous iteration is the key to
                maximizing agent effectiveness.
              </p>
            </div>

            {/* Next Steps */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Next Steps
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Now that you understand agents, explore these related topics:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <Link
                    href="/docs/getting-started"
                    className="text-primary hover:underline"
                  >
                    Getting Started
                  </Link>{" "}
                  — End-to-end setup walkthrough from account creation to your
                  first call.
                </li>
                <li>
                  <Link
                    href="/docs/tutorials"
                    className="text-primary hover:underline"
                  >
                    Tutorials
                  </Link>{" "}
                  — Step-by-step guides for sales agents, campaigns,
                  appointments, and receptionist setup.
                </li>
                <li>
                  <Link
                    href="/docs/api-reference"
                    className="text-primary hover:underline"
                  >
                    API Reference
                  </Link>{" "}
                  — Create and manage agents programmatically via the REST API.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
