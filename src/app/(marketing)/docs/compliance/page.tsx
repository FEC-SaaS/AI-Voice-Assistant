import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance | CallTone Docs",
  description:
    "Understand TCPA requirements, DNC management, consent tracking, calling hour enforcement, audit logs, and compliance best practices in CallTone.",
};

export default function ComplianceDocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4">
          <Link
            href="/docs"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Documentation
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Compliance
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            CallTone provides built-in tools to help you stay compliant with
            federal and state telemarketing regulations. From DNC list management
            to consent tracking to automatic calling hour enforcement, compliance
            is woven into every call your agents make.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-4xl">
            {/* Disclaimer */}
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 not-prose mb-8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Disclaimer:</strong> This
                documentation provides an overview of compliance features in
                CallTone and general guidance on telemarketing regulations. It
                is not legal advice. Regulations vary by jurisdiction and change
                over time. Consult a qualified attorney to ensure your specific
                use case complies with all applicable laws.
              </p>
            </div>

            {/* TCPA Overview */}
            <h2 className="text-foreground">TCPA Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Telephone Consumer Protection Act (TCPA) is a federal law
              that governs telemarketing calls, auto-dialed calls, prerecorded
              voice messages, and text messages. Key requirements include:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Prior express consent</strong> is required before
                making telemarketing calls. For calls using artificial or
                prerecorded voices (which includes AI voice agents), prior
                express written consent is required.
              </li>
              <li>
                <strong>Calling hours</strong> are restricted to between 8:00 AM
                and 9:00 PM in the called party&apos;s local time zone.
              </li>
              <li>
                <strong>Caller identification</strong> must be provided at the
                beginning of each call, including the name of the business and
                a callback number.
              </li>
              <li>
                <strong>Do-Not-Call requests</strong> must be honored. If a
                person asks not to be called, they must be added to your
                internal DNC list and not contacted again.
              </li>
              <li>
                <strong>National Do-Not-Call Registry</strong> must be
                consulted. Numbers on the federal DNC registry cannot be called
                for telemarketing purposes unless the caller has an established
                business relationship or prior express written consent.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              CallTone automates many of these requirements, but the
              responsibility for compliance ultimately rests with you, the
              caller. The features described below are tools to help you
              comply, not guarantees of compliance.
            </p>

            {/* DNC Management */}
            <h2 className="text-foreground">Do-Not-Call (DNC) Management</h2>
            <p className="text-muted-foreground leading-relaxed">
              CallTone maintains an internal Do-Not-Call list for your
              organization. Numbers on this list are automatically blocked from
              all outbound campaigns and manual calls. You can manage your DNC
              list from the{" "}
              <strong>Compliance &gt; Do-Not-Call</strong> page in your
              dashboard.
            </p>

            <h3 className="text-foreground">Adding Numbers Manually</h3>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>Add Number</strong> and enter one or more phone
              numbers. You can optionally specify the reason (e.g.,
              &quot;customer request&quot;, &quot;verbal opt-out during
              call&quot;) and the source of the request. The number is
              immediately blocked from all outbound calling.
            </p>

            <h3 className="text-foreground">Importing DNC Lists</h3>
            <p className="text-muted-foreground leading-relaxed">
              To import a bulk DNC list, click <strong>Import</strong> and
              upload a CSV file with phone numbers in E.164 format (e.g.,
              +12125551234). The importer validates each number, deduplicates
              entries, and adds them to your internal list. You can use this to
              import numbers from the National DNC Registry or from other
              systems.
            </p>

            <h3 className="text-foreground">Automatic DNC Checking</h3>
            <p className="text-muted-foreground leading-relaxed">
              Before every outbound call, CallTone automatically checks the
              target number against your internal DNC list. If the number is
              found, the call is skipped and marked as &quot;DNC Blocked&quot;
              in the campaign report. This check happens in real time, so
              numbers added to the list mid-campaign are respected immediately.
            </p>

            <h3 className="text-foreground">Automatic Opt-Out Detection</h3>
            <p className="text-muted-foreground leading-relaxed">
              During active calls, if a contact says phrases like &quot;stop
              calling me&quot;, &quot;remove me from your list&quot;,
              &quot;do not call&quot;, or &quot;take me off your list&quot;,
              the voice agent recognizes the opt-out request and responds
              politely (e.g., &quot;I understand. I&apos;ve removed your
              number from our calling list. You will not receive any further
              calls from us.&quot;). The number is automatically added to your
              DNC list and the call is ended gracefully.
            </p>

            {/* Consent Tracking */}
            <h2 className="text-foreground">Consent Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              CallTone records consent information for every contact in your
              system. This creates a verifiable audit trail that you can
              reference if a compliance question arises.
            </p>

            <h3 className="text-foreground">What Is Recorded</h3>
            <p className="text-muted-foreground leading-relaxed">
              For each contact, CallTone tracks:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Consent status</strong> &mdash; whether the contact has
                given consent, and what type (express, express written, or
                implied).
              </li>
              <li>
                <strong>Consent source</strong> &mdash; how consent was
                obtained (e.g., web form, paper form, verbal during call, SMS
                opt-in, imported record).
              </li>
              <li>
                <strong>Timestamp</strong> &mdash; when consent was recorded,
                stored in UTC with your organization&apos;s timezone for
                display.
              </li>
              <li>
                <strong>Consent text</strong> &mdash; the exact language the
                contact agreed to, if available (e.g., the text of the web form
                disclosure).
              </li>
              <li>
                <strong>Revocation</strong> &mdash; if consent is revoked
                (through a DNC request, opt-out, or manual action), the
                revocation timestamp and reason are also recorded.
              </li>
            </ul>

            <h3 className="text-foreground">Managing Consent Records</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can view and update consent records from the contact detail
              page or from the{" "}
              <strong>Compliance &gt; Consent</strong> dashboard. When
              importing contacts via CSV, you can include consent columns
              (consent_status, consent_source, consent_date) to populate
              records in bulk.
            </p>

            {/* Calling Hours */}
            <h2 className="text-foreground">Calling Hours Enforcement</h2>
            <p className="text-muted-foreground leading-relaxed">
              CallTone enforces calling hour restrictions to ensure outbound
              calls are only placed during permitted times. The TCPA requires
              that telemarketing calls be made between 8:00 AM and 9:00 PM in
              the recipient&apos;s local time zone.
            </p>

            <h3 className="text-foreground">How It Works</h3>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                Before placing each call, CallTone determines the
                recipient&apos;s timezone based on their area code and
                geographic data.
              </li>
              <li>
                If the current time falls outside the permitted calling window
                in the recipient&apos;s timezone, the call is deferred and
                rescheduled for the next available window.
              </li>
              <li>
                Your organization can configure a custom calling window that is
                narrower than the legal maximum. For example, you might set
                your window to 9:00 AM &ndash; 6:00 PM to be more
                conservative.
              </li>
              <li>
                Calling hour settings are configured under{" "}
                <strong>Settings &gt; Organization &gt; Calling Hours</strong>.
                Individual campaigns can also override the default hours if
                needed.
              </li>
            </ul>

            <h3 className="text-foreground">Holiday and Weekend Handling</h3>
            <p className="text-muted-foreground leading-relaxed">
              By default, CallTone does not restrict calling on weekends or
              holidays (TCPA does not prohibit this). However, you can
              configure your campaigns to skip weekends, specific holidays, or
              both. This is available in the campaign scheduling settings.
            </p>

            {/* Call Disclosure */}
            <h2 className="text-foreground">Call Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              Many jurisdictions require that automated or AI-powered calls
              disclose their nature at the beginning of the conversation.
              CallTone automatically plays a disclosure message at the start of
              every outbound call made by a voice agent.
            </p>

            <h3 className="text-foreground">Default Disclosure</h3>
            <p className="text-muted-foreground leading-relaxed">
              CallTone ships with a sensible default disclosure message:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4">
              <p className="text-sm text-muted-foreground italic">
                &quot;Hello, this is an AI assistant calling on behalf of [Your
                Organization Name]. This call may be recorded for quality
                assurance purposes.&quot;
              </p>
            </div>

            <h3 className="text-foreground">Customizing the Disclosure</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can customize the disclosure message under{" "}
              <strong>Settings &gt; Organization &gt; Disclosure
              Message</strong>. The message supports the following template
              variables:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <code>&#123;&#123;orgName&#125;&#125;</code> &mdash; replaced
                with your organization&apos;s name.
              </li>
              <li>
                <code>&#123;&#123;agentName&#125;&#125;</code> &mdash; replaced
                with the voice agent&apos;s configured name.
              </li>
              <li>
                <code>&#123;&#123;contactName&#125;&#125;</code> &mdash;
                replaced with the contact&apos;s first name, if available.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              The disclosure is spoken by the voice agent in the same voice and
              tone configured for that agent, ensuring a natural call
              experience.
            </p>

            {/* Call Recording Consent */}
            <h2 className="text-foreground">Call Recording Consent</h2>
            <p className="text-muted-foreground leading-relaxed">
              If call recording is enabled, additional consent requirements may
              apply depending on the state. The United States has a mix of
              one-party and two-party (all-party) consent states:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>One-party consent states</strong> require only one
                party in the conversation to consent to the recording. Since
                your organization is initiating the recording, this requirement
                is typically met. However, best practice is still to inform the
                other party.
              </li>
              <li>
                <strong>Two-party consent states</strong> (including
                California, Florida, Illinois, Maryland, Massachusetts,
                Montana, New Hampshire, Pennsylvania, and Washington) require
                all parties to consent to the recording.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              CallTone handles this by including recording disclosure in the
              call&apos;s opening message. When call recording is active, the
              disclosure message automatically includes a statement that the
              call is being recorded. If the contact does not object, implied
              consent is assumed per industry standards. If the contact objects,
              the agent can continue the call without recording (recording is
              paused or stopped).
            </p>

            {/* Audit Logs */}
            <h2 className="text-foreground">Audit Logs</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every significant action in CallTone is recorded in the audit
              log. This provides a complete, tamper-resistant record of who did
              what and when, which is essential for compliance investigations
              and internal reviews.
            </p>

            <h3 className="text-foreground">What Is Logged</h3>
            <p className="text-muted-foreground leading-relaxed">
              The audit log captures the following events:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Call events</strong> &mdash; call initiated, call
                completed, call failed, call transferred, recording started,
                recording stopped.
              </li>
              <li>
                <strong>Campaign events</strong> &mdash; campaign created,
                started, paused, resumed, completed, contact added, contact
                skipped (with reason).
              </li>
              <li>
                <strong>Agent events</strong> &mdash; agent created, updated,
                deleted, published, unpublished.
              </li>
              <li>
                <strong>Contact events</strong> &mdash; contact created,
                updated, deleted, consent updated, DNC added, DNC removed.
              </li>
              <li>
                <strong>Team events</strong> &mdash; member invited, member
                joined, role changed, member removed.
              </li>
              <li>
                <strong>Settings events</strong> &mdash; organization settings
                changed, branding updated, API key created, API key revoked.
              </li>
              <li>
                <strong>Compliance events</strong> &mdash; DNC list imported,
                consent record updated, opt-out detected during call.
              </li>
            </ul>

            <h3 className="text-foreground">Viewing the Audit Log</h3>
            <p className="text-muted-foreground leading-relaxed">
              Navigate to <strong>Compliance &gt; Audit Log</strong> in your
              dashboard. You can filter by date range, event type, user, and
              resource. Each entry shows:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Timestamp</strong> &mdash; exact date and time of the
                action.
              </li>
              <li>
                <strong>Actor</strong> &mdash; the user or system process that
                performed the action.
              </li>
              <li>
                <strong>Action</strong> &mdash; what was done (e.g.,
                &quot;contact.dnc_added&quot;).
              </li>
              <li>
                <strong>Resource</strong> &mdash; the entity affected (e.g., a
                specific contact or campaign).
              </li>
              <li>
                <strong>Details</strong> &mdash; additional context, such as
                the old and new values for a settings change.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Audit logs are retained for 12 months on all plans. Enterprise
              customers can request extended retention.
            </p>

            {/* Opt-Out Handling */}
            <h2 className="text-foreground">Opt-Out Handling</h2>
            <p className="text-muted-foreground leading-relaxed">
              CallTone supports multiple opt-out mechanisms to ensure contacts
              can easily stop receiving calls:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Verbal opt-out during a call</strong> &mdash; if a
                contact says &quot;stop&quot;, &quot;remove me&quot;, &quot;do
                not call&quot;, &quot;take me off your list&quot;, or similar
                phrases, the AI agent recognizes the request, confirms it
                verbally, and adds the number to your DNC list automatically.
              </li>
              <li>
                <strong>SMS opt-out</strong> &mdash; if you use the missed call
                text-back feature or two-way SMS, contacts can reply
                &quot;STOP&quot; to opt out of further SMS messages. Their
                number is automatically added to the SMS DNC list.
              </li>
              <li>
                <strong>Manual opt-out</strong> &mdash; your team can add
                numbers to the DNC list at any time from the dashboard.
              </li>
              <li>
                <strong>API opt-out</strong> &mdash; use the REST API to
                programmatically add numbers to the DNC list from your own
                systems.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              All opt-out actions are logged in the audit trail with a
              timestamp, the method of opt-out, and the context (e.g., which
              call or campaign triggered the request).
            </p>

            {/* Best Practices */}
            <h2 className="text-foreground">Best Practices for Staying Compliant</h2>
            <p className="text-muted-foreground leading-relaxed">
              Following these best practices will help you minimize compliance
              risk while using CallTone:
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Always obtain consent before calling.</strong> Ensure
                you have prior express written consent before using AI voice
                agents for telemarketing calls. Document how and when consent
                was obtained.
              </li>
              <li>
                <strong>Keep your DNC list current.</strong> Import the
                National DNC Registry regularly (at least every 31 days, as
                required by FTC rules) and process opt-out requests immediately.
              </li>
              <li>
                <strong>Use the built-in disclosure message.</strong> Do not
                disable or skip the AI disclosure at the beginning of calls.
                Customize it if needed, but always include identification of
                the caller, the AI nature of the call, and recording notice.
              </li>
              <li>
                <strong>Respect calling hours strictly.</strong> Use
                CallTone&apos;s automatic calling hour enforcement and consider
                setting a more conservative window than the legal maximum.
              </li>
              <li>
                <strong>Review audit logs regularly.</strong> Check the
                compliance dashboard weekly to identify any anomalies, failed
                DNC checks, or unexpected opt-out volumes.
              </li>
              <li>
                <strong>Train your team.</strong> Ensure everyone on your team
                understands TCPA requirements and how to use CallTone&apos;s
                compliance features correctly.
              </li>
              <li>
                <strong>Consult legal counsel.</strong> Telemarketing
                regulations are complex and vary by state. Work with a
                qualified attorney to review your compliance program
                periodically.
              </li>
              <li>
                <strong>Monitor state-specific rules.</strong> Several states
                have their own telemarketing laws that may be stricter than the
                TCPA. Be aware of the requirements in every state where your
                contacts are located.
              </li>
              <li>
                <strong>Document everything.</strong> Use CallTone&apos;s
                consent tracking and audit logs as your system of record. If a
                complaint arises, this documentation is your first line of
                defense.
              </li>
            </ol>

            {/* Next Steps */}
            <h2 className="text-foreground">Next Steps</h2>
            <p className="text-muted-foreground leading-relaxed">
              Learn more about related features:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <Link href="/docs/team" className="text-primary hover:underline">
                  Team Management
                </Link>{" "}
                &mdash; configure organization settings, calling hours, and
                disclosure messages.
              </li>
              <li>
                <Link href="/docs/campaigns" className="text-primary hover:underline">
                  Campaigns
                </Link>{" "}
                &mdash; learn how campaign scheduling interacts with calling
                hours and DNC checks.
              </li>
              <li>
                <Link href="/docs/webhooks" className="text-primary hover:underline">
                  Webhooks &amp; Integrations
                </Link>{" "}
                &mdash; use the API to sync DNC lists and consent records from
                external systems.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
