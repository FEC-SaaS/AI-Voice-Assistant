import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";

export interface Context {
  db: typeof db;
  userId: string | null;
  orgId: string | null;
  userRole: string | null;
}

export async function createContext(): Promise<Context> {
  const { userId, orgId } = auth();

  let userRole: string | null = null;

  // Get user role from database if authenticated
  if (userId && orgId) {
    const user = await db.user.findFirst({
      where: {
        clerkId: userId,
        organization: {
          id: orgId,
        },
      },
      select: {
        role: true,
      },
    });
    userRole = user?.role || null;
  }

  return {
    db,
    userId,
    orgId,
    userRole,
  };
}

export type { Context as TRPCContext };
