import Link from "next/link";
import { ClerkSignIn } from "@/components/auth/clerk-sign-in";
import { AuthLayout } from "@/components/auth/auth-layout";

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
  return (
    <AuthLayout>
      {isClerkConfigured ? (
        <ClerkSignIn />
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-2 text-muted-foreground">
            Authentication is not configured yet. Set your Clerk API keys in the .env file.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Go Home
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

//  npm install @clerk/nextjs
// import { SignIn } from "@clerk/nextjs";