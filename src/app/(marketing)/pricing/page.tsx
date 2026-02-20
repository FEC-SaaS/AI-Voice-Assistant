import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Zap } from "lucide-react";
import { PLANS, ANNUAL_DISCOUNT_PERCENT } from "@/constants/plans";

export const metadata: Metadata = {
  title: "Pricing | CallTone",
  description:
    "Simple, transparent pricing for AI voice agents. Monthly or annual billing. Start free, scale as you grow.",
};

async function getPlansWithLivePrices() {
  const plans = Object.values(PLANS).filter((p) => p.id !== "enterprise");
  if (!process.env.STRIPE_SECRET_KEY) return plans;
  try {
    const { getStripePrice } = await import("@/lib/stripe");
    const updated = await Promise.all(
      plans.map(async (plan) => {
        let price = plan.price as number | null;
        let annualPrice = ("annualPrice" in plan ? plan.annualPrice : null) as number | null;
        if (plan.priceId) {
          try { const sp = await getStripePrice(plan.priceId); price = Math.round(sp.unitAmount / 100); } catch { /* use hardcoded */ }
        }
        if ("annualPriceId" in plan && plan.annualPriceId) {
          try { const sp = await getStripePrice(plan.annualPriceId); annualPrice = Math.round(sp.unitAmount / 100 / 12); } catch { /* use hardcoded */ }
        }
        return { ...plan, price, annualPrice };
      })
    );
    return updated;
  } catch {
    return plans;
  }
}

