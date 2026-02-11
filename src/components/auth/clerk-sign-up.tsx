"use client";

import { useSignUp, useClerk, useUser, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

type Phase = "form" | "verifying";

export function ClerkSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const { isSignedIn, user } = useUser();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  // PRIORITY CHECK: User is signed in but has no org
  // This handles OAuth returns AND any edge case where
  // a user exists without an organization.
  // ─────────────────────────────────────────────────
  const membershipsReady = userMemberships.data !== undefined;
  const hasNoOrg =
    isSignedIn &&
    user &&
    membershipsReady &&
    (userMemberships.data?.length ?? 0) === 0;

  if (hasNoOrg) {
    return (
      <Card>
        <h1 className="text-2xl font-bold text-foreground text-center">
          Create Your Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          Welcome{user.firstName ? `, ${user.firstName}` : ""}! Name your account to get started.
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = accountName.trim();
            if (!name) {
              setError("Please enter an account name.");
              return;
            }
            setError("");
            setLoading(true);
            try {
              const org = await clerk.createOrganization({ name });
              await clerk.setActive({ organization: org.id });
              router.push("/dashboard");
            } catch (err: unknown) {
              setError(extractMsg(err));
            } finally {
              setLoading(false);
            }
          }}
          className="mt-6 space-y-4"
        >
          <FieldGroup label="Account Name">
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              className="input-field"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is the name of your business or team
            </p>
          </FieldGroup>

          {error && <ErrorMsg msg={error} />}

          <button
            type="submit"
            disabled={loading || !accountName.trim()}
            className="btn-primary"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Get Started
          </button>
        </form>
      </Card>
    );
  }

  // If user is signed in AND has an org, send them to dashboard
  if (isSignedIn && !hasNoOrg && membershipsReady) {
    router.push("/dashboard");
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── OAuth handlers ──────────────────────────────
  const handleOAuth = async (strategy: "oauth_google" | "oauth_microsoft") => {
    if (!signUp) return;
    setError("");
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: "/sign-up",
      });
    } catch (err: unknown) {
      setError(extractMsg(err));
    }
  };

  // ── Email/password signup ───────────────────────
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setLoading(true);
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setPhase("verifying");
    } catch (err: unknown) {
      setError(extractMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Verify email + create org in one go ─────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        // Activate the session
        await setActive({ session: result.createdSessionId });

        // Small delay to let Clerk propagate the session
        await new Promise((r) => setTimeout(r, 500));

        // Create the organization immediately — we still have accountName in state
        const org = await clerk.createOrganization({
          name: accountName.trim(),
        });
        await clerk.setActive({ organization: org.id });

        // Go straight to dashboard — no extra steps
        router.push("/dashboard");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      setError(extractMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Phase: Email verification ───────────────────
  if (phase === "verifying") {
    return (
      <Card>
        <h1 className="text-2xl font-bold text-foreground text-center">
          Verify Your Email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          We sent a code to <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <FieldGroup label="Verification Code">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              className="input-field text-center tracking-[0.3em] text-lg"
            />
          </FieldGroup>

          {error && <ErrorMsg msg={error} />}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="btn-primary"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify & Continue
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await signUp?.prepareEmailAddressVerification({
                  strategy: "email_code",
                });
                setError("");
              } catch (err: unknown) {
                setError(extractMsg(err));
              }
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Didn&apos;t receive a code? Resend
          </button>
        </form>
      </Card>
    );
  }

  // ── Phase: Main signup form ─────────────────────
  return (
    <Card>
      <h1 className="text-2xl font-bold text-foreground text-center">
        Create Your Account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground text-center">
        Get started with CallTone
      </p>

      {/* OAuth Buttons */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("oauth_google")}
          className="btn-oauth"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("oauth_microsoft")}
          className="btn-oauth"
        >
          <svg className="h-5 w-5" viewBox="0 0 23 23">
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
          Microsoft
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="First Name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
              className="input-field"
            />
          </FieldGroup>
          <FieldGroup label="Last Name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
              className="input-field"
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Email Address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className="input-field"
          />
        </FieldGroup>

        <FieldGroup label="Password">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FieldGroup>

        <FieldGroup label="Account Name">
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Acme Corp"
            required
            className="input-field"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your business or team name
          </p>
        </FieldGroup>

        {error && <ErrorMsg msg={error} />}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}

// ── Shared sub-components ───────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
      {children}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-500">
      {msg}
    </div>
  );
}

function extractMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    // Clerk errors have an "errors" array
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as Record<string, unknown>;
      if (typeof first.longMessage === "string") return first.longMessage;
      if (typeof first.message === "string") return first.message;
    }
    if (typeof obj.message === "string") return obj.message;
  }
  return "Something went wrong. Please try again.";
}
