"use client";

import { useSignUp, useClerk, useUser, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

const ACCOUNT_NAME_KEY = "calltone_pending_account_name";

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
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Prevent double-creation
  const orgCreationAttempted = useRef(false);

  const membershipsReady = userMemberships.data !== undefined;
  const hasNoOrg =
    isSignedIn &&
    user &&
    membershipsReady &&
    (userMemberships.data?.length ?? 0) === 0;

  // ─────────────────────────────────────────────────
  // AUTO-CREATE ORG: If user is signed in, has no org,
  // and we have a stored account name from before the
  // Clerk redirect, create the org automatically.
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasNoOrg || orgCreationAttempted.current || !clerk.loaded) return;

    const storedName = sessionStorage.getItem(ACCOUNT_NAME_KEY);
    if (!storedName) return;

    orgCreationAttempted.current = true;
    setCreatingOrg(true);

    (async () => {
      try {
        const org = await clerk.createOrganization({ name: storedName });
        await clerk.setActive({ organization: org.id });
        sessionStorage.removeItem(ACCOUNT_NAME_KEY);
        router.push("/dashboard");
      } catch (err: unknown) {
        setError(extractMsg(err));
        sessionStorage.removeItem(ACCOUNT_NAME_KEY);
        setCreatingOrg(false);
        orgCreationAttempted.current = false;
      }
    })();
  }, [hasNoOrg, clerk, router]);

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

  // Show spinner while auto-creating org from stored name
  if (creatingOrg) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Setting up your account...</p>
          {error && <ErrorMsg msg={error} />}
        </div>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────
  // User is signed in, no org, and no stored name
  // → Show Account Name form (OAuth returns land here)
  // ─────────────────────────────────────────────────
  if (hasNoOrg) {
    return (
      <Card>
        <h1 className="text-2xl font-bold text-foreground text-center">
          Create Your Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}! Name your account to get started.
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

  // If signed in with an org already, go to dashboard
  if (isSignedIn && !hasNoOrg && membershipsReady) {
    router.push("/dashboard");
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      // Store account name BEFORE verification — survives Clerk redirects
      sessionStorage.setItem(ACCOUNT_NAME_KEY, accountName.trim());

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

  // ── Verify email ────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        // Activate session — Clerk may redirect, but sessionStorage persists.
        // The useEffect above will pick up the stored account name and
        // auto-create the org when the component re-renders.
        await setActive({ session: result.createdSessionId });

        // If we're still on the page (no redirect), try creating org directly
        try {
          await new Promise((r) => setTimeout(r, 500));
          const storedName = sessionStorage.getItem(ACCOUNT_NAME_KEY);
          if (storedName && clerk.loaded) {
            const org = await clerk.createOrganization({ name: storedName });
            await clerk.setActive({ organization: org.id });
            sessionStorage.removeItem(ACCOUNT_NAME_KEY);
            router.push("/dashboard");
          }
        } catch {
          // If this fails, the useEffect will handle it after redirect
        }
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

      {/* Signup Form */}
      <form onSubmit={handleEmailSignUp} className="mt-6 space-y-4">
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
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as Record<string, unknown>;
      if (typeof first.longMessage === "string") return first.longMessage;
      if (typeof first.message === "string") return first.message;
    }
    if (typeof obj.message === "string") return obj.message;
  }
  return "Something went wrong. Please try again.";
}
