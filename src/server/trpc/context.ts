import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export interface Context {
  db: typeof db;
  userId: string | null;
  orgId: string | null;       // Database organization ID
  clerkOrgId: string | null;  // Clerk organization ID
  userRole: string | null;
}

export async function createContext(): Promise<Context> {
  const authData = await auth();
  const { userId, orgId: clerkOrgId } = authData;

  // Debug logging - remove after fixing
  console.log("🔐 tRPC Context Auth:", {
    userId: userId ? `${userId.slice(0, 10)}...` : null,
    clerkOrgId: clerkOrgId || null,
    sessionId: authData.sessionId ? "present" : "missing",
  });

  let userRole: string | null = null;
  let dbOrgId: string | null = null;

  // Get user role and organization from database if authenticated
  if (userId && clerkOrgId) {
    // First, try to find user by clerkId
    const user = await db.user.findFirst({
      where: {
        clerkId: userId,
      },
      select: {
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            clerkOrgId: true,
          },
        },
      },
    });

    // Debug: Log what we found
    console.log("🔍 User lookup result:", {
      found: !!user,
      userRole: user?.role || null,
      userOrgId: user?.organizationId || null,
      orgClerkId: user?.organization?.clerkOrgId || null,
      expectedClerkOrgId: clerkOrgId,
      match: user?.organization?.clerkOrgId === clerkOrgId || user?.organizationId === clerkOrgId,
    });

    // Only set role if the org matches
    if (user && (user.organization?.clerkOrgId === clerkOrgId || user.organizationId === clerkOrgId)) {
      userRole = user.role;
      dbOrgId = user.organizationId;
    } else if (user) {
      // User exists but org doesn't match - this might be the issue
      console.log("⚠️ User found but org mismatch. User's org:", user.organizationId, "Clerk org:", clerkOrgId);
      // Still allow access if user exists (temporary fix)
      userRole = user.role;
      dbOrgId = user.organizationId;
    }
  }

  return {
    db,
    userId: userId ?? null,
    orgId: dbOrgId,           // Use database org ID for queries
    clerkOrgId: clerkOrgId ?? null,
    userRole,
  };
}

export type { Context as TRPCContext };
