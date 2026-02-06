import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/constants/plans";

export default function PricingPage() {
  const plans = Object.values(PLANS);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {plans.filter(p => p.id !== "enterprise").map((plan) => {
              const isPopular = "popular" in plan && plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border bg-white p-8 shadow-sm ${
                    isPopular ? "border-primary ring-2 ring-primary" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-sm font-medium text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 h-12 text-sm text-gray-500">{plan.description}</p>

                    <div className="mt-6">
                      {plan.price !== null ? (
                        <div>
                          <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-gray-500">/month</span>
                        </div>
                      ) : (
                        <span className="text-2xl font-semibold text-gray-900">Custom</span>
                      )}
                    </div>

                    <Link href="/sign-up" className="mt-6 block">
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                      >
                        {plan.id === "free-trial" ? "Start Free Trial" : "Get Started"}
                      </Button>
                    </Link>
                  </div>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-green-500" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Enterprise Card */}
          <div className="mt-12 rounded-2xl bg-gray-900 p-8 text-white md:p-12">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
              <div>
                <h3 className="text-2xl font-bold">Enterprise</h3>
                <p className="mt-2 max-w-xl text-gray-300">
                  Custom solutions for large organizations. Get unlimited agents,
                  dedicated support, custom integrations, and SLAs tailored to your needs.
                </p>
                <ul className="mt-6 flex flex-wrap gap-4">
                  {PLANS.enterprise.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/contact">
                <Button size="lg" variant="secondary">
                  Contact Sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
            <FaqItem
              question="Can I switch plans anytime?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate your billing."
            />
            <FaqItem
              question="What happens if I exceed my minutes?"
              answer="Overage minutes are billed at $0.15/minute. You'll receive notifications before reaching your limit."
            />
            <FaqItem
              question="Do you offer annual billing?"
              answer="Yes, annual billing saves you 20%. Contact us to set up annual billing for your account."
            />
            <FaqItem
              question="What's included in the free trial?"
              answer="The free trial includes 1 AI agent, 100 minutes, and full access to all features for 14 days. No credit card required."
            />
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period."
            />
            <FaqItem
              question="Do you offer refunds?"
              answer="We offer a 14-day money-back guarantee for new subscriptions. Contact support for assistance."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="mt-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{question}</h3>
      <p className="mt-2 text-sm text-gray-600">{answer}</p>
    </div>
  );
}
