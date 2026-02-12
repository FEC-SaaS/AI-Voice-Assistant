"use client";

import Link from "next/link";
import { Compass, ArrowRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function SetupGuideBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: user, isLoading } = trpc.users.me.useQuery();

  // Don't show if loading, dismissed, or onboarding is complete
  if (isLoading || dismissed) return null;
  if (user?.organization?.onboardingComplete) return null;

  return (
    <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-5 shadow-sm">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 rounded-lg p-1 text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 flex-shrink-0">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">Setup Guide</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Follow our step-by-step guide to set up your first voice agent, provision a phone
            number, and get everything ready for calls.
          </p>
        </div>
        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 flex-shrink-0"
        >
          <Compass className="h-4 w-4" />
          Open Guide
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
