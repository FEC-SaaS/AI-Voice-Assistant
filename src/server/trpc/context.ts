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

    // Only set role if the org matches
    if (user && user.organization?.clerkOrgId === clerkOrgId) {
      userRole = user.role;
      dbOrgId = user.organizationId;
    } else if (user) {
      // User exists but org doesn't match — look up the org by clerkOrgId
      const org = await db.organization.findFirst({
        where: { clerkOrgId },
        select: { id: true },
      });
      if (org && org.id === user.organizationId) {
        userRole = user.role;
        dbOrgId = user.organizationId;
      }
      // If no match, dbOrgId stays null → protectedProcedure rejects
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
