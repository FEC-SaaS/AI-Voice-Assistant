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
    const user = await db.user.findFirst({
      where: {
        clerkId: userId,
        organization: {
          OR: [
            { id: clerkOrgId },        // Match by database ID (for backwards compatibility)
            { clerkOrgId: clerkOrgId }, // Or by Clerk org ID
          ],
        },
      },
      select: {
        role: true,
        organizationId: true,
      },
    });
    userRole = user?.role || null;
    dbOrgId = user?.organizationId || null;
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
