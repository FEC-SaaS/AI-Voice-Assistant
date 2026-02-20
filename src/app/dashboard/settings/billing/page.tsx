"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Zap,
  FileText,
  Download,
  Receipt,
  Shield,
  Wallet,
  ArrowRight,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PLANS, ANNUAL_DISCOUNT_PERCENT } from "@/constants/plans";

// ── Feature comparison matrix definition ───────────────────────────────
const COMPARISON_FEATURES: Array<
  | { type: "value"; label: string; key: "agents" | "minutesPerMonth" | "phoneNumbers" | "campaigns" }
  | { type: "check"; label: string; plans: string[] }
> = [
  { type: "value", label: "Voice Agents", key: "agents" },
  { type: "value", label: "Minutes / Month", key: "minutesPerMonth" },
  { type: "value", label: "Phone Numbers", key: "phoneNumbers" },
  { type: "value", label: "Campaigns", key: "campaigns" },
  { type: "check", label: "Advanced Analytics", plans: ["professional", "business", "enterprise"] },
  { type: "check", label: "CRM Integrations", plans: ["professional", "business", "enterprise"] },
  { type: "check", label: "Priority Support", plans: ["professional", "business", "enterprise"] },
  { type: "check", label: "Conversation Intelligence", plans: ["business", "enterprise"] },
  { type: "check", label: "Dedicated Success Manager", plans: ["business", "enterprise"] },
  { type: "check", label: "White-Label / SSO", plans: ["enterprise"] },
];

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : value.toLocaleString();
}

// ── Usage Bar ──────────────────────────────────────────────────────────
function UsageBar({
  used,
  limit,
  label,
  alertThreshold = 80,
  burnRate,
}: {
  used: number;
  limit: number;
  label: string;
  alertThreshold?: number;
  burnRate?: { daysUntilLimit: number | null; avgMinutesPerDay: number };
}) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;
  const isNearLimit = percentage >= alertThreshold;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-primary"
          }`}
          style={{ width: `${isUnlimited ? 0 : percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Limit reached — upgrade to continue
        </p>
      )}
      {!isAtLimit && isNearLimit && (
        <p className="text-xs text-yellow-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {Math.round(percentage)}% used — approaching your limit
        </p>
      )}
      {burnRate && !isUnlimited && burnRate.daysUntilLimit !== null && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {burnRate.avgMinutesPerDay > 0
            ? burnRate.daysUntilLimit === 0
              ? "Limit already reached this period"
              : `~${burnRate.avgMinutesPerDay} min/day · limit in ${burnRate.daysUntilLimit} day${burnRate.daysUntilLimit === 1 ? "" : "s"}`
            : "No usage recorded yet this period"}
        </p>
      )}
    </div>
  );
}

// ── Card brand icon helper ─────────────────────────────────────────────
function PaymentMethodIcon({ type, brand }: { type: string; brand?: string }) {
  if (type === "paypal") return <Wallet className="h-5 w-5 text-blue-400" />;
  if (type === "link") return <Zap className="h-5 w-5 text-green-400" />;
  const brandColors: Record<string, string> = {
    visa: "text-blue-400",
    mastercard: "text-orange-400",
    amex: "text-blue-500",
  };
  return <CreditCard className={`h-5 w-5 ${brandColors[brand || ""] || "text-muted-foreground"}`} />;
}

