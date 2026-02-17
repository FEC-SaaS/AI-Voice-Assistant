"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SSOCallbackPage() {
  return (
    <AuthLayout>
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">
            Completing sign in...
          </p>
        </div>
      </div>
      <AuthenticateWithRedirectCallback />
    </AuthLayout>
  );
}
