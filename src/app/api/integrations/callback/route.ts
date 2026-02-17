// Universal OAuth callback handler for all integration providers
// Route: /api/integrations/callback?provider=ghl&code=xxx&state=xxx
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  exchangeOAuthCode,
  saveIntegrationConnection,
  type IntegrationType,
} from "@/server/services/integration.service";

const log = createLogger("IntegrationCallback");

const VALID_PROVIDERS = [
  "ghl",
  "google_calendar",
  "google_sheets",
  "slack",
  "hubspot",
  "salesforce",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl}/dashboard/integrations`;

  // Handle OAuth errors
  if (error) {
    log.error("OAuth error:", error);
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent("Missing authorization code or state")}`
    );
  }

  // Decode state to get orgId and provider
  let state: { orgId: string; provider: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent("Invalid state parameter")}`
    );
  }

  const { orgId, provider } = state;

  if (!orgId || !provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent("Invalid provider or organization")}`
    );
  }

  try {
    log.info(`Processing OAuth callback for ${provider} in org ${orgId}`);

    // Exchange code for tokens
    const tokens = await exchangeOAuthCode(
      provider as IntegrationType,
      code,
      orgId
    );

    // Save to database
    await saveIntegrationConnection(orgId, provider as IntegrationType, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      config: tokens.config,
    });

    log.info(`Successfully connected ${provider} for org ${orgId}`);

    return NextResponse.redirect(
      `${redirectUrl}?connected=${encodeURIComponent(provider)}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    log.error(`OAuth exchange failed for ${provider}:`, message);

    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent(`Failed to connect ${provider}: ${message}`)}`
    );
  }
}
