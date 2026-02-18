"use client";

import { SignUp, useClerk, useUser, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

const ACCOUNT_NAME_KEY = "calltone_pending_account_name";

export function ClerkSignUp() {
  const clerk = useClerk();
  const { isSignedIn, user } = useUser();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const router = useRouter();

  const [accountName, setAccountName] = useState("");
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

  if (!clerk.loaded) {
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
  // Step 2: User is signed in but has no org
  // → Show Account Name form to create their organization
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

  // ─────────────────────────────────────────────────
  // Step 1: Clerk's SignUp component
  // Handles email/password + Google + Microsoft + SSO
  // Clerk manages all OAuth redirects internally
  // ─────────────────────────────────────────────────
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      forceRedirectUrl="/sign-up"
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
          socialButtonsBlockButton:
            "border border-border bg-secondary hover:bg-secondary/80 text-foreground",
          socialButtonsBlockButtonText: "text-foreground font-medium",
          dividerLine: "bg-border",
          dividerText: "text-muted-foreground",
        },
      }}
    />
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
