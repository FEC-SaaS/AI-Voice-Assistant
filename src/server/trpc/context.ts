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

  if (userId) {
    // Find the user in the database
    const user = await db.user.findFirst({
      where: { clerkId: userId },
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

    if (user) {
      if (clerkOrgId) {
        // Clerk has an org context — resolve the database org
        if (user.organization?.clerkOrgId === clerkOrgId) {
          // User's stored org matches the Clerk org context
          userRole = user.role;
          dbOrgId = user.organizationId;
        } else {
          // Clerk org doesn't match user's stored org — look up by clerkOrgId.
          // This happens when the user switches orgs in Clerk, or when the
          // user record hasn't been updated yet after joining an org.
          const org = await db.organization.findFirst({
            where: { clerkOrgId },
            select: { id: true },
          });
          if (org) {
            userRole = user.role;
            dbOrgId = org.id;
          }
        }
      } else if (user.organizationId) {
        // No Clerk org context but user has an org in the database.
        // This happens when a user is in "personal workspace" mode in Clerk
        // or when Clerk org is not configured. Use their DB org as fallback.
        userRole = user.role;
        dbOrgId = user.organizationId;
      }
    }
  }

  return {
    db,
    userId: userId ?? null,
    orgId: dbOrgId,
    clerkOrgId: clerkOrgId ?? null,
    userRole,
  };
}

export type { Context as TRPCContext };
