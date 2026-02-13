import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics Documentation | CallTone",
  description:
    "Learn how to use CallTone analytics to track call outcomes, sentiment, lead scores, conversation intelligence, and campaign performance.",
};

export default function AnalyticsDocsPage() {
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
            Analytics
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Track call performance, understand customer sentiment, score leads
            automatically, and gain actionable intelligence from every
            conversation.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Dashboard Overview */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Dashboard Overview
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The analytics dashboard at{" "}
                <strong className="text-foreground">Dashboard &gt; Analytics</strong>{" "}
                provides a high-level view of your calling activity and performance.
                Summary cards at the top of the page display key metrics at a glance:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Total calls</strong> &mdash; The total number
                  of calls made and received in the selected time period, with a comparison to the
                  previous period showing the trend direction.
                </li>
                <li>
                  <strong className="text-foreground">Answer rate</strong> &mdash; The percentage of
                  outbound calls that were answered by a live person. Industry benchmarks typically
                  range from 15&ndash;30% for cold outreach and 40&ndash;60% for warm follow-ups.
                </li>
                <li>
                  <strong className="text-foreground">Average call duration</strong> &mdash; The mean
                  length of answered calls in minutes and seconds. Longer calls generally indicate
                  higher engagement. Unanswered calls and voicemails are excluded from this metric.
                </li>
                <li>
                  <strong className="text-foreground">Outcome breakdown</strong> &mdash; A summary
                  of call results: interested, not interested, appointment booked, callback
                  requested, voicemail left, no answer, and other custom outcomes defined in your
                  agent&apos;s configuration.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Below the summary cards, a call volume chart shows your daily or weekly
                call counts over time. Use the date range picker to view data for the
                last 7 days, 30 days, 90 days, or a custom range. All metrics update in
                real time as new calls complete.
              </p>
            </div>

            {/* Call History */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Call History
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The call history log at{" "}
                <strong className="text-foreground">Dashboard &gt; Calls</strong>{" "}
                provides a complete, searchable record of every call your agents have
                made or received. Each call entry includes:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Date and time</strong> &mdash; When the call
                  occurred, displayed in your organization&apos;s configured timezone.
                </li>
                <li>
                  <strong className="text-foreground">Contact</strong> &mdash; The name and phone
                  number of the person called (or the caller for inbound calls).
                </li>
                <li>
                  <strong className="text-foreground">Agent</strong> &mdash; Which voice agent
                  handled the call.
                </li>
                <li>
                  <strong className="text-foreground">Direction</strong> &mdash; Whether the call
                  was inbound or outbound.
                </li>
                <li>
                  <strong className="text-foreground">Duration</strong> &mdash; The length of the
                  call.
                </li>
                <li>
                  <strong className="text-foreground">Outcome</strong> &mdash; The result of the
                  call as determined by the agent (e.g., interested, not interested, appointment
                  booked).
                </li>
                <li>
                  <strong className="text-foreground">Sentiment</strong> &mdash; The overall
                  sentiment score (positive, neutral, or negative).
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Click any call to open the full detail view, which includes:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Full transcript</strong> &mdash; A word-by-word
                  transcription of the entire conversation, with speaker labels distinguishing the
                  agent from the contact. Timestamps are included for each speaker turn.
                </li>
                <li>
                  <strong className="text-foreground">Audio recording</strong> &mdash; A playable
                  recording of the call. You can play, pause, and scrub through the audio. The
                  transcript highlights the corresponding text as the audio plays.
                </li>
                <li>
                  <strong className="text-foreground">AI summary</strong> &mdash; A concise
                  AI-generated summary of the call covering the key topics discussed, the
                  contact&apos;s intent, any commitments made, and recommended next steps.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Use the search bar to find calls by contact name, phone number, or
                keywords in the transcript. Filter by date range, agent, direction,
                outcome, or sentiment to narrow results.
              </p>
            </div>

            {/* Sentiment Analysis */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Sentiment Analysis
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone automatically analyzes the sentiment of every call using AI
                natural language processing. Sentiment is scored at two levels:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Overall call sentiment</strong> &mdash; Each
                  call receives an aggregate sentiment rating of positive, neutral, or negative
                  based on the full conversation. This rating appears in the call history list and
                  is used in dashboard-level analytics.
                </li>
                <li>
                  <strong className="text-foreground">Turn-level sentiment</strong> &mdash; Within
                  the call detail view, individual speaker turns are annotated with sentiment
                  indicators. This helps you identify the exact moments in a conversation where
                  sentiment shifted &mdash; for example, when a contact became frustrated or when
                  the agent successfully addressed an objection.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The analytics dashboard includes a sentiment distribution chart showing
                the percentage of positive, neutral, and negative calls over time. Track
                this metric to evaluate how well your agents are handling conversations
                and whether script changes are improving outcomes.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can filter the call history by sentiment to quickly find and review
                negative calls that may need follow-up or coaching attention.
              </p>
            </div>

            {/* Lead Scoring */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Lead Scoring
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone&apos;s smart lead scoring system automatically evaluates and
                ranks contacts based on their call interactions. Lead scores are computed
                using AI analysis of multiple signals:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Engagement level</strong> &mdash; How actively
                  the contact participated in the conversation. Longer calls with more back-and-forth
                  exchanges indicate higher engagement.
                </li>
                <li>
                  <strong className="text-foreground">Intent signals</strong> &mdash; Specific phrases
                  and questions that indicate purchase intent, such as asking about pricing, timelines,
                  or implementation details.
                </li>
                <li>
                  <strong className="text-foreground">Sentiment</strong> &mdash; The overall tone of
                  the conversation. Positive sentiment correlates with higher conversion likelihood.
                </li>
                <li>
                  <strong className="text-foreground">Outcome</strong> &mdash; The call result
                  (appointment booked scores highest, callback requested scores high, not interested
                  scores low).
                </li>
                <li>
                  <strong className="text-foreground">Multi-call history</strong> &mdash; If a contact
                  has been called multiple times, the scoring considers the trajectory across
                  interactions (improving sentiment, increasing engagement).
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Lead scores range from 0 to 100 and are categorized into tiers: Hot
                (80&ndash;100), Warm (50&ndash;79), Cool (20&ndash;49), and Cold
                (0&ndash;19). The lead scoring dashboard at{" "}
                <strong className="text-foreground">Dashboard &gt; Leads</strong> shows
                your leads organized by score with AI-generated next-best-action
                recommendations (e.g., &quot;Schedule a follow-up call within 24
                hours&quot; or &quot;Send pricing information via email&quot;).
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Lead scores update automatically after each call. You can also manually
                adjust scores or add notes from the lead detail page.
              </p>
            </div>

            {/* Conversation Intelligence */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Conversation Intelligence
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The conversation intelligence module at{" "}
                <strong className="text-foreground">Dashboard &gt; Intelligence</strong>{" "}
                goes beyond individual call metrics to surface patterns and insights
                across all of your conversations. This feature analyzes your call
                transcripts at scale to identify:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Competitor mentions</strong> &mdash; Tracks
                  when contacts mention competitor names during calls. The dashboard shows which
                  competitors are mentioned most frequently, the context of each mention, and
                  whether the agent effectively addressed the competitive comparison. Use this
                  data to refine your agent&apos;s handling of competitive objections.
                </li>
                <li>
                  <strong className="text-foreground">Objection patterns</strong> &mdash; Identifies
                  the most common objections raised by contacts (e.g., &quot;too expensive,&quot;
                  &quot;not the right time,&quot; &quot;already have a solution&quot;). For each
                  objection type, you can see how frequently it occurs, how the agent responds,
                  and the success rate of different responses. This helps you optimize your
                  agent&apos;s objection-handling scripts.
                </li>
                <li>
                  <strong className="text-foreground">Coaching insights</strong> &mdash; AI-generated
                  recommendations for improving your agent&apos;s performance. These might include
                  suggestions like &quot;Your agent is not asking for the appointment early
                  enough&quot; or &quot;Calls where the agent mentions a specific benefit have a 40%
                  higher conversion rate.&quot;
                </li>
                <li>
                  <strong className="text-foreground">Topic trends</strong> &mdash; Identifies what
                  subjects contacts are asking about most frequently, helping you understand market
                  interest and adjust your messaging.
                </li>
                <li>
                  <strong className="text-foreground">Talk-to-listen ratio</strong> &mdash; Measures
                  how much of the conversation is the agent speaking versus the contact. A balanced
                  ratio (40&ndash;60% agent, 40&ndash;60% contact) typically correlates with better
                  outcomes.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Conversation intelligence data refreshes as new calls complete. Trends
                are most meaningful with at least 50&ndash;100 calls in the dataset. The
                module is available on the Business plan and above.
              </p>
            </div>

            {/* Campaign Analytics */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Campaign Analytics
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Each campaign has its own analytics view accessible from the campaign
                detail page. Campaign-specific metrics include:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Completion rate</strong> &mdash; Percentage of
                  contacts in the list that have been called (including retries).
                </li>
                <li>
                  <strong className="text-foreground">Answer rate</strong> &mdash; Percentage of calls
                  answered by a live person within this campaign.
                </li>
                <li>
                  <strong className="text-foreground">Outcome breakdown</strong> &mdash; Distribution
                  of call results for this campaign specifically, letting you compare performance
                  across different campaigns, agents, or contact lists.
                </li>
                <li>
                  <strong className="text-foreground">Pace metrics</strong> &mdash; Calls per hour,
                  average time between calls, and estimated time to completion.
                </li>
                <li>
                  <strong className="text-foreground">Time-of-day analysis</strong> &mdash; Shows
                  which hours of the day produce the best answer rates and outcomes for this
                  campaign, helping you optimize your calling schedule.
                </li>
                <li>
                  <strong className="text-foreground">Retry effectiveness</strong> &mdash; How
                  often retry attempts succeed versus first attempts, and the optimal time between
                  retries based on your data.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Compare campaign analytics across multiple campaigns to identify which
                agent scripts, contact lists, and schedules produce the best results.
                Use the <strong className="text-foreground">Compare Campaigns</strong>{" "}
                feature to view side-by-side metrics.
              </p>
            </div>

            {/* Exporting Data */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Exporting Data
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone provides multiple ways to export your analytics data for
                external analysis, reporting, or CRM integration:
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">CSV Export</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Most analytics views include an <strong className="text-foreground">Export CSV</strong>{" "}
                button that downloads the current data set as a comma-separated values file. You can
                export:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Full call history with all metadata (date, time, contact, agent, duration, outcome, sentiment, lead score)</li>
                <li>Campaign-specific call logs</li>
                <li>Lead scores and rankings</li>
                <li>Appointment lists</li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Exports respect your current filters and date range. Apply filters before
                exporting to download exactly the data you need.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">REST API</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                For programmatic access, the CallTone REST API provides endpoints for
                retrieving call data, lead scores, campaign metrics, and more. Generate
                an API key in{" "}
                <strong className="text-foreground">Settings &gt; API Keys</strong> and
                refer to the{" "}
                <Link
                  href="/docs/api-reference"
                  className="text-primary hover:underline"
                >
                  API Reference
                </Link>{" "}
                documentation for endpoint details.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Common API use cases include syncing call outcomes to your CRM,
                triggering workflows in Zapier or Make based on lead scores, and
                building custom analytics dashboards with tools like Metabase or
                Looker.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">Webhooks</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                For real-time data flow, configure webhooks to receive event
                notifications when calls complete, appointments are booked, or lead
                scores change. See the{" "}
                <Link
                  href="/docs/webhooks"
                  className="text-primary hover:underline"
                >
                  Webhooks documentation
                </Link>{" "}
                for setup instructions and payload formats.
              </p>
            </div>

            {/* Data Retention */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Data Retention
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Analytics data is retained according to your subscription plan:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Starter</strong> &mdash; 30 days of call history and analytics
                </li>
                <li>
                  <strong className="text-foreground">Growth</strong> &mdash; 90 days of call history and analytics
                </li>
                <li>
                  <strong className="text-foreground">Business</strong> &mdash; 1 year of call history and analytics
                </li>
                <li>
                  <strong className="text-foreground">Enterprise</strong> &mdash; Unlimited retention with custom archival options
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We recommend exporting important data before it reaches the end of your
                retention window. Call recordings follow the same retention schedule
                unless you configure a custom retention policy in Settings.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
