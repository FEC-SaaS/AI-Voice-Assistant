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
  Download,
  Receipt,
  Shield,
  Wallet,
  ArrowRight,
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
import { toast } from "sonner";

// ── Usage Bar ──────────────────────────────────────────────────────────
function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
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
    </div>
  );
}

// ── Card brand icon helper ─────────────────────────────────────────────
function PaymentMethodIcon({ type, brand }: { type: string; brand?: string }) {
  if (type === "paypal") {
    return <Wallet className="h-5 w-5 text-blue-400" />;
  }
  if (type === "link") {
    return <Zap className="h-5 w-5 text-green-400" />;
  }
  // Default: card icon
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
  if (m.type === "paypal" && m.paypal) {
    return `PayPal (${m.paypal.payerEmail || "connected"})`;
  }
  if (m.type === "link") {
    return "Stripe Link";
  }
  return m.type.charAt(0).toUpperCase() + m.type.slice(1);
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function BillingPage() {
  const searchParams = useSearchParams();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: subscription, isLoading: loadingSub } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: loadingUsage } = trpc.billing.getUsage.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: paymentMethods } = trpc.billing.getPaymentMethods.useQuery();
  const { data: billingHistory } = trpc.billing.getBillingHistory.useQuery();
  const { data: upcomingInvoice } = trpc.billing.getUpcomingInvoice.useQuery();

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUpgrading(false);
      setShowConfirmDialog(false);
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

  const handlePlanClick = (planId: string) => {
    if (planId === currentPlan?.id) return;
    setSelectedPlanId(planId);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlanId) return;
    setIsUpgrading(true);
    createCheckout.mutate({ planId: selectedPlanId });
  };

  const handleManageBilling = () => {
    createPortal.mutate();
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Current Plan + Usage Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card>
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
              <div className="flex items-center gap-2">
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
            {!isPaidPlan && (
              <p className="text-sm text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Upgrade to unlock all features and higher limits
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Usage
            </CardTitle>
            <CardDescription>This billing period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
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
      </div>

      {/* Overage Tracker */}
      {usage && usage.overage.minutes > 0 && (
        <Card className="border-border bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-400 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Overage Charges This Period</h3>
                <p className="text-sm text-orange-800 mt-1">
                  You have used <strong>{usage.overage.minutes.toLocaleString()} minutes</strong> over
                  your plan limit. Current overage charges:{" "}
                  <strong>${(usage.overage.costCents / 100).toFixed(2)}</strong> at $
                  {(usage.overage.ratePerMinuteCents / 100).toFixed(2)}/minute.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Upcoming Invoice
            </CardTitle>
            <CardDescription>
              Next billing date:{" "}
              {upcomingInvoice.periodEnd?.toLocaleDateString() || "N/A"}
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

      {/* Plan Selection */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Choose a Plan</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Click a plan to select it. You&apos;ll be guided through secure payment setup.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan?.id;
            const isSelected = plan.id === selectedPlanId;
            const isPopular = "popular" in plan && plan.popular;
            const isUpgrade = plan.price !== null && currentPlan?.price !== null &&
              (plan.price ?? 0) > (currentPlan?.price ?? 0);

            return (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all ${
                  isPopular ? "border-primary shadow-md" : ""
                } ${isCurrentPlan ? "bg-secondary cursor-default" : "hover:shadow-lg hover:border-primary/50"} ${
                  isSelected && !isCurrentPlan ? "ring-2 ring-primary border-primary" : ""
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
                      <Badge variant="outline" className="ml-2">Current</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {plan.price !== null ? (
                      <p className="text-3xl font-bold">
                        ${plan.price}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
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
                      <Button
                        className="w-full"
                        variant={isSelected ? "default" : "outline"}
                      >
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

      {/* Tabs: Payment Methods + Billing History */}
      <Tabs defaultValue="payment-methods">
        <TabsList>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing-history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-methods" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Cards, PayPal, Apple Pay, Google Pay, and Link are accepted at checkout
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
                    <span>PayPal</span>
                    <span>Apple Pay</span>
                    <span>Google Pay</span>
                    <span>Link</span>
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
              {/* Security note */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground/70">
                <Shield className="h-3.5 w-3.5" />
                Payments are securely processed by Stripe. We never store your card details.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing-history" className="mt-4">
          <Card>
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

      {/* Overage Info */}
      <Card className="bg-blue-500/10 border-border">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <FileText className="h-6 w-6 text-blue-400 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">About Overage Charges</h3>
              <p className="text-sm text-blue-800">
                If you exceed your monthly minute limit, additional minutes are billed at{" "}
                <strong>$0.15/minute</strong>. Overage is tracked automatically and included
                in your next invoice as a metered line item via Stripe.
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Shield className="h-3.5 w-3.5" />
                Accepted payment methods: Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay, Stripe Link
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Upgrade Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlan && currentPlan && (selectedPlan.price ?? 0) > (currentPlan.price ?? 0)
                ? "Upgrade"
                : "Switch"}{" "}
              to {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              Review your plan change before proceeding to checkout.
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Plan comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold">{currentPlan?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan?.price !== null ? `$${currentPlan?.price}/mo` : "Free"}
                  </p>
                </div>
                <div className="rounded-lg border border-primary p-3 bg-primary/5">
                  <p className="text-xs text-primary mb-1">New Plan</p>
                  <p className="font-semibold">{selectedPlan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.price !== null ? `$${selectedPlan.price}/mo` : "Custom"}
                  </p>
                </div>
              </div>

              {/* What you'll get */}
              <div>
                <p className="text-sm font-medium mb-2">What&apos;s included:</p>
                <ul className="space-y-1">
                  {selectedPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment info */}
              <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground/70" />
                  Secure checkout powered by Stripe
                </p>
                <p className="text-xs text-muted-foreground pl-6">
                  You can pay with credit/debit card, PayPal, Apple Pay, Google Pay, or Link
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpgrade} disabled={isUpgrading}>
              {isUpgrading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
