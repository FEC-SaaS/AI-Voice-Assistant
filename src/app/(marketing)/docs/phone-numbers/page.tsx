import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Phone Number Documentation | CallTone",
  description:
    "Learn how to provision, import, and manage phone numbers for your CallTone voice agents.",
};

export default function PhoneNumbersDocsPage() {
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
            Phone Numbers
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Provision local numbers from the CallTone pool or import your existing
            Twilio numbers to power your voice agents.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Why You Need a Phone Number */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Why You Need a Phone Number
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Every voice agent needs at least one phone number to make or receive
                calls. The phone number serves as the agent&apos;s identity on the
                telephone network &mdash; it is the number that appears on the
                recipient&apos;s caller ID for outbound calls and the number people
                dial to reach your agent for inbound calls.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can assign multiple agents to different numbers, or use the same
                number for multiple purposes (for example, outbound campaigns during
                business hours and an AI receptionist after hours). Phone numbers are
                managed at the organization level and can be reassigned between agents
                at any time.
              </p>
            </div>

            {/* Getting a Number from the CallTone Pool */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Getting a Number from the CallTone Pool
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The fastest way to get started is to provision a number from the CallTone
                pool. These are US local numbers that are pre-registered and ready for
                immediate use.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To provision a number, navigate to{" "}
                <strong className="text-foreground">Dashboard &gt; Phone Numbers</strong> and
                click <strong className="text-foreground">Get a Number</strong>. You can
                search by area code or state to find a number local to your business or
                your target audience. Select a number and click{" "}
                <strong className="text-foreground">Provision</strong> to add it to your
                account.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Key benefits of CallTone pool numbers:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Instant activation</strong> &mdash; Numbers are
                  ready to use within seconds. No waiting for carrier provisioning or registration.
                </li>
                <li>
                  <strong className="text-foreground">A2P 10DLC pre-registered</strong> &mdash; All
                  pool numbers are pre-registered for Application-to-Person (A2P) messaging under the
                  10DLC framework, ensuring reliable SMS delivery for appointment confirmations,
                  missed call text-backs, and other automated messages.
                </li>
                <li>
                  <strong className="text-foreground">Voice and SMS capable</strong> &mdash; Every
                  number supports both voice calls and SMS messaging out of the box.
                </li>
                <li>
                  <strong className="text-foreground">STIR/SHAKEN verified</strong> &mdash; Numbers
                  carry attestation to reduce the likelihood of calls being flagged as spam by
                  carrier networks.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Pool numbers are included in your subscription at no additional per-number
                cost. The number of phone numbers you can provision depends on your plan
                tier (Starter: 1, Growth: 5, Business: 25, Enterprise: unlimited).
              </p>
            </div>

            {/* Importing from Twilio */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Importing a Number from Twilio
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                If you already own phone numbers through Twilio, you can import them
                into CallTone to use with your voice agents. This lets you keep your
                existing numbers and caller ID reputation.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To import a Twilio number:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  Go to{" "}
                  <strong className="text-foreground">Dashboard &gt; Phone Numbers</strong> and
                  click <strong className="text-foreground">Import from Twilio</strong>.
                </li>
                <li>
                  Enter your Twilio <strong className="text-foreground">Account SID</strong> and{" "}
                  <strong className="text-foreground">Auth Token</strong>. These are found on your
                  Twilio Console dashboard. CallTone uses these credentials to fetch your number
                  inventory and configure call routing.
                </li>
                <li>
                  CallTone will display a list of phone numbers on your Twilio account. Select the
                  number(s) you want to import.
                </li>
                <li>
                  Click <strong className="text-foreground">Import</strong>. CallTone will configure
                  the Twilio number&apos;s voice webhook to route incoming calls through CallTone.
                  Your Twilio account continues to own the number; CallTone simply handles the call
                  routing.
                </li>
              </ol>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Imported numbers continue to be billed through your Twilio account. CallTone
                does not charge additional fees for imported numbers, but standard per-minute
                call charges from your CallTone plan still apply.
              </p>
            </div>

            {/* Assigning Numbers to Agents */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Assigning Numbers to Agents
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After provisioning or importing a number, you need to assign it to a
                voice agent. A number must be assigned to an agent for inbound calls to
                be answered. For outbound calls and campaigns, you select the number
                during campaign setup.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To assign a number:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Go to <strong className="text-foreground">Dashboard &gt; Phone Numbers</strong>,
                  find the number, and click <strong className="text-foreground">Assign Agent</strong>.
                  Select the agent from the dropdown.
                </li>
                <li>
                  Alternatively, go to the agent&apos;s settings page and assign a phone number in
                  the <strong className="text-foreground">Phone Number</strong> section.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A single phone number can only be assigned to one agent at a time for
                inbound call routing. However, multiple agents can use the same number
                for outbound calls within different campaigns.
              </p>
            </div>

            {/* Caller ID Configuration */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Caller ID Configuration (CNAM)
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CNAM (Calling Name) is the name that appears on the recipient&apos;s
                phone when they receive a call from your number. Setting a professional
                CNAM increases the likelihood that recipients answer the call.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To configure CNAM, go to{" "}
                <strong className="text-foreground">Dashboard &gt; Phone Numbers</strong>,
                click on the number, and enter a display name in the{" "}
                <strong className="text-foreground">Caller ID Name</strong> field.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  CNAM is limited to <strong className="text-foreground">15 characters maximum</strong>,
                  including spaces. Choose a concise business name or abbreviation.
                </li>
                <li>
                  CNAM updates can take 24&ndash;72 hours to propagate across all carrier networks.
                  The name may not appear immediately or consistently on all devices.
                </li>
                <li>
                  Not all carriers display CNAM. Mobile carriers in particular may not show the
                  caller name, only the number.
                </li>
                <li>
                  Use your real business name. Misleading CNAM values may violate FCC regulations
                  and could result in your number being flagged as spam.
                </li>
              </ul>
            </div>

            {/* A2P 10DLC Compliance */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                A2P 10DLC Compliance
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                A2P 10DLC (Application-to-Person 10-Digit Long Code) is a regulatory
                framework required by US carriers for businesses sending SMS messages
                from local phone numbers. Non-compliant messages may be blocked or
                filtered by carriers.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone simplifies A2P compliance:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Pool numbers are pre-registered</strong> &mdash;
                  Phone numbers from the CallTone pool are already registered under CallTone&apos;s
                  approved A2P brand and campaign. You can start sending SMS (appointment reminders,
                  missed call text-backs) immediately without additional registration steps.
                </li>
                <li>
                  <strong className="text-foreground">Twilio-imported numbers</strong> &mdash; If you
                  import a Twilio number, SMS messages are sent through your Twilio account using your
                  existing A2P registration. Ensure your Twilio number is registered for A2P messaging
                  in your Twilio Console.
                </li>
                <li>
                  <strong className="text-foreground">Message throughput</strong> &mdash; A2P 10DLC
                  provides higher SMS throughput (typically 75&ndash;300 messages per second) compared
                  to unregistered numbers, ensuring your appointment confirmations and notifications
                  are delivered promptly.
                </li>
              </ul>
            </div>

            {/* Releasing Numbers */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Releasing Numbers
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                If you no longer need a phone number, you can release it back to the pool:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  Ensure the number is not assigned to any active agent or campaign. If it is,
                  unassign it first.
                </li>
                <li>
                  Go to <strong className="text-foreground">Dashboard &gt; Phone Numbers</strong>,
                  click the number, and select{" "}
                  <strong className="text-foreground">Release Number</strong>.
                </li>
                <li>
                  Confirm the release. The number will be removed from your account immediately.
                </li>
              </ol>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Released pool numbers are returned to the CallTone inventory and may be
                provisioned by another customer. You cannot guarantee you will get the
                same number back if you release it. For Twilio-imported numbers, releasing
                removes the CallTone webhook configuration but does not delete the number
                from your Twilio account.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Call history and recordings associated with a released number are retained
                in your account for your configured data retention period. Releasing a
                number does not delete any historical data.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
