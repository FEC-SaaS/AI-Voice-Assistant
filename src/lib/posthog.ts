import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

/**
 * Get or create a server-side PostHog client singleton.
 * Returns null if PostHog is not configured.
 */
export function getPostHogServerClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Flush events every 30 seconds or when 20 events are queued
      flushAt: 20,
      flushInterval: 30000,
    });
  }

  return posthogClient;
}

/**
 * Capture a server-side event. Safe to call even if PostHog is not configured.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogServerClient();
  if (!client) return;

  client.capture({
    distinctId,
    event,
    properties,
  });
}

/**
 * Identify a user on the server side. Safe to call even if PostHog is not configured.
 */
export function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogServerClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Shutdown the PostHog client (flush all pending events).
 * Call this during graceful shutdown.
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
