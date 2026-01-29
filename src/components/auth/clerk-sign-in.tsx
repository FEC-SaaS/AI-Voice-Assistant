"use client";

import { SignIn, useClerk } from "@clerk/nextjs";

export function ClerkSignIn() {
  const { loaded } = useClerk();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading authentication...</p>
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
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg",
        },
      }}
    />
  );
}