function formatPaymentMethod(m: {
  type: string;
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  paypal: { payerEmail: string | null } | null;
}) {
  if (m.type === "card" && m.card) {
    return `${m.card.brand.charAt(0).toUpperCase()}${m.card.brand.slice(1)} ending in ${m.card.last4}`;
  }
  if (m.type === "paypal" && m.paypal) return `PayPal (${m.paypal.payerEmail || "connected"})`;
  if (m.type === "link") return "Stripe Link";
  return m.type.charAt(0).toUpperCase() + m.type.slice(1);
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function BillingPage() {
  const searchParams = useSearchParams();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const { data: subscription, isLoading: loadingSub } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: loadingUsage, refetch: refetchUsage } = trpc.billing.getUsage.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: paymentMethods } = trpc.billing.getPaymentMethods.useQuery();
  const { data: billingHistory } = trpc.billing.getBillingHistory.useQuery();
  const { data: upcomingInvoice } = trpc.billing.getUpcomingInvoice.useQuery();

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUpgrading(false);
      setShowCompareDialog(false);
    },
  });

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error) => toast.error(error.message),
  });

  const setAlertThreshold = trpc.billing.setUsageAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Alert threshold saved");
      refetchUsage();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription updated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled");
    }
  }, [searchParams]);

  const handlePlanClick = (planId: string) => {
    if (planId === currentPlan?.id) return;
    setSelectedPlanId(planId);
    setShowCompareDialog(true);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlanId) return;
    setIsUpgrading(true);

    // Check if the selected plan has an annual priceId when annual is requested
    const plan = PLANS[selectedPlanId as keyof typeof PLANS];
    const wantsAnnual = billingPeriod === "annual";
    const hasAnnualPrice = wantsAnnual && "annualPriceId" in plan && plan.annualPriceId;

    if (wantsAnnual && !hasAnnualPrice) {
      toast.info("Annual billing coming soon — proceeding with monthly billing.");
    }

    createCheckout.mutate({
      planId: selectedPlanId,
      billing: wantsAnnual && hasAnnualPrice ? "annual" : "monthly",
    });
  };

  const handleManageBilling = () => createPortal.mutate();

  if (loadingSub || loadingUsage) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const isPaidPlan = currentPlan?.id !== "free-trial";
  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  // Usage alert: show banner when minutes % exceeds threshold
  const minutesPct =
    usage && usage.minutes.limit !== -1
      ? (usage.minutes.used / usage.minutes.limit) * 100
      : 0;
  const showUsageAlert =
    usage && usage.minutes.limit !== -1 && minutesPct >= (usage.alertThreshold ?? 80);

  return (
    <div className="space-y-8">
      {/* ── Payment Failure Banner ───────────────────────────────────── */}
      {subscription?.paymentFailed && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Payment Failed</p>
              <p className="text-sm text-red-300 mt-0.5">
                Your last payment was declined. Update your payment method to avoid service
                interruption.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={handleManageBilling}
            disabled={createPortal.isPending}
          >
            {createPortal.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Update Payment Method
          </Button>
        </div>
      )}

      {/* ── Usage Alert Banner ───────────────────────────────────────── */}
      {showUsageAlert && !subscription?.paymentFailed && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <Bell className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-400">Usage Alert</p>
            <p className="text-sm text-yellow-300 mt-0.5">
              You have used{" "}
              <strong>
                {Math.round(minutesPct)}% of your {usage?.minutes.limit?.toLocaleString()}{" "}
                monthly minutes
              </strong>
              . Consider upgrading before you hit your limit.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => document.getElementById("plan-select")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Plans
          </Button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
          <p className="text-muted-foreground">Manage your subscription, payment methods, and usage</p>
        </div>
        {isPaidPlan && (
          <Button variant="outline" onClick={handleManageBilling} disabled={createPortal.isPending}>
            {createPortal.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Manage Billing
          </Button>
        )}
      </div>

      {/* ── Current Plan + Usage ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{currentPlan?.name}</h3>
                <p className="text-sm text-muted-foreground">{currentPlan?.description}</p>
              </div>
              <div className="text-right">
                {currentPlan?.price !== null ? (
                  <p className="text-3xl font-bold text-foreground">
                    ${currentPlan?.price}
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground">Custom pricing</p>
                )}
              </div>
            </div>
            {subscription?.subscription && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={subscription.subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.subscription.status}
                </Badge>
                {subscription.subscription.cancelAtPeriodEnd && (
                  <Badge variant="destructive">
                    Cancels {subscription.subscription.currentPeriodEnd.toLocaleDateString()}
                  </Badge>
                )}
              </div>
            )}
            {currentPlan?.features && currentPlan.features.length > 0 && (
              <ul className="space-y-1.5 pt-1 border-t border-border/50">
                {currentPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            {!isPaidPlan && (
              <p className="text-sm text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Upgrade to unlock all features and higher limits
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <CardDescription>This billing period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5">
              {usage && (
                <>
                  <UsageBar
                    used={usage.agents.used}
                    limit={usage.agents.limit}
                    label="Voice Agents"
                    alertThreshold={usage.alertThreshold}
                  />
                  <UsageBar
                    used={usage.phoneNumbers.used}
                    limit={usage.phoneNumbers.limit}
                    label="Phone Numbers"
                    alertThreshold={usage.alertThreshold}
                  />
                  <UsageBar
                    used={usage.campaigns.used}
                    limit={usage.campaigns.limit}
                    label="Campaigns"
                    alertThreshold={usage.alertThreshold}
                  />
                  <UsageBar
                    used={usage.minutes.used}
                    limit={usage.minutes.limit}
                    label="Minutes Used"
                    alertThreshold={usage.alertThreshold}
                    burnRate={{
                      daysUntilLimit: usage.burnRate.daysUntilLimit,
                      avgMinutesPerDay: usage.burnRate.avgMinutesPerDay,
                    }}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Usage Alert Settings ─────────────────────────────────────── */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Usage Alert Threshold
          </CardTitle>
          <CardDescription>
            Show an in-app warning when minutes usage reaches this percentage of your monthly limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={String(usage?.alertThreshold ?? 80)}
              onValueChange={(v) => setAlertThreshold.mutate({ threshold: Number(v) })}
              disabled={setAlertThreshold.isPending}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[50, 60, 70, 75, 80, 85, 90, 95].map((pct) => (
                  <SelectItem key={pct} value={String(pct)}>
                    {pct}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">of monthly minutes</p>
            {setAlertThreshold.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Usage bars turn yellow at this threshold. Overage charges apply at{" "}
            <strong>$0.20/minute</strong> after the limit is reached.
          </p>
        </CardContent>
      </Card>

      {/* ── Overage Tracker ─────────────────────────────────────────── */}
      {usage && usage.overage.minutes > 0 && (
        <Card className="border-border bg-orange-500/10 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/40">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-400 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-400">Overage Charges This Period</h3>
                <p className="text-sm text-orange-400 mt-1">
                  You have used{" "}
                  <strong>{usage.overage.minutes.toLocaleString()} minutes</strong> over your plan
                  limit. Current overage charges:{" "}
                  <strong>${(usage.overage.costCents / 100).toFixed(2)}</strong> at $
                  {(usage.overage.ratePerMinuteCents / 100).toFixed(2)}/minute.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Upcoming Invoice ─────────────────────────────────────────── */}
      {upcomingInvoice && (
        <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Upcoming Invoice
            </CardTitle>
            <CardDescription>
              Next billing date: {upcomingInvoice.periodEnd?.toLocaleDateString() || "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingInvoice.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{line.description}</span>
                  <span className="font-medium">${line.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex items-center justify-between font-semibold">
                <span>Total Due</span>
                <span>${upcomingInvoice.amountDue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Plan Selection ───────────────────────────────────────────── */}
      <div id="plan-select">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Choose a Plan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select a plan to see a full feature comparison before checkout.
            </p>
          </div>

          {/* Monthly / Annual toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1 text-sm">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-md px-4 py-1.5 font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 font-medium transition-all ${
                billingPeriod === "annual"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                Save {ANNUAL_DISCOUNT_PERCENT}%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans?.filter((plan) => plan.id !== "free-trial").map((plan) => {
            const isCurrentPlan = plan.id === currentPlan?.id;
            const isPopular = "popular" in plan && plan.popular;
            const displayPrice =
              billingPeriod === "annual" && plan.annualPrice != null
                ? plan.annualPrice
                : plan.price;
            const isUpgrade =
              displayPrice !== null &&
              currentPlan?.price !== null &&
              (displayPrice ?? 0) > (currentPlan?.price ?? 0);

            return (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all duration-200 ${
                  isPopular ? "border-primary shadow-md shadow-primary/20" : ""
                } ${
                  isCurrentPlan
                    ? "bg-secondary cursor-default"
                    : "hover:shadow-xl hover:shadow-primary/10 hover:border-primary/60 hover:-translate-y-1"
                }`}
                onClick={() => !isCurrentPlan && plan.priceId && handlePlanClick(plan.id)}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrentPlan && (
                      <Badge variant="outline" className="ml-2">
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {displayPrice !== null ? (
                      <div>
                        <p className="text-3xl font-bold">
                          ${displayPrice}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        {billingPeriod === "annual" && plan.annualPrice != null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${(plan.annualPrice * 12).toLocaleString()}/yr · billed annually
                          </p>
                        )}
                        {billingPeriod === "annual" && plan.price && plan.annualPrice == null && (
                          <p className="text-xs text-muted-foreground mt-0.5">Annual pricing coming soon</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xl font-semibold text-muted-foreground">Contact Us</p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button variant="outline" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : plan.priceId ? (
                      <Button className="w-full" variant="outline">
                        {isUpgrade ? "Upgrade" : "Switch Plan"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <a href="mailto:sales@calltone.ai">Contact Sales</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Payment Methods + Billing History ────────────────────────── */}
      <Tabs defaultValue="payment-methods">
        <TabsList>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing-history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-methods" className="mt-4">
          <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Cards, Apple Pay, and Google Pay are accepted at checkout
                  </CardDescription>
                </div>
                {isPaidPlan && (
                  <Button variant="outline" size="sm" onClick={handleManageBilling}>
                    Manage
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!paymentMethods || paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground/70 mb-3" />
                  <p className="font-medium">No payment methods on file</p>
                  <p className="text-sm mt-1">
                    A payment method will be added when you subscribe to a plan
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground/70">
                    <span>Visa</span>
                    <span>Mastercard</span>
                    <span>Amex</span>
                    <span>Apple Pay</span>
                    <span>Google Pay</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <PaymentMethodIcon type={method.type} brand={method.card?.brand} />
                        <div>
                          <p className="font-medium text-sm">{formatPaymentMethod(method)}</p>
                          {method.card && (
                            <p className="text-xs text-muted-foreground">
                              Expires {method.card.expMonth}/{method.card.expYear}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground/70">
                <Shield className="h-3.5 w-3.5" />
                Payments are securely processed by Stripe. We never store your card details.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing-history" className="mt-4">
          <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>Your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              {!billingHistory || billingHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/70 mb-3" />
                  <p className="font-medium">No billing history yet</p>
                  <p className="text-sm mt-1">Invoices will appear here after your first payment</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingHistory.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="text-sm">
                          {new Date(invoice.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {invoice.number || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          ${invoice.amount.toFixed(2)} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === "paid"
                                ? "default"
                                : invoice.status === "open"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.hostedUrl && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {invoice.pdfUrl && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Overage Info ─────────────────────────────────────────────── */}
      <Card className="bg-blue-500/10 border-border transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <FileText className="h-6 w-6 text-blue-400 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-400">About Overage Charges</h3>
              <p className="text-sm text-blue-400">
                If you exceed your monthly minute limit, additional minutes are billed at{" "}
                <strong>$0.20/minute</strong>. Overage is tracked automatically and included in your
                next invoice as a metered line item via Stripe.
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Shield className="h-3.5 w-3.5" />
                Accepted payment methods: Visa, Mastercard, Amex, Apple Pay, Google Pay
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Plan Comparison Dialog ───────────────────────────────────── */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Plans</DialogTitle>
            <DialogDescription>
              Review the full feature matrix before switching to{" "}
              <strong>{selectedPlan?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {plans && (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-44">
                      Feature
                    </th>
                    {plans.map((plan) => {
                      const isCurrent = plan.id === currentPlan?.id;
                      const isSelected = plan.id === selectedPlanId;
                      const displayPrice =
                        billingPeriod === "annual" && plan.annualPrice != null
                          ? plan.annualPrice
                          : plan.price;
                      return (
                        <th
                          key={plan.id}
                          className={`text-center py-3 px-3 rounded-t-lg ${
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : isCurrent
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          <div className="font-semibold">{plan.name}</div>
                          <div className="font-normal text-xs mt-0.5">
                            {displayPrice !== null ? (
                              <>
                                ${displayPrice}/mo
                                {billingPeriod === "annual" && plan.annualPrice != null && (
                                  <span className="block text-green-400">Annual</span>
                                )}
                              </>
                            ) : (
                              "Custom"
                            )}
                          </div>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Current
                            </Badge>
                          )}
                          {isSelected && !isCurrent && (
                            <Badge className="text-[10px] mt-1 bg-primary">Selected</Badge>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.label}</td>
                      {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlan?.id;
                        const isSelected = plan.id === selectedPlanId;
                        let cell: React.ReactNode;

                        if (row.type === "value") {
                          const rawPlan = PLANS[plan.id as keyof typeof PLANS];
                          const val = rawPlan[row.key];
                          cell = (
                            <span className="font-medium">{formatLimit(val as number)}</span>
                          );
                        } else {
                          const included = row.plans.includes(plan.id);
                          cell = included ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          );
                        }

                        return (
                          <td
                            key={plan.id}
                            className={`py-2.5 px-3 text-center ${
                              isSelected
                                ? "bg-primary/5"
                                : isCurrent
                                  ? "bg-secondary/50"
                                  : ""
                            }`}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Security note */}
          <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            Secure checkout powered by Stripe · Credit/debit card, Apple Pay, Google Pay
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpgrade} disabled={isUpgrading}>
              {isUpgrading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Continue to Checkout
              {billingPeriod === "annual" && selectedPlan?.annualPrice != null && (
                <Badge className="ml-2 bg-green-500/20 text-green-400 border-0 text-xs">
                  Annual
                </Badge>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
