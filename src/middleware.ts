import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

export default async function middleware(req: NextRequest) {
  if (isClerkConfigured) {
    const { authMiddleware } = await import("@clerk/nextjs");
    const handler = authMiddleware({
      publicRoutes: [
        "/",
        "/pricing",
        "/features",
        "/blog",
        "/blog/(.*)",
        "/contact",
        "/api/webhooks/(.*)",
      ],
      ignoredRoutes: [
        "/api/webhooks/vapi",
        "/api/webhooks/stripe",
        "/api/webhooks/clerk",
      ],
    });
    return handler(req, {} as any);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
