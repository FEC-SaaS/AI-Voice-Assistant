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

  console.log(`[tRPC Context] auth() returned: userId=${userId ?? "null"}, clerkOrgId=${clerkOrgId ?? "null"}`);

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

    console.log(`[tRPC Context] DB user lookup: found=${!!user}, orgId=${user?.organizationId ?? "null"}, org.clerkOrgId=${user?.organization?.clerkOrgId ?? "null"}`);

    if (user) {
      if (clerkOrgId) {
        // Clerk has an org context — resolve the database org
        if (user.organization?.clerkOrgId === clerkOrgId) {
          // User's stored org matches the Clerk org context
          userRole = user.role;
          dbOrgId = user.organizationId;
          console.log(`[tRPC Context] Matched via user.organization: dbOrgId=${dbOrgId}`);
        } else {
          // Clerk org doesn't match user's stored org — look up by clerkOrgId.
          const org = await db.organization.findFirst({
            where: { clerkOrgId },
            select: { id: true },
          });
          console.log(`[tRPC Context] Fallback org lookup by clerkOrgId=${clerkOrgId}: found=${!!org}, orgDbId=${org?.id ?? "null"}`);
          if (org) {
            userRole = user.role;
            dbOrgId = org.id;
          }
        }
      } else if (user.organizationId) {
        // No Clerk org context — use DB org as fallback
        userRole = user.role;
        dbOrgId = user.organizationId;
        console.log(`[tRPC Context] No clerkOrgId, using DB fallback: dbOrgId=${dbOrgId}`);
      } else {
        console.log(`[tRPC Context] No clerkOrgId and no user.organizationId — user has no org`);
      }
    } else {
      console.log(`[tRPC Context] User not found in DB for clerkId=${userId}`);
    }
  } else {
    console.log(`[tRPC Context] No userId from Clerk auth — user is not authenticated`);
  }

  console.log(`[tRPC Context] Final: userId=${userId ?? "null"}, orgId=${dbOrgId ?? "null"}, role=${userRole ?? "null"}`);

  return {
    db,
    userId: userId ?? null,
    orgId: dbOrgId,
    clerkOrgId: clerkOrgId ?? null,
    userRole,
  };
}

export type { Context as TRPCContext };
