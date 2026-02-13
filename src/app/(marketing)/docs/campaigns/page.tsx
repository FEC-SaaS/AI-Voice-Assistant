import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Campaign Documentation | CallTone",
  description:
    "Learn how to create, schedule, and manage automated outbound calling campaigns with CallTone voice agents.",
};

export default function CampaignDocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <Link
            href="/docs"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Documentation
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Campaigns
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Launch automated outbound calling sequences that reach your contacts
            at scale with intelligent scheduling and real-time monitoring.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* What Are Campaigns */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                What Are Campaigns?
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Campaigns are automated outbound calling sequences that allow your AI
                voice agents to call a list of contacts on a defined schedule. Instead
                of manually triggering each call, you upload a contact list, assign a
                voice agent, configure a schedule, and let CallTone handle the rest.
                The platform dials contacts one by one (or concurrently), conducts the
                conversation using your agent&apos;s script and personality, and logs
                every outcome for review.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Common use cases include lead qualification calls, appointment setting,
                customer follow-ups, event reminders, survey collection, and
                re-engagement outreach. Campaigns are available on the Growth plan and
                above.
              </p>
            </div>

            {/* Creating a Campaign */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Creating a Campaign
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Navigate to <strong className="text-foreground">Dashboard &gt; Campaigns</strong> and
                click <strong className="text-foreground">New Campaign</strong>. You will be guided
                through the following steps:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Campaign name</strong> &mdash; Choose a
                  descriptive name such as &quot;Q1 Lead Qualification&quot; or &quot;January
                  Follow-Ups.&quot; This is internal only and not shared with contacts.
                </li>
                <li>
                  <strong className="text-foreground">Select an agent</strong> &mdash; Pick the voice
                  agent that will conduct the calls. The agent must already be created and configured
                  with a system prompt, voice, and any relevant knowledge base documents. Make sure
                  the agent&apos;s script is appropriate for the campaign&apos;s purpose.
                </li>
                <li>
                  <strong className="text-foreground">Upload contact list</strong> &mdash; Upload a
                  CSV file containing your contacts. See the Contact List Format section below for
                  column requirements.
                </li>
                <li>
                  <strong className="text-foreground">Assign a phone number</strong> &mdash; Select
                  the outbound phone number the agent will call from. This number appears as the
                  caller ID for recipients. Numbers must be provisioned in the Phone Numbers section
                  before they can be used.
                </li>
                <li>
                  <strong className="text-foreground">Set the schedule</strong> &mdash; Define when
                  calls should be placed, including start date, calling hours, timezone, and
                  concurrency limits.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After completing these steps, the campaign is saved in
                <strong className="text-foreground"> Draft</strong> status. Review the settings and
                click <strong className="text-foreground">Activate</strong> when you are ready to begin
                dialing.
              </p>
            </div>

            {/* Contact List Format */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Contact List Format
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Contact lists must be uploaded as CSV files. The file should include a
                header row followed by one row per contact. The following columns are
                supported:
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm text-muted-foreground">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Column</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Required</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-3 font-mono text-foreground">phone</td>
                      <td className="px-4 py-3">Yes</td>
                      <td className="px-4 py-3">Phone number in E.164 format (e.g., +14155551234) or 10-digit US format</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-foreground">name</td>
                      <td className="px-4 py-3">Recommended</td>
                      <td className="px-4 py-3">Contact&apos;s full name. Used by the agent to personalize the conversation.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-foreground">email</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">Email address. Used for sending appointment confirmations or follow-ups.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-foreground">company</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">Company or organization name. Passed to the agent as context.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You may include additional custom columns. Any extra columns are stored
                as contact metadata and can be referenced by the agent during the call
                if configured in the agent&apos;s prompt template using{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm font-mono text-foreground">
                  {"{{column_name}}"}
                </code>{" "}
                placeholders.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Duplicate phone numbers are automatically de-duplicated. Numbers that
                appear on your organization&apos;s Do-Not-Call list are flagged and
                excluded from dialing.
              </p>
            </div>

            {/* Scheduling Options */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Scheduling Options
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Campaign scheduling controls when and how calls are placed. Proper
                scheduling ensures you reach contacts at appropriate times and comply
                with calling-hour regulations.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Start date</strong> &mdash; The date and time
                  the campaign begins dialing. You can start immediately or schedule a future date.
                </li>
                <li>
                  <strong className="text-foreground">Calling hours</strong> &mdash; Define the daily
                  window during which calls are placed (e.g., 9:00 AM to 5:00 PM). Calls outside this
                  window are automatically queued for the next available period. The default calling
                  window is 9:00 AM to 8:00 PM to comply with TCPA requirements.
                </li>
                <li>
                  <strong className="text-foreground">Timezone</strong> &mdash; Set the timezone for
                  calling hours. You can choose a fixed timezone or select &quot;Contact&apos;s local
                  timezone&quot; to automatically adjust based on each contact&apos;s area code.
                </li>
                <li>
                  <strong className="text-foreground">Max concurrent calls</strong> &mdash; The maximum
                  number of calls that can be in progress simultaneously. Higher concurrency finishes
                  the campaign faster but requires sufficient phone number capacity. The limit depends
                  on your subscription plan.
                </li>
                <li>
                  <strong className="text-foreground">Retry settings</strong> &mdash; Configure how
                  many times to retry contacts who don&apos;t answer (default: 2 retries) and the delay
                  between attempts (default: 4 hours). You can also set a maximum number of voicemails
                  to leave per contact.
                </li>
                <li>
                  <strong className="text-foreground">Days of week</strong> &mdash; Select which days
                  the campaign should dial. By default, campaigns run Monday through Friday. Weekend
                  calling can be enabled if appropriate for your use case.
                </li>
              </ul>
            </div>

            {/* Campaign Statuses */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Campaign Statuses
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Every campaign moves through a lifecycle of statuses:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Draft</strong> &mdash; The campaign has been
                  created but not activated. You can freely edit the contact list, agent, schedule,
                  and other settings while in draft mode.
                </li>
                <li>
                  <strong className="text-foreground">Active</strong> &mdash; The campaign is live and
                  currently dialing contacts (or waiting for the next calling window). Active campaigns
                  can be paused or stopped at any time.
                </li>
                <li>
                  <strong className="text-foreground">Paused</strong> &mdash; Dialing is temporarily
                  suspended. Any calls currently in progress will complete, but no new calls will be
                  initiated. Resume the campaign to continue dialing remaining contacts.
                </li>
                <li>
                  <strong className="text-foreground">Completed</strong> &mdash; All contacts in the
                  list have been called (including retries). The campaign automatically moves to this
                  status when there are no remaining contacts to dial.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can also manually mark a campaign as completed if you want to stop
                dialing before the entire list is finished. This is a permanent action
                and cannot be undone.
              </p>
            </div>

            {/* Monitoring Campaigns */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Monitoring Campaigns
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Once a campaign is active, you can monitor its progress in real time
                from the campaign detail page. The monitoring view includes:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Progress bar</strong> &mdash; Shows how many
                  contacts have been called out of the total list, with a percentage completion
                  indicator.
                </li>
                <li>
                  <strong className="text-foreground">Live call count</strong> &mdash; The number of
                  calls currently in progress right now.
                </li>
                <li>
                  <strong className="text-foreground">Outcome breakdown</strong> &mdash; A real-time
                  tally of call results: answered, voicemail, no answer, busy, and failed. Updated
                  after each call completes.
                </li>
                <li>
                  <strong className="text-foreground">Recent call log</strong> &mdash; A scrolling
                  feed of the most recent calls with the contact name, duration, outcome, and a link
                  to the full call detail (transcript, recording, summary).
                </li>
                <li>
                  <strong className="text-foreground">Estimated completion</strong> &mdash; A projected
                  finish time based on current pacing, concurrency, and remaining contacts.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can also view campaign progress from the Live Dashboard at{" "}
                <strong className="text-foreground">Dashboard &gt; Live</strong>, which
                shows all active calls across all campaigns in a unified real-time view
                with supervisor controls.
              </p>
            </div>

            {/* Pause, Resume, and Stop */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Pause, Resume, and Stop Controls
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You have full control over active campaigns at any time:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Pause</strong> &mdash; Temporarily halts new call
                  initiation. Calls already in progress will complete naturally. Use this if you need
                  to update your agent&apos;s script, adjust the schedule, or investigate an issue.
                  Pausing does not lose your place in the contact list.
                </li>
                <li>
                  <strong className="text-foreground">Resume</strong> &mdash; Restarts dialing from
                  where the campaign left off. Any remaining unanswered contacts will be called
                  according to the schedule.
                </li>
                <li>
                  <strong className="text-foreground">Stop</strong> &mdash; Permanently ends the
                  campaign. The campaign status changes to Completed and no further calls will be
                  made. All data from completed calls is preserved. This action cannot be undone; if
                  you want to call remaining contacts, create a new campaign.
                </li>
              </ul>
            </div>

            {/* Campaign Analytics */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Campaign Analytics
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After a campaign completes (or while it is running), detailed analytics
                are available on the campaign detail page. Metrics include:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Completion rate</strong> &mdash; The percentage
                  of contacts in the list that were successfully reached (answered or voicemail
                  left) versus total contacts.
                </li>
                <li>
                  <strong className="text-foreground">Answer rate</strong> &mdash; The percentage of
                  calls that were answered by a live person, as opposed to going to voicemail or
                  receiving no answer.
                </li>
                <li>
                  <strong className="text-foreground">Outcome breakdown</strong> &mdash; A chart
                  showing the distribution of call outcomes: interested, not interested, callback
                  requested, appointment booked, wrong number, and do-not-call requested.
                </li>
                <li>
                  <strong className="text-foreground">Average call duration</strong> &mdash; The mean
                  length of answered calls, which can indicate engagement quality.
                </li>
                <li>
                  <strong className="text-foreground">Sentiment distribution</strong> &mdash; An
                  aggregate view of call sentiment across the campaign (positive, neutral, negative).
                </li>
                <li>
                  <strong className="text-foreground">Appointments booked</strong> &mdash; If your
                  agent is configured for appointment scheduling, this shows how many appointments
                  were booked during the campaign.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Campaign analytics can be exported as a CSV file for further analysis
                or imported into your CRM. Use the{" "}
                <strong className="text-foreground">Export</strong> button at the top of
                the campaign detail page to download the full call log with all metadata.
              </p>
            </div>

            {/* Best Practices */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Best Practices
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Start with a small test batch of 20&ndash;50 contacts before launching a full
                  campaign. Listen to sample recordings to verify the agent&apos;s script sounds
                  natural and handles objections correctly.
                </li>
                <li>
                  Use the contact&apos;s local timezone setting to ensure calls land during appropriate
                  hours regardless of where each contact is located.
                </li>
                <li>
                  Keep your Do-Not-Call list up to date. CallTone automatically checks contacts
                  against your DNC list before dialing, but you are responsible for maintaining
                  an accurate list.
                </li>
                <li>
                  Monitor the first 10&ndash;15 calls of a new campaign closely. If the answer rate or
                  sentiment is lower than expected, pause the campaign and refine the agent&apos;s
                  script before continuing.
                </li>
                <li>
                  Set reasonable concurrency limits. Running too many concurrent calls can overwhelm
                  your team if the agent is transferring calls or booking appointments that require
                  immediate follow-up.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
