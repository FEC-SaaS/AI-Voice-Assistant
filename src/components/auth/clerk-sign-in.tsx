"use client";

import { SignIn, useClerk } from "@clerk/nextjs";

export function ClerkSignIn() {
  const { loaded } = useClerk();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorBackground: "hsl(var(--card))",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          colorPrimary: "hsl(var(--primary))",
          colorInputBackground: "hsl(var(--secondary))",
          colorInputText: "hsl(var(--foreground))",
        },
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg bg-card border-border",
          socialButtons: "hidden",
          dividerRow: "hidden",
        },
      }}
    />
  );
}
