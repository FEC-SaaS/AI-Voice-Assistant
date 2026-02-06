import { type PlanId } from "@/constants/plans";

const PLAN_HIERARCHY: PlanId[] = [
  "free-trial",
  "starter",
  "professional",
  "business",
  "enterprise",
];

function getPlanLevel(planId: string): number {
  const index = PLAN_HIERARCHY.indexOf(planId as PlanId);
  return index === -1 ? 0 : index;
}

/**
 * Check if the plan allows hiding "Powered by VoxForge AI" branding.
 * Only business tier and above can hide powered-by.
 */
export function canHidePoweredBy(planId: string): boolean {
  return getPlanLevel(planId) >= getPlanLevel("business");
}
