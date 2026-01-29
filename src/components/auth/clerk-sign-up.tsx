"use client";

import { SignUp, useClerk } from "@clerk/nextjs";

export function ClerkSignUp() {
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
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg",
        },
      }}
    />
  );
}
