"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Zap,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">
          {used} / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-primary"
          }`}
          style={{ width: `${isUnlimited ? 0 : percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Limit reached - upgrade to continue
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const { data: subscription, isLoading: loadingSub } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: loadingUsage } = trpc.billing.getUsage.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUpgrading(null);
    },
  });

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription updated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled");
    }
  }, [searchParams]);

  const handleUpgrade = (planId: string) => {
    setIsUpgrading(planId);
    createCheckout.mutate({ planId });
  };

  const handleManageBilling = () => {
    createPortal.mutate();
  };

  if (loadingSub || loadingUsage) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const isPaidPlan = currentPlan?.id !== "free-trial";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-500">Manage your subscription and monitor usage</p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{currentPlan?.name}</h3>
              <p className="text-gray-500">{currentPlan?.description}</p>
              {subscription?.subscription && (
                <div className="mt-2 space-y-1">
                  <Badge variant={subscription.subscription.status === "active" ? "default" : "secondary"}>
                    {subscription.subscription.status}
                  </Badge>
                  {subscription.subscription.cancelAtPeriodEnd && (
                    <p className="text-sm text-orange-600">
                      Cancels on {subscription.subscription.currentPeriodEnd.toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              {currentPlan?.price !== null ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">
                    ${currentPlan?.price}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </p>
                </>
              ) : (
                <p className="text-lg text-gray-600">Custom pricing</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Usage
          </CardTitle>
          <CardDescription>Your usage this billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {usage && (
              <>
                <UsageBar used={usage.agents.used} limit={usage.agents.limit} label="AI Agents" />
                <UsageBar used={usage.phoneNumbers.used} limit={usage.phoneNumbers.limit} label="Phone Numbers" />
                <UsageBar used={usage.campaigns.used} limit={usage.campaigns.limit} label="Campaigns" />
                <UsageBar used={usage.minutes.used} limit={usage.minutes.limit} label="Minutes Used" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan?.id;
            const isPopular = "popular" in plan && plan.popular;

            return (
              <Card
                key={plan.id}
                className={`relative ${isPopular ? "border-primary shadow-md" : ""} ${
                  isCurrentPlan ? "bg-gray-50" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {plan.price !== null ? (
                      <p className="text-3xl font-bold">
                        ${plan.price}
                        <span className="text-sm font-normal text-gray-500">/mo</span>
                      </p>
                    ) : (
                      <p className="text-xl font-semibold text-gray-600">Contact Us</p>
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
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isUpgrading === plan.id || createCheckout.isPending}
                      >
                        {isUpgrading === plan.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        {plan.price && currentPlan?.price && plan.price > currentPlan.price
                          ? "Upgrade"
                          : "Switch Plan"}
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

      {/* Overage Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <FileText className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">About Overage Charges</h3>
              <p className="text-sm text-blue-800 mt-1">
                If you exceed your monthly minute limit, additional minutes are billed at $0.15/minute.
                Overage charges are calculated at the end of each billing cycle and added to your next invoice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
