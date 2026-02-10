import crypto from "crypto";

function getTokenSecret(): string {
  const secret = process.env.APPOINTMENT_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("APPOINTMENT_TOKEN_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return secret;
}
const TOKEN_SECRET = getTokenSecret();
const TOKEN_EXPIRY_HOURS = 72; // Tokens expire after 72 hours

interface TokenPayload {
  appointmentId: string;
  action: "confirm" | "cancel" | "reschedule";
  email: string;
  expiresAt: number;
}

/**
 * Generate a secure action token for appointment actions
 */
export function generateActionToken(
  appointmentId: string,
  action: "confirm" | "cancel" | "reschedule",
  email: string
): string {
  const expiresAt = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

  const payload: TokenPayload = {
    appointmentId,
    action,
    email,
    expiresAt,
  };

  // Create payload string
  const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // Create signature
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payloadString)
    .digest("base64url");

  // Combine payload and signature
  return `${payloadString}.${signature}`;
}

/**
 * Verify and decode an action token
 */
export function verifyActionToken(token: string): TokenPayload | null {
  try {
    const [payloadString, signature] = token.split(".");

    if (!payloadString || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payloadString)
      .digest("base64url");

    if (signature !== expectedSignature) {
      console.error("[Token] Invalid signature");
      return null;
    }

    // Decode payload
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadString, "base64url").toString("utf8")
    );

    // Check expiry
    if (payload.expiresAt < Date.now()) {
      console.error("[Token] Token expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[Token] Failed to verify token:", error);
    return null;
  }
}

/**
 * Generate action URLs for an appointment
 */
export function generateActionUrls(
  appointmentId: string,
  email: string,
  baseUrl: string
): {
  confirmUrl: string;
  cancelUrl: string;
  rescheduleUrl: string;
} {
  const confirmToken = generateActionToken(appointmentId, "confirm", email);
  const cancelToken = generateActionToken(appointmentId, "cancel", email);
  const rescheduleToken = generateActionToken(appointmentId, "reschedule", email);

  return {
    confirmUrl: `${baseUrl}/appointment/confirm?token=${encodeURIComponent(confirmToken)}`,
    cancelUrl: `${baseUrl}/appointment/cancel?token=${encodeURIComponent(cancelToken)}`,
    rescheduleUrl: `${baseUrl}/appointment/reschedule?token=${encodeURIComponent(rescheduleToken)}`,
  };
}
