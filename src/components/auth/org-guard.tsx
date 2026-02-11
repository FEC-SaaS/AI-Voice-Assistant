"use client";

import { useOrganization } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { organization, isLoaded } = useOrganization();
  const pathname = usePathname();
  const router = useRouter();

  const isOnboarding = pathname === "/dashboard/onboarding";

  useEffect(() => {
    if (isLoaded && !organization && !isOnboarding) {
      // Redirect to signup to complete account creation
      router.push("/sign-up?step=account");
    }
  }, [isLoaded, organization, isOnboarding, router]);

  // Still loading Clerk
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  // No org and not on onboarding — waiting for redirect
  if (!organization && !isOnboarding) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return <>{children}</>;
}
