import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | CallTone",
  description: "Learn how CallTone collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Privacy Policy
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
              <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to
                protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our AI voice agent platform, website, and
                related services (collectively, the &quot;Service&quot;).
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
              <h3 className="mt-4 text-lg font-medium text-foreground">2.1 Account Information</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                When you create an account, we collect your name, email address, organization name,
                and billing information. This information is necessary to provide and manage your
                account.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">2.2 Call Data</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Our Service processes voice calls on your behalf. This includes call recordings,
                transcriptions, call metadata (duration, timestamps, phone numbers), and AI-generated
                analyses (sentiment, lead scores, summaries). Call data is stored securely and
                associated with your organization account.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">2.3 Contact Information</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                You may upload contact lists containing names, phone numbers, email addresses, and
                other business information. This data is used solely to facilitate calls and campaigns
                on your behalf.
              </p>

              <h3 className="mt-4 text-lg font-medium text-foreground">2.4 Usage Data</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                We automatically collect information about how you interact with the Service,
                including pages visited, features used, and performance metrics. This helps us improve
                the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process calls and campaigns on your behalf</li>
                <li>Generate AI-powered call analyses and insights</li>
                <li>Process payments and manage your subscription</li>
                <li>Send transactional communications (confirmations, alerts, reminders)</li>
                <li>Monitor and enforce compliance with applicable calling regulations</li>
                <li>Detect and prevent fraud, abuse, and security incidents</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">4. Data Sharing</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We do not sell your personal information. We share data only with:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Service providers</strong> — Third-party vendors
                  that help us operate the Service (e.g., cloud hosting, payment processing, voice
                  telephony, email delivery).
                </li>
                <li>
                  <strong className="text-foreground">AI providers</strong> — Voice synthesis and
                  language model providers that process call content to deliver the Service.
                </li>
                <li>
                  <strong className="text-foreground">Legal requirements</strong> — When required by
                  law, regulation, or legal process.
                </li>
                <li>
                  <strong className="text-foreground">Business transfers</strong> — In connection with
                  a merger, acquisition, or sale of assets.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">5. Data Retention</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide the
                Service. Call recordings and transcriptions are retained according to your
                organization&apos;s configured retention policy. You may request deletion of your data
                at any time by contacting us.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">6. Data Security</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We implement industry-standard security measures including encryption in transit
                (TLS 1.2+), encryption at rest, access controls, and regular security audits. While
                no system is 100% secure, we take reasonable precautions to protect your data.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">7. TCPA Compliance</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Our Service includes built-in compliance tools for the Telephone Consumer Protection
                Act (TCPA), including Do-Not-Call (DNC) list management, consent tracking, calling
                hours enforcement, and opt-out handling. You are responsible for ensuring your use of
                the Service complies with all applicable laws and regulations.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">8. Your Rights</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Depending on your jurisdiction, you may have the right to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability — receive your data in a structured format</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To exercise these rights, contact us at privacy@calltone.ai.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">9. Cookies and Tracking</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We use essential cookies for authentication and session management. We use analytics
                tools to understand how the Service is used. You can control cookie preferences
                through your browser settings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">10. Changes to This Policy</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by posting the updated policy on this page and updating the &quot;Last
                updated&quot; date. Your continued use of the Service after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">11. Contact Us</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy, contact us at:
              </p>
              <p className="mt-2 text-muted-foreground">
                Email: privacy@calltone.ai
                <br />
                CallTone
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
