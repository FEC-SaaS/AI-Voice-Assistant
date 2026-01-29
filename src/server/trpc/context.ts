import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";

export interface Context {
  db: typeof db;
  userId: string | null;
  orgId: string | null;
  userRole: string | null;
}

export async function createContext(): Promise<Context> {
  const authData = auth();
  const { userId, orgId } = authData;

  // Debug logging - remove after fixing
  console.log("🔐 tRPC Context Auth:", {
    userId: userId ? `${userId.slice(0, 10)}...` : null,
    orgId: orgId || null,
    sessionId: authData.sessionId ? "present" : "missing",
  });

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
    userId: userId ?? null,
    orgId: orgId ?? null,
    userRole,
  };
}

export type { Context as TRPCContext };
