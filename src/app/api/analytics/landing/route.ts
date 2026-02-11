import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// In-memory rate limiting: 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const VALID_EVENTS = ["button_click", "call_start", "call_end", "call_error"];
const VALID_AGENTS = ["male", "female"];

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { event, agent, duration, location, sessionId, metadata } = body;

    // Validate event type
    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Validate agent type if provided
    if (agent && !VALID_AGENTS.includes(agent)) {
      return NextResponse.json(
        { error: "Invalid agent type" },
        { status: 400 }
      );
    }

    // Capture user-agent server-side
    const userAgent = request.headers.get("user-agent") || undefined;

    // Truncate fields to prevent abuse
    const sanitizedLocation =
      typeof location === "string" ? location.slice(0, 200) : undefined;
    const sanitizedSessionId =
      typeof sessionId === "string" ? sessionId.slice(0, 100) : undefined;

    // Fire-and-forget: don't let DB errors block the response
    try {
      await prisma.landingEvent.create({
        data: {
          event,
          agent: agent || undefined,
          duration: typeof duration === "number" ? Math.floor(duration) : undefined,
          location: sanitizedLocation,
          userAgent: userAgent?.slice(0, 500),
          sessionId: sanitizedSessionId,
          metadata: metadata && typeof metadata === "object" ? metadata : {},
        },
      });
    } catch (dbError) {
      // Log but don't fail the request — analytics should never block UX
      console.error("[Landing Analytics] DB write failed:", dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Landing Analytics] Error:", error);
    // Still return success to avoid blocking client-side flows
    return NextResponse.json({ success: true });
  }
}