const PLAN_COLORS: Record<string, { accent: string; glow: string; border: string }> = {
  "free-trial":   { accent: "#64748b", glow: "rgba(100,116,139,0.1)",  border: "rgba(100,116,139,0.2)" },
  starter:        { accent: "#10b981", glow: "rgba(16,185,129,0.1)",   border: "rgba(16,185,129,0.2)" },
  professional:   { accent: "#6366f1", glow: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.4)" },
  business:       { accent: "#f59e0b", glow: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)" },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ annual?: string }>;
}) {
  const { annual } = await searchParams;
  const isAnnual = annual === "1";
  const plans = await getPlansWithLivePrices();

  return (
    <div style={{ background: "#08080f", minHeight: "100vh", color: "#c8c8d8" }}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full blur-3xl"
            style={{ width: 700, height: 350, background: "rgba(99,102,241,0.1)" }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}>
            Pricing
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #d0d0f0 50%, #9090d0 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              lineHeight: 1.15,
            }}>
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed" style={{ color: "rgba(200,200,216,0.6)" }}>
            Start free. Scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Annual / Monthly toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Link href="/pricing"
              className="rounded-full px-5 py-2 text-sm font-medium transition-all"
              style={{
                background: !isAnnual ? "rgba(99,102,241,0.8)" : "transparent",
                color: !isAnnual ? "#ffffff" : "rgba(200,200,216,0.5)",
                boxShadow: !isAnnual ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
              }}>
              Monthly
            </Link>
            <Link href="/pricing?annual=1"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all"
              style={{
                background: isAnnual ? "rgba(99,102,241,0.8)" : "transparent",
                color: isAnnual ? "#ffffff" : "rgba(200,200,216,0.5)",
                boxShadow: isAnnual ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
              }}>
              Annual
              <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  background: isAnnual ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.15)",
                  color: "#34d399",
                }}>
                {ANNUAL_DISCOUNT_PERCENT}% off
              </span>
            </Link>
          </div>

          {isAnnual && (
            <p className="mt-3 text-xs" style={{ color: "rgba(200,200,216,0.4)" }}>
              Billed annually — save 2 months compared to monthly billing
            </p>
          )}
        </div>
      </div>

      {/* ── Plan Cards ───────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isPopular = "popular" in plan && plan.popular;
            const colors = PLAN_COLORS[plan.id] ?? { accent: "#10b981", glow: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" };
            const displayPrice = isAnnual && "annualPrice" in plan && plan.annualPrice
              ? plan.annualPrice
              : plan.price;

            return (
              <div key={plan.id}
                className="relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: isPopular
                    ? "linear-gradient(160deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.04) 100%)"
                    : "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
                  border: `1px solid ${colors.border}`,
                  boxShadow: isPopular
                    ? `0 4px 30px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : "0 2px 20px rgba(0,0,0,0.35)",
                }}>
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 2px 12px rgba(99,102,241,0.4)" }}>
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan name + price */}
                <div className="mb-6">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: colors.accent }}>
                    {plan.name}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(200,200,216,0.45)" }}>
                    {plan.description}
                  </p>
                  <div className="mt-5">
                    {displayPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-white">${displayPrice}</span>
                        <span className="text-sm" style={{ color: "rgba(200,200,216,0.5)" }}>
                          /mo{isAnnual && plan.id !== "free-trial" ? " billed annually" : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-white">Custom</span>
                    )}
                    {isAnnual && "annualPrice" in plan && plan.annualPrice && plan.price && (
                      <p className="mt-1 text-xs line-through" style={{ color: "rgba(200,200,216,0.3)" }}>
                        ${plan.price}/mo monthly
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Link href="/sign-up"
                  className="mb-7 block rounded-xl py-2.5 text-center text-sm font-semibold transition-all hover:opacity-90"
                  style={isPopular
                    ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }
                    : { background: "rgba(255,255,255,0.06)", border: `1px solid ${colors.border}`, color: "rgba(200,200,216,0.85)" }}>
                  {plan.id === "free-trial" ? "Start Free Trial" : "Get Started"}
                </Link>

                {/* Divider */}
                <div className="mb-5 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

                {/* Features */}
                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: colors.accent }} />
                      <span style={{ color: "rgba(200,200,216,0.7)" }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Enterprise Card */}
        <div className="mt-8 overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #0d0d22 0%, #12102e 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          <div className="flex flex-col items-start justify-between gap-8 p-8 md:flex-row md:items-center md:p-10">
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "#818cf8" }}>Enterprise</div>
              <h3 className="text-2xl font-bold text-white">Custom Solutions for Large Teams</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>
                Unlimited agents, white-label options, SSO/SAML, dedicated onboarding, and SLAs tailored to your organization.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                {PLANS.enterprise.features.slice(0, 5).map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(200,200,216,0.6)" }}>
                    <Check className="h-3 w-3 text-indigo-400" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <Link href="/contact"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { q: "Can I switch plans anytime?", a: "Yes — upgrade or downgrade at any time. Changes take effect immediately and billing is prorated." },
              { q: "What happens if I exceed my minutes?", a: "Overage minutes are billed per-minute at your plan's rate ($0.20/min on most plans, lower on Business). You receive alerts before reaching your limit." },
              { q: "Does annual billing really save money?", a: `Yes — annual billing saves you ${ANNUAL_DISCOUNT_PERCENT}% compared to paying month-to-month. That's equivalent to getting roughly 2 months free.` },
              { q: "What's included in the free trial?", a: "1 voice agent, 100 minutes, 1 phone number, and 1 campaign for 14 days. No credit card required." },
              { q: "Can I cancel anytime?", a: "Yes. Cancel at any time from your billing settings. You keep access until the end of your billing period." },
              { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee on new paid subscriptions. Contact support for assistance." },
            ].map(({ q, a }) => (
              <div key={q}
                className="rounded-xl p-6"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-semibold text-white">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl p-10 text-center"
          style={{
            background: "linear-gradient(135deg, #0d0d22 0%, #12102e 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ width: 400, height: 200, background: "rgba(99,102,241,0.18)" }} />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Start Your Free Trial Today</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: "rgba(200,200,216,0.55)" }}>
              No credit card required. Set up your first voice agent in under 30 minutes.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,200,216,0.8)" }}>
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
