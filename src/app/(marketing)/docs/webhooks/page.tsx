import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Webhooks & Integrations | CallTone Docs",
  description:
    "Connect CallTone to your systems with the REST API, webhooks, signature verification, and integrations with Zapier, Slack, and CRMs.",
};

export default function WebhooksDocsPage() {
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
            Webhooks &amp; Integrations
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Connect CallTone to your CRM, communication tools, and custom
            systems. Use the REST API to programmatically manage resources and
            receive real-time webhook notifications when events occur.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-4xl">
            {/* REST API Overview */}
            <h2 className="text-foreground">REST API Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              The CallTone API is a RESTful JSON API that lets you
              programmatically manage agents, campaigns, contacts, calls, and
              more. All API requests are made over HTTPS and require
              authentication via an API key.
            </p>

            <h3 className="text-foreground">Base URL</h3>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4">
              <code className="text-sm text-foreground">
                https://api.calltone.ai/v1
              </code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              All endpoints are versioned. The current version is{" "}
              <code>v1</code>. When breaking changes are introduced, a new
              version will be released and the previous version will continue
              to work for at least 12 months.
            </p>

            <h3 className="text-foreground">Authentication</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every API request must include your API key in the{" "}
              <code>Authorization</code> header using the Bearer scheme:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`GET /v1/agents HTTP/1.1
Host: api.calltone.ai
Authorization: Bearer ct_live_abc123def456...
Content-Type: application/json`}
              </pre>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              API keys start with <code>ct_live_</code> for production keys
              and <code>ct_test_</code> for test keys. Test keys work in a
              sandbox environment where no real calls are placed.
            </p>

            <h3 className="text-foreground">Rate Limits</h3>
            <p className="text-muted-foreground leading-relaxed">
              The API enforces rate limits to ensure fair usage. Current limits
              are:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>100 requests per minute</strong> for standard
                endpoints (agents, contacts, campaigns).
              </li>
              <li>
                <strong>10 requests per minute</strong> for call initiation
                endpoints.
              </li>
              <li>
                <strong>1,000 requests per minute</strong> for read-only
                endpoints (analytics, call logs).
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Rate limit headers (<code>X-RateLimit-Limit</code>,{" "}
              <code>X-RateLimit-Remaining</code>, and{" "}
              <code>X-RateLimit-Reset</code>) are included in every response.
              If you exceed the limit, the API returns a{" "}
              <code>429 Too Many Requests</code> response.
            </p>

            {/* Creating API Keys */}
            <h2 className="text-foreground">Creating API Keys</h2>
            <p className="text-muted-foreground leading-relaxed">
              API keys are managed from your CallTone dashboard under{" "}
              <strong>Settings &gt; API Keys</strong>.
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                Navigate to <strong>Settings &gt; API Keys</strong>.
              </li>
              <li>
                Click <strong>Create API Key</strong>.
              </li>
              <li>
                Enter a descriptive name for the key (e.g., &quot;Zapier
                Integration&quot;, &quot;CRM Sync&quot;, or &quot;Slack
                Notifications&quot;).
              </li>
              <li>
                Choose the environment: <strong>Production</strong> (for live
                calls and data) or <strong>Test</strong> (for sandbox testing).
              </li>
              <li>
                Click <strong>Create</strong>. The full key is displayed once.
                Copy it immediately and store it securely. You will not be
                able to view the full key again.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              You can create multiple keys for different integrations. Each key
              is independently revocable, so if one is compromised, you can
              revoke it without affecting other integrations. See the{" "}
              <Link href="/docs/team" className="text-primary hover:underline">
                Team Management
              </Link>{" "}
              documentation for API key security best practices.
            </p>

            {/* Webhook Events */}
            <h2 className="text-foreground">Webhook Events</h2>
            <p className="text-muted-foreground leading-relaxed">
              Webhooks allow CallTone to push real-time notifications to your
              server when specific events occur. Instead of polling the API for
              updates, you register a webhook URL and CallTone sends an HTTP
              POST request to that URL whenever an event fires.
            </p>

            <h3 className="text-foreground">Configuring Webhooks</h3>
            <p className="text-muted-foreground leading-relaxed">
              To set up a webhook, go to{" "}
              <strong>Settings &gt; Webhooks</strong> and click{" "}
              <strong>Add Webhook</strong>. Provide:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>URL</strong> &mdash; the HTTPS endpoint on your server
                that will receive the webhook payloads.
              </li>
              <li>
                <strong>Events</strong> &mdash; select which event types you
                want to receive. You can subscribe to all events or pick
                specific ones.
              </li>
              <li>
                <strong>Secret</strong> &mdash; optionally provide a signing
                secret, or let CallTone generate one for you. This is used for
                signature verification.
              </li>
            </ul>

            <h3 className="text-foreground">Available Events</h3>
            <p className="text-muted-foreground leading-relaxed">
              CallTone currently supports the following webhook event types:
            </p>

            <h4 className="text-foreground">
              <code>call.started</code>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Fired when an outbound or inbound call begins. The payload
              includes the call ID, agent ID, contact information, campaign ID
              (if part of a campaign), phone numbers (from and to), and the
              timestamp when the call connected.
            </p>

            <h4 className="text-foreground">
              <code>call.ended</code>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Fired when a call completes, regardless of the outcome. This is
              the most data-rich event. The payload includes:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>Call ID, agent ID, and contact information.</li>
              <li>
                <strong>Duration</strong> &mdash; total call duration in
                seconds.
              </li>
              <li>
                <strong>Outcome</strong> &mdash; the agent-determined result
                (e.g., &quot;interested&quot;, &quot;not interested&quot;,
                &quot;voicemail&quot;, &quot;appointment booked&quot;,
                &quot;callback requested&quot;, &quot;dnc requested&quot;).
              </li>
              <li>
                <strong>Transcript</strong> &mdash; the full call transcript as
                an array of speaker-labeled turns.
              </li>
              <li>
                <strong>Summary</strong> &mdash; an AI-generated summary of the
                conversation.
              </li>
              <li>
                <strong>Sentiment</strong> &mdash; the overall sentiment score
                of the call (positive, neutral, negative).
              </li>
              <li>
                <strong>Recording URL</strong> &mdash; a signed URL to the call
                recording (if recording was enabled), valid for 24 hours.
              </li>
            </ul>

            <h4 className="text-foreground">
              <code>appointment.booked</code>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Fired when a voice agent successfully books an appointment during
              a call. The payload includes the appointment ID, contact
              information, scheduled date and time, duration, any notes
              captured by the agent, and the associated call ID.
            </p>

            <h4 className="text-foreground">
              <code>campaign.completed</code>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Fired when all contacts in a campaign have been called (or
              skipped due to DNC, invalid numbers, etc.) and the campaign
              status changes to &quot;completed&quot;. The payload includes the
              campaign ID, name, start and end timestamps, total contacts,
              calls made, calls completed, and a breakdown of outcomes.
            </p>

            <h4 className="text-foreground">
              <code>contact.updated</code>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Fired whenever a contact record is modified. This includes
              changes to contact fields (name, email, phone), lead score
              updates, consent status changes, and DNC additions. The payload
              includes the contact ID, the fields that changed (with old and
              new values), and the source of the change (e.g., &quot;api&quot;,
              &quot;dashboard&quot;, &quot;call_outcome&quot;).
            </p>

            {/* Webhook Payload Format */}
            <h2 className="text-foreground">Webhook Payload Format</h2>
            <p className="text-muted-foreground leading-relaxed">
              All webhook payloads are sent as JSON via HTTP POST. Every
              payload follows a consistent envelope structure:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`{
  "id": "evt_a1b2c3d4e5f6",
  "type": "call.ended",
  "created_at": "2026-02-13T14:30:00.000Z",
  "api_version": "v1",
  "data": {
    "call_id": "call_xyz789",
    "agent_id": "agent_abc123",
    "contact": {
      "id": "contact_def456",
      "name": "Jane Smith",
      "phone": "+12125551234",
      "email": "jane@example.com"
    },
    "campaign_id": "campaign_ghi789",
    "duration": 142,
    "outcome": "appointment_booked",
    "summary": "Discussed premium plan options. Jane was interested and booked a demo for Thursday at 2 PM.",
    "sentiment": "positive",
    "transcript": [
      { "speaker": "agent", "text": "Hello, this is an AI assistant calling on behalf of Acme Corp..." },
      { "speaker": "contact", "text": "Hi, yes I was expecting this call..." }
    ],
    "recording_url": "https://api.calltone.ai/v1/recordings/rec_abc123?token=signed_token"
  }
}`}
              </pre>
            </div>

            <h3 className="text-foreground">Envelope Fields</h3>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <code>id</code> &mdash; a unique identifier for this event,
                prefixed with <code>evt_</code>. Use this for deduplication.
              </li>
              <li>
                <code>type</code> &mdash; the event type (e.g.,
                &quot;call.ended&quot;, &quot;appointment.booked&quot;).
              </li>
              <li>
                <code>created_at</code> &mdash; ISO 8601 timestamp of when
                the event was generated.
              </li>
              <li>
                <code>api_version</code> &mdash; the API version used to
                generate the payload.
              </li>
              <li>
                <code>data</code> &mdash; the event-specific payload. The
                shape varies by event type as described above.
              </li>
            </ul>

            {/* Signature Verification */}
            <h2 className="text-foreground">Signature Verification</h2>
            <p className="text-muted-foreground leading-relaxed">
              To verify that a webhook request genuinely came from CallTone
              (and was not spoofed or tampered with), every webhook request
              includes a signature in the{" "}
              <code>X-CallTone-Signature</code> header. The signature is
              computed using HMAC-SHA256.
            </p>

            <h3 className="text-foreground">How It Works</h3>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                CallTone takes the raw JSON request body (as a UTF-8 string).
              </li>
              <li>
                It computes the HMAC-SHA256 of the body using your webhook
                signing secret as the key.
              </li>
              <li>
                The resulting hex digest is sent in the{" "}
                <code>X-CallTone-Signature</code> header.
              </li>
              <li>
                On your server, you compute the same HMAC-SHA256 and compare it
                to the header value. If they match, the request is authentic.
              </li>
            </ol>

            <h3 className="text-foreground">Verification Example (Node.js)</h3>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`import crypto from "crypto";

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// In your webhook handler:
app.post("/webhooks/calltone", (req, res) => {
  const signature = req.headers["x-calltone-signature"] as string;
  const rawBody = req.body; // must be the raw string, not parsed JSON

  if (!verifyWebhookSignature(rawBody, signature, process.env.CALLTONE_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);
  // Process the event...

  res.status(200).json({ received: true });
});`}
              </pre>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Important:</strong> Always use a constant-time comparison
              function (like <code>crypto.timingSafeEqual</code>) to compare
              signatures. Simple string equality (===) is vulnerable to timing
              attacks.
            </p>

            {/* Retry Policy */}
            <h2 className="text-foreground">Retry Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              CallTone expects your webhook endpoint to respond with a{" "}
              <code>2xx</code> status code within 10 seconds to acknowledge
              receipt. If your endpoint fails to respond, returns a non-2xx
              status code, or times out, CallTone will retry the delivery.
            </p>

            <h3 className="text-foreground">Retry Schedule</h3>
            <p className="text-muted-foreground leading-relaxed">
              CallTone uses exponential backoff with the following retry
              schedule:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Attempt 1</strong> &mdash; immediately (the initial
                delivery).
              </li>
              <li>
                <strong>Attempt 2</strong> &mdash; 1 minute after the first
                failure.
              </li>
              <li>
                <strong>Attempt 3</strong> &mdash; 5 minutes after the second
                failure.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              After 3 failed attempts, the delivery is marked as failed. You
              can view failed deliveries and manually retry them from the{" "}
              <strong>Settings &gt; Webhooks</strong> page. The event ID
              remains the same across retries, so use it for deduplication in
              case a delivery succeeds but the acknowledgment is lost.
            </p>

            <h3 className="text-foreground">Best Practices for Webhook Handlers</h3>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Respond quickly.</strong> Return a 200 response as soon
                as you receive the payload. Process the event asynchronously
                (e.g., push it to a queue) rather than performing slow
                operations in the request handler.
              </li>
              <li>
                <strong>Be idempotent.</strong> Use the event{" "}
                <code>id</code> field to deduplicate. If you receive the same
                event ID twice, skip processing the duplicate.
              </li>
              <li>
                <strong>Handle all event types gracefully.</strong> If you
                receive an event type you do not recognize, respond with 200
                and ignore it. This prevents failures when new event types are
                added.
              </li>
            </ul>

            {/* Integration Examples */}
            <h2 className="text-foreground">Integration Examples</h2>

            <h3 className="text-foreground">Zapier</h3>
            <p className="text-muted-foreground leading-relaxed">
              CallTone integrates with Zapier through webhooks. To connect:
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                Create a new Zap in Zapier and choose{" "}
                <strong>Webhooks by Zapier</strong> as the trigger.
              </li>
              <li>
                Select <strong>Catch Hook</strong> as the trigger event.
              </li>
              <li>
                Zapier will provide a webhook URL. Copy it.
              </li>
              <li>
                In CallTone, go to{" "}
                <strong>Settings &gt; Webhooks &gt; Add Webhook</strong> and
                paste the Zapier URL as the endpoint.
              </li>
              <li>
                Select the events you want to send to Zapier (e.g.,
                call.ended, appointment.booked).
              </li>
              <li>
                Back in Zapier, test the trigger by making a test call in
                CallTone. Once Zapier receives the sample payload, you can map
                fields to any of Zapier&apos;s 5,000+ app integrations.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              Common Zapier workflows include: sending appointment details to
              Google Calendar, creating deals in HubSpot when a call outcome is
              &quot;interested&quot;, or posting call summaries to a Slack
              channel.
            </p>

            <h3 className="text-foreground">Slack Notifications</h3>
            <p className="text-muted-foreground leading-relaxed">
              To receive real-time call notifications in Slack:
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                Create a Slack Incoming Webhook in your Slack workspace
                settings and note the webhook URL.
              </li>
              <li>
                Set up a lightweight webhook handler on your server (or use a
                serverless function) that receives CallTone webhooks and
                forwards a formatted message to the Slack webhook URL.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              Here is a Node.js example that posts call summaries to Slack:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`import express from "express";

const app = express();
app.use(express.text({ type: "application/json" }));

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;

app.post("/webhooks/calltone", async (req, res) => {
  // Verify signature first (see verification example above)

  const event = JSON.parse(req.body);

  if (event.type === "call.ended") {
    const { data } = event;
    const message = {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              "*Call Completed* :phone:",
              \`*Contact:* \${data.contact.name} (\${data.contact.phone})\`,
              \`*Duration:* \${Math.floor(data.duration / 60)}m \${data.duration % 60}s\`,
              \`*Outcome:* \${data.outcome}\`,
              \`*Summary:* \${data.summary}\`,
            ].join("\\n"),
          },
        },
      ],
    };

    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  }

  res.status(200).json({ received: true });
});

app.listen(3000);`}
              </pre>
            </div>

            <h3 className="text-foreground">CRM Sync</h3>
            <p className="text-muted-foreground leading-relaxed">
              Use the <code>call.ended</code> and{" "}
              <code>contact.updated</code> webhooks to keep your CRM in sync
              with CallTone. A typical integration works as follows:
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                When <code>call.ended</code> fires, look up the contact in
                your CRM by phone number or email.
              </li>
              <li>
                Create or update the contact record with the call outcome,
                summary, and any notes from the transcript.
              </li>
              <li>
                If the outcome is &quot;appointment_booked&quot;, create a
                corresponding calendar event or task in the CRM.
              </li>
              <li>
                If the outcome is &quot;interested&quot;, update the lead
                stage or score in the CRM to reflect the new status.
              </li>
              <li>
                Log the call as an activity on the contact record for your
                sales team to review.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              This pattern works with any CRM that has a REST API, including
              HubSpot, Salesforce, Pipedrive, and Close.
            </p>

            {/* Node.js Webhook Handler */}
            <h2 className="text-foreground">
              Complete Webhook Handler Example (Node.js)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Here is a complete example of a webhook handler that verifies
              signatures, processes events, and handles errors:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`import express from "express";
import crypto from "crypto";

const app = express();

// IMPORTANT: Use express.text() to get the raw body for signature verification
app.use(express.text({ type: "application/json" }));

const WEBHOOK_SECRET = process.env.CALLTONE_WEBHOOK_SECRET!;

function verifySignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// Track processed events for deduplication
const processedEvents = new Set<string>();

app.post("/webhooks/calltone", async (req, res) => {
  // 1. Verify the signature
  const signature = req.headers["x-calltone-signature"] as string;
  if (!signature || !verifySignature(req.body, signature)) {
    console.error("Webhook signature verification failed");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // 2. Parse the event
  const event = JSON.parse(req.body);

  // 3. Deduplicate
  if (processedEvents.has(event.id)) {
    return res.status(200).json({ received: true, deduplicated: true });
  }
  processedEvents.add(event.id);

  // 4. Respond immediately, then process asynchronously
  res.status(200).json({ received: true });

  // 5. Handle the event
  try {
    switch (event.type) {
      case "call.started":
        console.log(\`Call started: \${event.data.call_id}\`);
        // Update your system: mark contact as "in progress"
        break;

      case "call.ended":
        console.log(\`Call ended: \${event.data.call_id}, outcome: \${event.data.outcome}\`);
        // Sync to CRM, update lead score, notify team
        break;

      case "appointment.booked":
        console.log(\`Appointment booked: \${event.data.appointment_id}\`);
        // Create calendar event, send confirmation email
        break;

      case "campaign.completed":
        console.log(\`Campaign completed: \${event.data.campaign_id}\`);
        // Generate report, notify campaign manager
        break;

      case "contact.updated":
        console.log(\`Contact updated: \${event.data.contact_id}\`);
        // Sync changes to CRM
        break;

      default:
        console.log(\`Unhandled event type: \${event.type}\`);
    }
  } catch (error) {
    console.error(\`Error processing event \${event.id}:\`, error);
    // In production, send this to your error tracking service
  }
});

app.listen(3000, () => {
  console.log("Webhook handler listening on port 3000");
});`}
              </pre>
            </div>

            {/* Error Responses */}
            <h2 className="text-foreground">API Error Responses</h2>
            <p className="text-muted-foreground leading-relaxed">
              When an API request fails, the response includes a consistent
              error format:
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-4 not-prose my-4 overflow-x-auto">
              <pre className="text-sm text-foreground">
{`{
  "error": {
    "code": "invalid_request",
    "message": "The 'phone' field must be in E.164 format (e.g., +12125551234).",
    "param": "phone",
    "status": 400
  }
}`}
              </pre>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Common error codes include:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <code>401 Unauthorized</code> &mdash; missing or invalid API
                key.
              </li>
              <li>
                <code>403 Forbidden</code> &mdash; the API key does not have
                permission for this action.
              </li>
              <li>
                <code>404 Not Found</code> &mdash; the requested resource does
                not exist.
              </li>
              <li>
                <code>422 Unprocessable Entity</code> &mdash; validation error
                in the request body.
              </li>
              <li>
                <code>429 Too Many Requests</code> &mdash; rate limit exceeded.
              </li>
              <li>
                <code>500 Internal Server Error</code> &mdash; an unexpected
                error on our end. Retry with exponential backoff.
              </li>
            </ul>

            {/* Next Steps */}
            <h2 className="text-foreground">Next Steps</h2>
            <p className="text-muted-foreground leading-relaxed">
              Explore related documentation:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <Link href="/docs/team" className="text-primary hover:underline">
                  Team Management
                </Link>{" "}
                &mdash; create and manage API keys, configure organization
                settings.
              </li>
              <li>
                <Link href="/docs/compliance" className="text-primary hover:underline">
                  Compliance
                </Link>{" "}
                &mdash; use the API to sync DNC lists and consent records.
              </li>
              <li>
                <Link href="/docs/agents" className="text-primary hover:underline">
                  Creating Agents
                </Link>{" "}
                &mdash; manage agents programmatically via the API.
              </li>
              <li>
                <Link href="/docs/campaigns" className="text-primary hover:underline">
                  Campaigns
                </Link>{" "}
                &mdash; launch and monitor campaigns through the API.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
