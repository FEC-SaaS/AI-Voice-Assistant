import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware - ensures user is authenticated
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      orgId: ctx.orgId,
      clerkOrgId: ctx.clerkOrgId,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Role-based access middleware
const enforceUserRole = (allowedRoles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userId || !ctx.orgId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    if (!ctx.userRole || !allowedRoles.includes(ctx.userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      });
    }

    return next({
      ctx: {
        userId: ctx.userId,
        orgId: ctx.orgId,
        clerkOrgId: ctx.clerkOrgId,
        userRole: ctx.userRole,
      },
    });
  });

export const adminProcedure = t.procedure.use(
  enforceUserRole(["owner", "admin"])
);

export const managerProcedure = t.procedure.use(
  enforceUserRole(["owner", "admin", "manager"])
);
