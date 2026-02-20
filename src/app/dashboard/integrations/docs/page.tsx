"use client";

import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const sections: Record<string, { title: string; content: React.ReactNode }> = {
  overview: {
    title: "Overview",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          CalltTone integrations fall into three categories:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">How It Works</th>
                <th className="text-left p-3 font-medium">Examples</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Voice Agent Tools</td>
                <td className="p-3 text-muted-foreground">
                  Your voice agent can use these tools <em>during</em> a live
                  call (e.g., book an appointment, look up a contact)
                </td>
                <td className="p-3">GHL, Google Calendar, Make, MCP</td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Event Notifications</td>
                <td className="p-3 text-muted-foreground">
                  CalltTone sends real-time notifications when events happen
                  (calls start/end, transcripts ready)
                </td>
                <td className="p-3">Slack, Webhooks, Zapier</td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">CRM Sync</td>
                <td className="p-3 text-muted-foreground">
                  Call data and contacts are automatically synced to your CRM
                  after each call
                </td>
                <td className="p-3">HubSpot, Salesforce</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground">
          When you connect an integration, CalltTone automatically adds the
          relevant capabilities to all your voice agents. No per-agent
          configuration needed.
        </p>
      </div>
    ),
  },
  ghl: {
    title: "GoHighLevel (GHL)",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            CRM / Calendar
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Your voice agents can manage contacts and book appointments directly
          in your GoHighLevel calendar during live calls.
        </p>
        <h4 className="font-medium mt-4">Capabilities</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Tool</th>
                <th className="text-left p-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Get Contact</td>
                <td className="p-3 text-muted-foreground">
                  Look up an existing contact by email or phone to avoid
                  duplicates
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Create Contact</td>
                <td className="p-3 text-muted-foreground">
                  Create a new lead/client with name, email, and phone
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Check Availability</td>
                <td className="p-3 text-muted-foreground">
                  Query your GHL calendar for open appointment slots
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Book Appointment</td>
                <td className="p-3 text-muted-foreground">
                  Schedule an event in your GHL calendar, linked to a contact
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>GoHighLevel</strong> under CRM
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>
            You&apos;ll be redirected to GoHighLevel to authorize CalltTone
          </li>
          <li>Select the location you want to connect</li>
          <li>Grant the requested permissions (Contacts, Calendars)</li>
          <li>
            You&apos;ll be redirected back to CalltTone with a success message
          </li>
        </ol>
        <h4 className="font-medium mt-4">How It Works During Calls</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Caller asks to book</strong>: Agent checks availability in
            your GHL calendar
          </li>
          <li>
            <strong>Agent finds open slot</strong>: Presents options to the
            caller
          </li>
          <li>
            <strong>Caller confirms</strong>: Agent creates the contact (if new)
            and books the appointment
          </li>
          <li>
            <strong>Confirmation</strong>: Both the caller and your team receive
            confirmation
          </li>
        </ol>
      </div>
    ),
  },
  google_calendar: {
    title: "Google Calendar",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
            Calendar
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Your voice agents can schedule events and check availability on Google
          Calendar during live calls.
        </p>
        <h4 className="font-medium mt-4">Capabilities</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Tool</th>
                <th className="text-left p-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Check Availability</td>
                <td className="p-3 text-muted-foreground">
                  Verify if a time slot is open on any Google Calendar
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Create Event</td>
                <td className="p-3 text-muted-foreground">
                  Schedule a new event with title, time, attendees, and timezone
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Google Calendar</strong> under Calendar
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>Sign in with your Google account</li>
          <li>Grant access to Google Calendar</li>
          <li>
            You&apos;ll be redirected back with a success message
          </li>
        </ol>
        <h4 className="font-medium mt-4">Notes</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Works with your primary calendar by default</li>
          <li>Supports timezone-aware scheduling across regions</li>
          <li>All events use ISO 8601 datetime format</li>
          <li>
            If you already use CalltTone&apos;s built-in appointment system,
            Google Calendar events are created in addition to CalltTone
            appointments
          </li>
        </ul>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm">Environment Variables</h4>
          <pre className="text-xs mt-2 bg-background p-3 rounded border overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret`}
          </pre>
        </div>
      </div>
    ),
  },
  google_sheets: {
    title: "Google Sheets",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Automation
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Automatically log call data, lead information, and appointment details
          to a Google Sheet.
        </p>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Google Sheets</strong> under Automation
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>
            Grant access to Google Sheets (if you already connected Google
            Calendar, permissions may already be granted)
          </li>
        </ol>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm">Environment Variables</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Same as Google Calendar:
          </p>
          <pre className="text-xs mt-2 bg-background p-3 rounded border overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret`}
          </pre>
        </div>
      </div>
    ),
  },
  make: {
    title: "Make (Integromat)",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Automation
          </span>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
            Webhook URL
          </span>
        </div>
        <p className="text-muted-foreground">
          Trigger automated Make scenarios during voice calls. Connect to 1,000+
          apps through Make&apos;s visual workflow builder.
        </p>
        <h4 className="font-medium mt-4">Capabilities</h4>
        <p className="text-sm text-muted-foreground">
          Your voice agent can trigger a Make scenario mid-call, passing
          conversation data to your workflow. This enables:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Creating records in any app Make supports</li>
          <li>Sending emails/SMS through Make</li>
          <li>Updating databases, CRMs, or project management tools</li>
          <li>Running multi-step automations</li>
        </ul>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            In Make, create a new scenario with a <strong>Webhook</strong>{" "}
            trigger
          </li>
          <li>Copy the webhook URL Make provides</li>
          <li>
            In CalltTone, navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Make</strong> under Automation
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>Paste your Make webhook URL</li>
          <li>
            Click <strong>Connect</strong>
          </li>
        </ol>
        <h4 className="font-medium mt-4">Example Use Cases</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>After qualifying a lead</strong>: Agent triggers Make to
            create a deal in Pipedrive + send a Slack message + add to an email
            sequence
          </li>
          <li>
            <strong>Appointment booked</strong>: Agent triggers Make to create a
            Zoom link + send calendar invite + update your CRM
          </li>
          <li>
            <strong>Support escalation</strong>: Agent triggers Make to create a
            Zendesk ticket + page the on-call team
          </li>
        </ul>
      </div>
    ),
  },
  slack: {
    title: "Slack",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded">
            Communication
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Get real-time call notifications in your Slack channels.
        </p>
        <h4 className="font-medium mt-4">Notifications Sent</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Call Started</td>
                <td className="p-3 text-muted-foreground">
                  &quot;Call received/started with [Agent Name]&quot;
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Call Ended</td>
                <td className="p-3 text-muted-foreground">
                  &quot;Call ended (duration) - status | Sentiment:
                  positive/neutral/negative&quot; with call summary
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Slack</strong> under Communication
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>Select the Slack workspace and channel for notifications</li>
          <li>Authorize CalltTone</li>
        </ol>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm">Environment Variables</h4>
          <pre className="text-xs mt-2 bg-background p-3 rounded border overflow-x-auto">
{`SLACK_CLIENT_ID=your_slack_app_client_id
SLACK_CLIENT_SECRET=your_slack_app_client_secret`}
          </pre>
        </div>
      </div>
    ),
  },
  zapier: {
    title: "Zapier",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Automation
          </span>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
            Webhook URL
          </span>
        </div>
        <p className="text-muted-foreground">
          Connect CalltTone to 8,000+ apps with automated Zaps triggered by call
          events.
        </p>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            In Zapier, create a new Zap with{" "}
            <strong>Webhooks by Zapier</strong> as the trigger
          </li>
          <li>
            Choose <strong>Catch Hook</strong> as the trigger event
          </li>
          <li>Copy the webhook URL Zapier provides</li>
          <li>
            In CalltTone, navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Zapier</strong> under Automation
          </li>
          <li>
            Click <strong>Connect</strong> and paste the webhook URL
          </li>
        </ol>
        <h4 className="font-medium mt-4">Difference from Make</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <strong>Make</strong>: Agent triggers scenarios <em>during</em>{" "}
            calls (real-time, mid-conversation)
          </li>
          <li>
            <strong>Zapier</strong>: CalltTone sends event data <em>after</em>{" "}
            events happen (call ended, transcript ready, etc.)
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          You can use both simultaneously for different purposes.
        </p>
      </div>
    ),
  },
  hubspot: {
    title: "HubSpot",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            CRM
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Automatically sync contacts and log call activities to HubSpot CRM
          after each call.
        </p>
        <h4 className="font-medium mt-4">What Gets Synced</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Direction</th>
                <th className="text-left p-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Call Activity</td>
                <td className="p-3 text-muted-foreground">
                  CalltTone → HubSpot
                </td>
                <td className="p-3 text-muted-foreground">
                  After call analysis completes
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Contact Creation</td>
                <td className="p-3 text-muted-foreground">
                  CalltTone → HubSpot
                </td>
                <td className="p-3 text-muted-foreground">
                  When a new lead is captured
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>HubSpot</strong> under CRM
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>Authorize CalltTone in HubSpot</li>
          <li>Grant permissions for Contacts and Deals</li>
        </ol>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm">Environment Variables</h4>
          <pre className="text-xs mt-2 bg-background p-3 rounded border overflow-x-auto">
{`HUBSPOT_CLIENT_ID=your_hubspot_app_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_app_client_secret`}
          </pre>
        </div>
      </div>
    ),
  },
  salesforce: {
    title: "Salesforce",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            CRM
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            OAuth 2.0
          </span>
        </div>
        <p className="text-muted-foreground">
          Automatically create leads and log call tasks in Salesforce after each
          call.
        </p>
        <h4 className="font-medium mt-4">What Gets Synced</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Direction</th>
                <th className="text-left p-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium">Task (Call Log)</td>
                <td className="p-3 text-muted-foreground">
                  CalltTone → Salesforce
                </td>
                <td className="p-3 text-muted-foreground">
                  After call analysis completes
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium">Lead Creation</td>
                <td className="p-3 text-muted-foreground">
                  CalltTone → Salesforce
                </td>
                <td className="p-3 text-muted-foreground">
                  When a new lead is captured
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>Salesforce</strong> under CRM
          </li>
          <li>
            Click <strong>Connect</strong>
          </li>
          <li>Log in to Salesforce and authorize CalltTone</li>
        </ol>
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm">Environment Variables</h4>
          <pre className="text-xs mt-2 bg-background p-3 rounded border overflow-x-auto">
{`SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
SALESFORCE_LOGIN_URL=https://login.salesforce.com`}
          </pre>
        </div>
      </div>
    ),
  },
  mcp: {
    title: "MCP Server",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Automation
          </span>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
            Server URL
          </span>
        </div>
        <p className="text-muted-foreground">
          Connect any MCP (Model Context Protocol) compatible service to your
          voice agents for dynamic tool discovery.
        </p>
        <h4 className="font-medium mt-4">How It Works</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            When a call starts, CalltTone connects to your MCP server
          </li>
          <li>The server responds with a list of available tools</li>
          <li>
            These tools become available to the voice agent for that call
          </li>
          <li>
            If the agent needs a tool, CalltTone routes the request to your MCP
            server
          </li>
        </ol>
        <p className="text-sm text-muted-foreground mt-2">
          This is the most flexible integration — you can build custom tools
          that your voice agents use during calls without modifying CalltTone.
        </p>
        <h4 className="font-medium mt-4">Setup</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            Deploy an MCP-compatible server (see{" "}
            <a
              href="https://modelcontextprotocol.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              MCP Specification
            </a>
            )
          </li>
          <li>
            In CalltTone, navigate to <strong>Dashboard &gt; Integrations</strong>
          </li>
          <li>
            Find <strong>MCP Server</strong> under Automation
          </li>
          <li>
            Click <strong>Connect</strong> and enter your MCP server URL
          </li>
          <li>
            Your agents will now discover and use tools from your server
          </li>
        </ol>
        <h4 className="font-medium mt-4">Use Cases</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Custom database lookups during calls</li>
          <li>Proprietary business logic execution</li>
          <li>Integration with internal APIs</li>
          <li>Dynamic pricing or inventory checks</li>
        </ul>
      </div>
    ),
  },
  webhooks: {
    title: "Outbound Webhooks",
    content: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
            Developer
          </span>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
            HMAC-SHA256
          </span>
        </div>
        <p className="text-muted-foreground">
          Receive real-time HTTP POST notifications when events happen in
          CalltTone.
        </p>
        <h4 className="font-medium mt-4">Available Events</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["call.started", "A call begins (inbound or outbound)"],
                [
                  "call.ended",
                  "A call completes, with duration, status, and summary",
                ],
                ["call.failed", "A call failed to connect"],
                ["transcript.ready", "Full transcript is available"],
                [
                  "analysis.complete",
                  "AI analysis finished (sentiment, lead score, key points)",
                ],
              ].map(([event, desc]) => (
                <tr key={event} className="border-t">
                  <td className="p-3 font-mono text-xs">{event}</td>
                  <td className="p-3 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Payload Format</h4>
        <p className="text-sm text-muted-foreground">
          All webhooks are sent as POST requests with these headers:
        </p>
        <pre className="text-xs bg-muted/50 p-3 rounded border overflow-x-auto">
{`Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 hex digest>
X-Webhook-Timestamp: <Unix timestamp>
X-Webhook-Event: <event name>`}
        </pre>
        <h4 className="font-medium mt-4">Verifying Signatures</h4>
        <pre className="text-xs bg-muted/50 p-3 rounded border overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}`}
        </pre>
        <h4 className="font-medium mt-4">Limits</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Maximum 5 webhook endpoints per organization</li>
          <li>10-second delivery timeout</li>
          <li>Delivery logs available for debugging</li>
        </ul>
      </div>
    ),
  },
  "rest-api": {
    title: "REST API",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          CalltTone provides a full REST API for building custom integrations.
        </p>
        <h4 className="font-medium mt-4">Available Endpoints</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Endpoint</th>
                <th className="text-left p-3 font-medium">Methods</th>
                <th className="text-left p-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["/api/v1/agents", "GET, POST", "Manage voice agents"],
                ["/api/v1/calls", "GET", "Query call history"],
                ["/api/v1/campaigns", "GET, POST", "Manage campaigns"],
                ["/api/v1/appointments", "GET, POST", "Manage appointments"],
                [
                  "/api/v1/appointments/available-slots",
                  "GET",
                  "Check availability",
                ],
              ].map(([endpoint, methods, desc]) => (
                <tr key={endpoint} className="border-t">
                  <td className="p-3 font-mono text-xs">{endpoint}</td>
                  <td className="p-3">{methods}</td>
                  <td className="p-3 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="font-medium mt-4">Authentication</h4>
        <p className="text-sm text-muted-foreground">
          All API requests require an API key in the Authorization header:
        </p>
        <pre className="text-xs bg-muted/50 p-3 rounded border overflow-x-auto">
{`Authorization: Bearer vxf_your_api_key_here`}
        </pre>
        <p className="text-sm text-muted-foreground mt-2">
          Manage API keys at{" "}
          <Link
            href="/dashboard/settings"
            className="text-primary underline"
          >
            Dashboard &gt; Settings &gt; API Keys
          </Link>
          .
        </p>
      </div>
    ),
  },
  troubleshooting: {
    title: "Troubleshooting",
    content: (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium">Issue</th>
                <th className="text-left p-3 font-medium">Solution</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "OAuth redirect fails",
                  "Verify your redirect URI matches: https://your-domain.com/api/integrations/callback",
                ],
                [
                  'Integration shows "Error"',
                  "Click Disconnect, then Connect again to re-authorize",
                ],
                [
                  "Webhook deliveries failing",
                  "Check the delivery logs — verify your endpoint is publicly accessible and returns 2xx",
                ],
                [
                  "Tools not appearing in calls",
                  "After connecting an integration, re-sync your agents (Agents > Edit > Save)",
                ],
                [
                  "Plan upgrade required",
                  "Integrations require Professional plan or higher. For dev testing, set BYPASS_PLAN_CHECK=true",
                ],
              ].map(([issue, solution]) => (
                <tr key={issue} className="border-t">
                  <td className="p-3 font-medium">{issue}</td>
                  <td className="p-3 text-muted-foreground">{solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
};

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "ghl", label: "GoHighLevel" },
  { id: "google_calendar", label: "Google Calendar" },
  { id: "google_sheets", label: "Google Sheets" },
  { id: "make", label: "Make" },
  { id: "slack", label: "Slack" },
  { id: "zapier", label: "Zapier" },
  { id: "hubspot", label: "HubSpot" },
  { id: "salesforce", label: "Salesforce" },
  { id: "mcp", label: "MCP Server" },
  { id: "webhooks", label: "Webhooks" },
  { id: "rest-api", label: "REST API" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

export default function IntegrationDocsPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (section && sectionRefs.current[section]) {
      sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth" });
    }
  }, [section]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/integrations"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Integrations
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Integration Docs</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Connect CalltTone with your favorite business tools to automate
          workflows, sync data, and extend your voice agents&apos; capabilities.
        </p>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-8 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    sectionRefs.current[item.id]?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                  className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                    section === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-10">
            {Object.entries(sections).map(([id, { title, content }]) => (
              <div
                key={id}
                id={id}
                ref={(el) => {
                  sectionRefs.current[id] = el;
                }}
                className="scroll-mt-8"
              >
                <div className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    {title}
                    <a
                      href={`#${id}`}
                      className="text-muted-foreground hover:text-foreground opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </h2>
                  {content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
