import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "storage.googleapis.com" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "img.clerk.com" },
    ],
  },
  async headers() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production builds when auth token is available
  silent: !process.env.SENTRY_AUTH_TOKEN,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Hide source maps from users
  hideSourceMaps: true,

  // Widen the upload scope for better stack traces
  widenClientFileUpload: true,

  // Tunnel Sentry events through the app to avoid ad blockers
  tunnelRoute: "/monitoring",
});
