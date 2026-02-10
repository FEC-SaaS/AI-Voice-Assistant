import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Generic webhook router
 * Forwards Vapi-like webhook payloads to the Vapi handler.
 * Validates the x-vapi-secret header before forwarding.
 */

function verifyVapiSecret(req: NextRequest): boolean {
  const vapiSecret = req.headers.get("x-vapi-secret");
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  if (!secret || !vapiSecret) return false;

  try {
    const secretBuffer = Buffer.from(secret);
    const vapiSecretBuffer = Buffer.from(vapiSecret);

    if (secretBuffer.length !== vapiSecretBuffer.length) return false;

    return crypto.timingSafeEqual(secretBuffer, vapiSecretBuffer);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  try {
    const data = JSON.parse(body);

    // If it has Vapi-like fields, verify secret and forward to Vapi handler
    if (data.call || data.message || data.type) {
      if (!verifyVapiSecret(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { POST: vapiHandler } = await import("./vapi/route");

      const newReq = new NextRequest(req.url, {
        method: "POST",
        headers: req.headers,
        body: body,
      });

      return vapiHandler(newReq);
    }
  } catch (e) {
    console.error("[Webhooks] Failed to parse webhook body:", e);
  }

  return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 });
}

// No GET — don't expose endpoint information
