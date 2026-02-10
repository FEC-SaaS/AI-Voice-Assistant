import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | CallTone AI",
  description: "Read the terms and conditions governing your use of the CallTone AI platform.",
};

export default function TermsOfServicePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Last updated: February 10, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                By accessing or using the CallTone AI platform and services (the &quot;Service&quot;),
                you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are using
                the Service on behalf of an organization, you represent that you have authority to bind
                that organization to these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone AI provides an AI-powered voice agent platform that enables businesses to
                create, deploy, and manage automated voice agents for inbound and outbound calling.
                The Service includes agent creation, phone number provisioning, campaign management,
                call analytics, appointment scheduling, and compliance tools.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. Account Registration</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You must create an account to use the Service. You agree to provide accurate, complete
                information and keep your account credentials secure. You are responsible for all
                activity that occurs under your account. Notify us immediately if you suspect
                unauthorized access.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Subscription and Billing</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The Service is offered under subscription plans with varying feature limits. You agree
                to pay all fees associated with your selected plan. Subscription fees are billed in
                advance on a monthly basis. Overage charges for minutes exceeding your plan allowance
                are billed at the end of each billing period.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>You may upgrade or downgrade your plan at any time. Changes take effect immediately.</li>
                <li>Refunds are available within 14 days of initial subscription purchase.</li>
                <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
                <li>Non-payment may result in suspension or termination of your account.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">5. Acceptable Use</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You agree to use the Service in compliance with all applicable laws and regulations.
                You must not:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Use the Service for illegal purposes or to harass, threaten, or defraud others</li>
                <li>Make calls in violation of the Telephone Consumer Protection Act (TCPA), the Telemarketing Sales Rule (TSR), or equivalent regulations in your jurisdiction</li>
                <li>Call numbers on the National Do-Not-Call Registry without proper consent</li>
                <li>Use the Service to distribute malware or engage in phishing</li>
                <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service</li>
                <li>Resell or sublicense the Service without written authorization</li>
                <li>Exceed rate limits or attempt to disrupt the Service&apos;s infrastructure</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">6. Compliance Obligations</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                While we provide compliance tools (DNC management, consent tracking, calling hours
                enforcement), you are ultimately responsible for ensuring your use of the Service
                complies with all applicable laws, including:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>TCPA and FCC regulations for telemarketing and automated calls</li>
                <li>State-specific two-party consent laws for call recording</li>
                <li>GDPR, CCPA, and other data protection regulations as applicable</li>
                <li>Industry-specific regulations (healthcare, financial services, etc.)</li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You agree to indemnify CallTone AI against any claims arising from non-compliant use
                of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">7. AI Disclosure</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You acknowledge that the Service uses artificial intelligence to conduct voice
                conversations. You are responsible for ensuring that call recipients are informed they
                are speaking with an AI agent, as required by applicable laws and regulations.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">8. Data Ownership</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You retain ownership of all data you upload to or generate through the Service,
                including contact lists, call recordings, transcriptions, and campaign data. You grant
                us a limited license to process this data solely for the purpose of providing the
                Service. We may use anonymized, aggregated data to improve the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">9. Intellectual Property</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The Service, including its design, features, and underlying technology, is owned by
                CallTone AI and protected by intellectual property laws. Your subscription grants you
                a limited, non-exclusive, non-transferable license to use the Service for your
                business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">10. Service Level</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled
                maintenance windows will be communicated in advance. We are not liable for downtime
                caused by third-party service providers, force majeure events, or your own equipment
                or network.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">11. Limitation of Liability</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CALLTONE AI SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS
                OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED
                THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">12. Termination</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Either party may terminate the agreement at any time. You may cancel your subscription
                through the dashboard settings. We may suspend or terminate your account for violation
                of these Terms with reasonable notice. Upon termination, your data will be retained
                for 30 days to allow export, after which it will be permanently deleted.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">13. Modifications</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We may modify these Terms at any time. Material changes will be communicated via email
                or in-app notification at least 30 days in advance. Continued use of the Service after
                changes take effect constitutes acceptance of the modified Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">14. Governing Law</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the State of California, without regard to
                conflict of law principles. Any disputes shall be resolved through binding arbitration
                in San Francisco, California, under the rules of the American Arbitration Association.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">15. Contact</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                For questions about these Terms, contact us at:
              </p>
              <p className="mt-2 text-muted-foreground">
                Email: legal@calltone.ai
                <br />
                CallTone AI
                <br />
                San Francisco, CA
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
