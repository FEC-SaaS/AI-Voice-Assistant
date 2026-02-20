export const ANNUAL_DISCOUNT_PERCENT = 17; // ~17% off (2 months free)

export const PLANS = {
  "free-trial": {
    id: "free-trial",
    name: "Free Trial",
    description: "Try CallTone free for 14 days — no credit card required",
    price: 0,
    priceId: null,
    annualPrice: null,
    annualPriceId: null,
    agents: 1,
    minutesPerMonth: 100,
    phoneNumbers: 1,
    campaigns: 1,
    overageRateCents: 0, // Trial users are blocked at limit, not billed
    features: [
      "1 Voice Agent",
      "100 Minutes / Month",
      "1 Phone Number",
      "1 Campaign",
      "Appointment Scheduling",
      "Basic Analytics",
      "Email Support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo entrepreneurs and small teams",
    price: 49,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    annualPrice: 41, // $490/yr ÷ 12 ≈ $40.83 → $41/mo
    annualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    agents: 1,
    minutesPerMonth: 150,
    phoneNumbers: 1,
    campaigns: 5,
    overageRateCents: 20, // $0.20/min
    features: [
      "1 Voice Agent",
      "150 Minutes / Month",
      "1 Phone Number",
      "5 Campaigns",
      "Appointment Scheduling",
      "Two-Way SMS Messaging",
      "Basic Analytics & Reports",
      "Email Support",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing businesses ready to scale",
    price: 149,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    annualPrice: 124, // $1,490/yr ÷ 12 ≈ $124.17 → $124/mo
    annualPriceId: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
    agents: 3,
    minutesPerMonth: 500,
    phoneNumbers: 3,
    campaigns: 20,
    overageRateCents: 20, // $0.20/min
    features: [
      "3 Voice Agents",
      "500 Minutes / Month",
      "3 Phone Numbers",
      "20 Campaigns",
      "AI Receptionist",
      "Missed Call Text-Back",
      "Appointment Scheduling + Reminders",
      "Advanced Analytics",
      "Smart Lead Scoring",
      "Conversation Intelligence",
      "CRM Integrations (HubSpot, Salesforce)",
      "Compliance Dashboard",
      "Priority Support",
    ],
    popular: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "For larger teams and high call volume",
    price: 249,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    annualPrice: 208, // $2,490/yr ÷ 12 ≈ $207.50 → $208/mo
    annualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
    agents: 10,
    minutesPerMonth: 1200,
    phoneNumbers: 10,
    campaigns: -1, // Unlimited
    overageRateCents: 18, // $0.18/min (volume discount)
    features: [
      "10 Voice Agents",
      "1,200 Minutes / Month",
      "10 Phone Numbers",
      "Unlimited Campaigns",
      "Everything in Professional",
      "Real-time Call Monitoring",
      "Supervisor Controls (Barge-in, Whisper)",
      "REST API + Webhooks",
      "Custom Integrations",
      "Dedicated Success Manager",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations — ask about our Custom Pilot Program",
    price: null, // Fetched live from Stripe if STRIPE_ENTERPRISE_PRICE_ID is set
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? null,
    annualPrice: null,
    annualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ?? null,
    agents: -1, // Unlimited
    minutesPerMonth: -1, // Unlimited
    phoneNumbers: -1, // Unlimited
    campaigns: -1, // Unlimited
    overageRateCents: 15, // $0.15/min (negotiated bulk rate)
    features: [
      "Unlimited Agents",
      "Unlimited Minutes",
      "Unlimited Phone Numbers",
      "Unlimited Campaigns",
      "Everything in Business",
      "White-Label Option",
      "SSO / SAML",
      "Custom SLA",
      "Onboarding Specialist",
      "24/7 Phone Support",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export const ADDITIONAL_PHONE_NUMBER_PRICE = 15; // $15/month per additional number

/** Returns the overage rate in cents for a given plan. */
export function getOverageRateCents(planId: string): number {
  const plan = PLANS[planId as PlanId];
  return plan?.overageRateCents ?? 20; // default to $0.20 if unknown plan
}

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] || PLANS["free-trial"];
}

export function canAddAgent(currentCount: number, planId: string): boolean {
  if (process.env.BYPASS_PLAN_CHECK === "true") return true;
  const plan = getPlan(planId);
  return plan.agents === -1 || currentCount < plan.agents;
}

export function canAddPhoneNumber(currentCount: number, planId: string): boolean {
  if (process.env.BYPASS_PLAN_CHECK === "true") return true;
  const plan = getPlan(planId);
  return plan.phoneNumbers === -1 || currentCount < plan.phoneNumbers;
}

export function canAddCampaign(currentCount: number, planId: string): boolean {
  if (process.env.BYPASS_PLAN_CHECK === "true") return true;
  const plan = getPlan(planId);
  return plan.campaigns === -1 || currentCount < plan.campaigns;
}

export function getRemainingMinutes(usedMinutes: number, planId: string): number {
  const plan = getPlan(planId);
  if (plan.minutesPerMonth === -1) return Infinity;
  return Math.max(0, plan.minutesPerMonth - usedMinutes);
}

/** Returns true if the given email domain is a known disposable/throwaway provider. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwam.com","yopmail.com",
  "sharklasers.com","guerrillamailblock.com","grr.la","guerrillamail.info",
  "spam4.me","trashmail.com","trashmail.me","trashmail.net","dispostable.com",
  "maildrop.cc","spamgourmet.com","mytrashmail.com","fakeinbox.com","mailnull.com",
  "spamspot.com","spamgourmet.org","spamgourmet.net","10minutemail.com",
  "10minutemail.net","tempr.email","discard.email","spamevader.com","getairmail.com",
  "filzmail.com","throwam.com","mailexpire.com","spamevader.com","tempinbox.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
