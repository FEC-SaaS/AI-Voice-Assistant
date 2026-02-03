import { NextRequest, NextResponse } from "next/server";

// Forward all webhook requests to the appropriate handler
// This handles cases where Vapi sends to /api/webhooks instead of /api/webhooks/vapi

export async function POST(req: NextRequest) {
  // Clone the request to read the body
  const body = await req.text();

  // Check if this looks like a Vapi webhook (has call data or tool calls)
  try {
    const data = JSON.parse(body);

    // If it has Vapi-like fields, forward to Vapi handler
    if (data.call || data.message || data.type) {
      // Import and call the Vapi handler directly
      const { POST: vapiHandler } = await import("./vapi/route");

      // Create a new request with the same body
      const newReq = new NextRequest(req.url, {
        method: "POST",
        headers: req.headers,
        body: body,
      });

      return vapiHandler(newReq);
    }
  } catch (e) {
    // Not JSON or parse error
    console.error("[Webhooks] Failed to parse webhook body:", e);
  }

  return NextResponse.json({ error: "Unknown webhook type" }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook endpoint active",
    endpoints: {
      vapi: "/api/webhooks/vapi",
      stripe: "/api/webhooks/stripe",
      clerk: "/api/webhooks/clerk",
    }
  });
}
