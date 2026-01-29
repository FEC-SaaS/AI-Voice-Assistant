"use client";

import { useRouter } from "next/navigation";
import { CreateOrganization, useOrganization } from "@clerk/nextjs";
import { useEffect } from "react";
import { Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();

  // Once org is created/selected, redirect to dashboard
  useEffect(() => {
    if (isLoaded && organization) {
      router.push("/dashboard");
    }
  }, [isLoaded, organization, router]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="max-w-lg space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to VoxForge AI</h1>
          <p className="mt-2 text-gray-500">
            Create your organization to get started with AI voice agents.
          </p>
        </div>

        <div className="flex justify-center">
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg",
              },
            }}
          />
        </div>

        {organization && (
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
