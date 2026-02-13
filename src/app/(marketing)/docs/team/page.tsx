import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Team Management | CallTone Docs",
  description:
    "Learn how to invite team members, assign roles, manage permissions, configure organization settings, and handle API keys in CallTone.",
};

export default function TeamManagementDocsPage() {
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
            Team Management
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Collaborate with your team by inviting members, assigning roles, and
            configuring organization-wide settings. CallTone makes it easy to
            manage who has access to what.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-4xl">
            {/* Roles & Permissions */}
            <h2 className="text-foreground">Roles &amp; Permissions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every member of your CallTone organization is assigned one of
              three roles. Roles determine what a member can see and do across
              the platform. You can change a member&apos;s role at any time from
              the Team settings page.
            </p>

            <h3 className="text-foreground">Owner</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Owner is the person who created the organization. There is
              exactly one Owner per organization. The Owner has unrestricted
              access to every feature in CallTone, including:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Full platform access</strong> &mdash; create, edit, and
                delete agents, campaigns, contacts, phone numbers, and
                appointments.
              </li>
              <li>
                <strong>Billing management</strong> &mdash; view invoices,
                change subscription plans, update payment methods, and manage
                usage-based add-ons.
              </li>
              <li>
                <strong>Team management</strong> &mdash; invite new members,
                change roles, and remove members from the organization.
              </li>
              <li>
                <strong>Organization settings</strong> &mdash; update the
                organization name, website, timezone, calling hours, and
                disclosure message.
              </li>
              <li>
                <strong>Branding &amp; white-label</strong> &mdash; upload
                logos, set brand colors, and toggle white-label mode.
              </li>
              <li>
                <strong>API key management</strong> &mdash; create and revoke
                API keys for integrations and webhooks.
              </li>
              <li>
                <strong>Delete organization</strong> &mdash; permanently delete
                the organization and all associated data. This action is
                irreversible.
              </li>
            </ul>

            <h3 className="text-foreground">Admin</h3>
            <p className="text-muted-foreground leading-relaxed">
              Admins have broad access to day-to-day operations without the
              ability to manage billing or delete the organization. This is the
              ideal role for team leads and managers. Admins can:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                Create, edit, and delete voice agents with full configuration
                control over prompts, voices, and behaviors.
              </li>
              <li>
                Launch and manage calling campaigns, including scheduling,
                contact list management, and campaign analytics.
              </li>
              <li>
                Invite new team members and change the roles of existing
                members (but cannot remove the Owner or change the Owner role).
              </li>
              <li>
                Configure organization settings such as timezone, calling
                hours, and disclosure messages.
              </li>
              <li>
                Manage compliance settings including DNC lists, consent
                tracking, and audit log access.
              </li>
              <li>
                Create and revoke API keys for use in integrations.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Admins <strong>cannot</strong> access billing pages, change
              subscription plans, or delete the organization.
            </p>

            <h3 className="text-foreground">Member</h3>
            <p className="text-muted-foreground leading-relaxed">
              Members have operational access to the platform. They can use
              agents and campaigns but cannot change settings or manage the
              team. This role is suited for individual contributors, sales
              reps, and support staff. Members can:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                View all voice agents and use them to make or receive calls.
              </li>
              <li>
                View campaigns, their progress, and analytics.
              </li>
              <li>
                Access the live call dashboard to monitor active calls.
              </li>
              <li>
                View contacts, call history, and appointment schedules.
              </li>
              <li>
                Access analytics dashboards, lead scores, and conversation
                intelligence insights.
              </li>
              <li>
                Use the missed call text-back dashboard to review and manage
                missed calls.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Members <strong>cannot</strong> create or edit agents, launch
              campaigns, invite team members, change roles, access billing,
              modify organization settings, or manage API keys.
            </p>

            {/* Permissions Table */}
            <h3 className="text-foreground">Permissions at a Glance</h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="text-foreground">Capability</th>
                    <th className="text-foreground">Owner</th>
                    <th className="text-foreground">Admin</th>
                    <th className="text-foreground">Member</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td>View agents &amp; campaigns</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <td>Create/edit agents</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Launch campaigns</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Manage contacts</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>View analytics</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <td>Invite team members</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Change member roles</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Manage API keys</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Organization settings</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Billing &amp; subscription</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Delete organization</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inviting Team Members */}
            <h2 className="text-foreground">Inviting Team Members</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can invite new people to your organization from the{" "}
              <strong>Settings &gt; Team</strong> page. The invitation flow
              works as follows:
            </p>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                Navigate to <strong>Settings &gt; Team</strong> in your
                dashboard.
              </li>
              <li>
                Click the <strong>Invite Member</strong> button in the top
                right corner.
              </li>
              <li>
                Enter the email address of the person you want to invite and
                select the role you would like to assign (Admin or Member).
              </li>
              <li>
                Click <strong>Send Invitation</strong>. The invitee will
                receive an email with a link to join your organization.
              </li>
              <li>
                When the invitee clicks the link, they will be prompted to
                create a CallTone account (or sign in to an existing one). Once
                authenticated, they are automatically added to your
                organization with the assigned role.
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              Pending invitations appear in the team list with a
              &quot;Pending&quot; badge. You can resend or revoke an invitation
              at any time before it is accepted. Invitations expire after 7
              days. If an invitation expires, you can simply send a new one.
            </p>

            {/* Managing Members */}
            <h2 className="text-foreground">Managing Members</h2>
            <p className="text-muted-foreground leading-relaxed">
              Once someone has joined your organization, you can manage their
              access from the same <strong>Settings &gt; Team</strong> page.
            </p>

            <h3 className="text-foreground">Changing Roles</h3>
            <p className="text-muted-foreground leading-relaxed">
              To change a member&apos;s role, click the three-dot menu next to
              their name and select <strong>Change Role</strong>. Choose the new
              role from the dropdown and confirm. The change takes effect
              immediately. Note that you cannot change the Owner role &mdash;
              ownership transfer is handled separately through{" "}
              <strong>Settings &gt; Organization &gt; Transfer Ownership</strong>.
            </p>

            <h3 className="text-foreground">Removing Members</h3>
            <p className="text-muted-foreground leading-relaxed">
              To remove a member, click the three-dot menu and select{" "}
              <strong>Remove Member</strong>. You will be asked to confirm the
              action. Once removed, the member immediately loses access to the
              organization. Any API keys they created will remain active until
              explicitly revoked. It is a best practice to revoke any API keys
              associated with a removed member.
            </p>

            {/* Organization Settings */}
            <h2 className="text-foreground">Organization Settings</h2>
            <p className="text-muted-foreground leading-relaxed">
              Organization settings apply to your entire account and affect how
              your voice agents behave. You can configure these under{" "}
              <strong>Settings &gt; Organization</strong>.
            </p>

            <h3 className="text-foreground">General Settings</h3>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Organization Name</strong> &mdash; the display name
                used across the platform and in notifications sent to your
                team.
              </li>
              <li>
                <strong>Website</strong> &mdash; your company website URL.
                This is displayed in outbound communications and can be
                referenced by your voice agents during calls.
              </li>
              <li>
                <strong>Timezone</strong> &mdash; the default timezone for your
                organization. All scheduling, calling hour enforcement, and
                analytics timestamps use this timezone. Individual campaigns
                can override this if needed.
              </li>
              <li>
                <strong>Calling Hours</strong> &mdash; the window during which
                your agents are allowed to make outbound calls. The default is
                8:00 AM to 9:00 PM in your organization&apos;s timezone, which
                aligns with TCPA requirements. You can narrow this window but
                cannot expand it beyond the legal limits.
              </li>
              <li>
                <strong>Disclosure Message</strong> &mdash; the message your
                voice agent speaks at the beginning of each call to comply with
                AI disclosure regulations. A sensible default is provided, but
                you can customize it to match your brand voice. Example:
                &quot;Hi, this is an AI assistant calling on behalf of [Your
                Company]. This call may be recorded for quality purposes.&quot;
              </li>
            </ul>

            <h3 className="text-foreground">Branding Settings</h3>
            <p className="text-muted-foreground leading-relaxed">
              CallTone supports full white-label branding so the platform looks
              and feels like your own product. Configure these under{" "}
              <strong>Settings &gt; Branding</strong>:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Logo</strong> &mdash; upload your company logo (PNG,
                SVG, or JPEG, max 2 MB). This appears in the dashboard
                navigation, emails, and the appointment portal.
              </li>
              <li>
                <strong>Favicon</strong> &mdash; upload a favicon (ICO or PNG,
                max 256 KB) for the browser tab icon.
              </li>
              <li>
                <strong>Brand Colors</strong> &mdash; set a primary color and
                an accent color. These are applied throughout the dashboard UI,
                email templates, and the self-service appointment portal.
              </li>
              <li>
                <strong>White-Label Toggle</strong> &mdash; when enabled, all
                CallTone branding is removed from customer-facing pages
                (appointment portals, email notifications, and SMS messages).
                Your logo and brand colors are used exclusively. This feature
                is available on the Pro plan and above.
              </li>
            </ul>

            {/* API Key Management */}
            <h2 className="text-foreground">API Key Management</h2>
            <p className="text-muted-foreground leading-relaxed">
              API keys are used to authenticate requests to the CallTone REST
              API and to verify webhook signatures. You can manage them under{" "}
              <strong>Settings &gt; API Keys</strong>.
            </p>

            <h3 className="text-foreground">Creating an API Key</h3>
            <ol className="text-muted-foreground leading-relaxed">
              <li>
                Go to <strong>Settings &gt; API Keys</strong> and click{" "}
                <strong>Create API Key</strong>.
              </li>
              <li>
                Give the key a descriptive name (e.g., &quot;CRM
                Integration&quot; or &quot;Zapier Webhook&quot;) so you can
                identify its purpose later.
              </li>
              <li>
                The key is displayed once after creation. Copy it immediately
                and store it in a secure location such as a password manager or
                secrets vault. You will not be able to see the full key again.
              </li>
            </ol>

            <h3 className="text-foreground">Revoking an API Key</h3>
            <p className="text-muted-foreground leading-relaxed">
              If a key is compromised or no longer needed, click the{" "}
              <strong>Revoke</strong> button next to the key. This immediately
              invalidates the key. Any integrations or webhooks using that key
              will stop working until they are updated with a new key.
            </p>

            <h3 className="text-foreground">Security Best Practices</h3>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <strong>Never expose API keys in client-side code.</strong>{" "}
                Only use them in server-side applications, backend services, or
                environment variables.
              </li>
              <li>
                <strong>Use one key per integration.</strong> This way, if a
                key is compromised, you can revoke it without affecting other
                integrations.
              </li>
              <li>
                <strong>Rotate keys periodically.</strong> Create a new key,
                update your integration, then revoke the old key.
              </li>
              <li>
                <strong>Audit key usage.</strong> The audit log records every
                API request made with each key, so you can monitor for
                unauthorized access.
              </li>
              <li>
                <strong>Revoke keys when team members leave.</strong> If a
                member who created or had access to API keys leaves your
                organization, revoke and regenerate those keys.
              </li>
            </ul>

            {/* Next Steps */}
            <h2 className="text-foreground">Next Steps</h2>
            <p className="text-muted-foreground leading-relaxed">
              Now that your team is set up, explore these related topics:
            </p>
            <ul className="text-muted-foreground leading-relaxed">
              <li>
                <Link href="/docs/compliance" className="text-primary hover:underline">
                  Compliance
                </Link>{" "}
                &mdash; configure DNC lists, consent tracking, and calling hour
                enforcement.
              </li>
              <li>
                <Link href="/docs/webhooks" className="text-primary hover:underline">
                  Webhooks &amp; Integrations
                </Link>{" "}
                &mdash; connect CallTone to your CRM and other tools using API
                keys.
              </li>
              <li>
                <Link href="/docs/agents" className="text-primary hover:underline">
                  Creating Agents
                </Link>{" "}
                &mdash; build your first voice agent and start making calls.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
