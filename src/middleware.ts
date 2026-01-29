import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/pricing",
    "/features",
    "/blog",
    "/blog/(.*)",
    "/contact",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
  ],
  afterAuth(auth, req) {
    // Public routes: always allow through, no redirects at all
    if (auth.isPublicRoute) {
      return NextResponse.next();
    }

    // Protected route + not signed in: redirect to sign-in
    if (!auth.userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Protected route + signed in: allow through
    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
