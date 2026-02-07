export const PLANS = {
  "free-trial": {
    id: "free-trial",
    name: "Free Trial",
    description: "Try CallTone AI free for 14 days",
    price: 0,
    priceId: null,
    agents: 1,
    minutesPerMonth: 100,
    phoneNumbers: 1,
    campaigns: 1,
    features: [
      "1 AI Agent",
      "100 minutes/month",
      "1 Phone Number",
      "Basic Analytics",
      "Email Support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo entrepreneurs and small teams",
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    agents: 1,
    minutesPerMonth: 500,
    phoneNumbers: 1,
    campaigns: 5,
    features: [
      "1 AI Agent",
      "500 minutes/month",
      "1 Phone Number",
      "5 Campaigns",
      "Basic Analytics",
      "Email Support",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing businesses",
    price: 299,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    agents: 3,
    minutesPerMonth: 2000,
    phoneNumbers: 3,
    campaigns: 20,
    features: [
      "3 AI Agents",
      "2,000 minutes/month",
      "3 Phone Numbers",
      "20 Campaigns",
      "Advanced Analytics",
      "CRM Integrations",
      "Priority Support",
    ],
    popular: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "For larger teams and high volume",
    price: 599,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    agents: 10,
    minutesPerMonth: 5000,
    phoneNumbers: 10,
    campaigns: -1, // Unlimited
    features: [
      "10 AI Agents",
      "5,000 minutes/month",
      "10 Phone Numbers",
      "Unlimited Campaigns",
      "Conversation Intelligence",
      "Custom Integrations",
      "Dedicated Success Manager",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price: null, // Custom pricing
    priceId: null,
    agents: -1, // Unlimited
    minutesPerMonth: -1, // Unlimited
    phoneNumbers: -1, // Unlimited
    campaigns: -1, // Unlimited
    features: [
      "Unlimited Agents",
      "Unlimited Minutes",
      "Unlimited Phone Numbers",
      "Unlimited Campaigns",
      "White-Label Option",
      "SSO/SAML",
      "Custom SLA",
      "24/7 Support",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export const OVERAGE_RATE_CENTS = 15; // $0.15 per minute overage
export const ADDITIONAL_PHONE_NUMBER_PRICE = 15; // $15/month per additional number

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] || PLANS["free-trial"];
}

export function canAddAgent(currentCount: number, planId: string): boolean {
  const plan = getPlan(planId);
  return plan.agents === -1 || currentCount < plan.agents;
}

export function canAddPhoneNumber(currentCount: number, planId: string): boolean {
  const plan = getPlan(planId);
  return plan.phoneNumbers === -1 || currentCount < plan.phoneNumbers;
}

export function canAddCampaign(currentCount: number, planId: string): boolean {
  const plan = getPlan(planId);
  return plan.campaigns === -1 || currentCount < plan.campaigns;
}

export function getRemainingMinutes(usedMinutes: number, planId: string): number {
  const plan = getPlan(planId);
  if (plan.minutesPerMonth === -1) return Infinity;
  return Math.max(0, plan.minutesPerMonth - usedMinutes);
}
