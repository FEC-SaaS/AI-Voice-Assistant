import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { slugify } from "@/lib/utils";

const log = createLogger("tRPC Context");

export interface Context {
  db: typeof db;
  userId: string | null;
  orgId: string | null;       // Database organization ID
  clerkOrgId: string | null;  // Clerk organization ID
  userRole: string | null;
}

/**
 * Auto-provision a Clerk user into the database when they authenticate
 * but don't yet exist (e.g. after a migration or DB reset).
 */
async function autoProvisionUser(clerkUserId: string, clerkOrgId: string | null) {
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);

    // Determine which org to place the user in
    let orgId: string | null = null;

    if (clerkOrgId) {
      // Try to find existing org by clerkOrgId
      let org = await db.organization.findFirst({
        where: { clerkOrgId },
        select: { id: true },
      });

      if (!org) {
        // Org doesn't exist — fetch from Clerk and create it
        try {
          const clerkOrg = await clerk.organizations.getOrganization({ organizationId: clerkOrgId });
          org = await db.organization.create({
            data: {
              clerkOrgId,
              name: clerkOrg.name,
              slug: clerkOrg.slug || slugify(clerkOrg.name),
            },
          });
          log.info(`Auto-provisioned organization: ${clerkOrg.name} (${org.id})`);
        } catch (orgError) {
          log.error("Failed to auto-provision organization:", orgError);
          return null;
        }
      }
      orgId = org.id;
    } else {
      // No org context from Clerk — cannot auto-provision without an org
      log.warn("Cannot auto-provision user — no Clerk organization context");
    }

    if (!orgId) {
      log.warn("Cannot auto-provision user — no organization found");
      return null;
    }

    // Determine role — first user in org becomes owner
    const existingUserCount = await db.user.count({ where: { organizationId: orgId } });
    const role = existingUserCount === 0 ? "owner" : "member";

    const user = await db.user.create({
      data: {
        clerkId: clerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        imageUrl: clerkUser.imageUrl,
        role,
        organizationId: orgId,
      },
    });

    log.info(`Auto-provisioned user: ${user.email} (${user.id}) as ${role} in org ${orgId}`);
    return { role, organizationId: orgId };
  } catch (error) {
    log.error("Failed to auto-provision user:", error);
    return null;
  }
}

export async function createContext(): Promise<Context> {
  const authData = await auth();
  const { userId, orgId: clerkOrgId } = authData;

  let userRole: string | null = null;
  let dbOrgId: string | null = null;

  if (userId) {
    // Find the user in the database
    let user = await db.user.findFirst({
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

    // Auto-provision if user is authenticated via Clerk but missing from DB
    if (!user) {
      log.warn("User not found in DB — attempting auto-provision");
      const provisioned = await autoProvisionUser(userId, clerkOrgId ?? null);
      if (provisioned) {
        user = await db.user.findFirst({
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
      }
    }

    if (user) {
      if (clerkOrgId) {
        // Clerk has an org context — resolve the database org
        if (user.organization?.clerkOrgId === clerkOrgId) {
          userRole = user.role;
          dbOrgId = user.organizationId;
        } else {
          // Clerk org doesn't match user's stored org — look up by clerkOrgId.
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
        // No Clerk org context — use DB org as fallback
        userRole = user.role;
        dbOrgId = user.organizationId;
      }
    } else {
      log.warn("User not found in DB and auto-provision failed");
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
