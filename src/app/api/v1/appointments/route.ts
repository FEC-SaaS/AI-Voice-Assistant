import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withApiKey, apiError, apiSuccess, checkRateLimit } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { sendAppointmentConfirmation } from "@/lib/email";

/**
 * Get organization ID from either API key or Clerk session
 */
async function getOrgId(request: NextRequest): Promise<{ orgId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const apiAuth = await withApiKey(request);
    if ("context" in apiAuth) {
      return { orgId: apiAuth.context.organizationId };
    }
    return { error: apiAuth.error };
  }

  const { orgId } = await auth();
  if (!orgId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Provide API key in Authorization header or use session auth." },
        { status: 401 }
      ),
    };
  }

  return { orgId };
}

/**
 * GET /api/v1/appointments
 * List appointments for the organization
 */
export async function GET(request: NextRequest) {
  const authResult = await getOrgId(request);
  if ("error" in authResult) return authResult.error;

  const { orgId } = authResult;

  // Rate limiting for API key access
  if (request.headers.get("authorization")) {
    const rateLimit = checkRateLimit(orgId, 100, 60000);
    if (!rateLimit.allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = { organizationId: orgId };

    if (status && status !== "all") {
      where.status = status;
    }

    if (startDate) {
      where.scheduledAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.scheduledAt = {
        ...(where.scheduledAt as Record<string, Date> || {}),
        lte: new Date(endDate),
      };
    }

    const appointments = await db.appointment.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        endAt: true,
        duration: true,
        timeZone: true,
        meetingType: true,
        meetingLink: true,
        location: true,
        phoneNumber: true,
        attendeeName: true,
        attendeeEmail: true,
        attendeePhone: true,
        status: true,
        contactId: true,
        agentId: true,
        callId: true,
        createdAt: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: Math.min(limit, 100),
    });

    return apiSuccess({ appointments });
  } catch (error) {
    console.error("[API] GET /appointments error:", error);
    return apiError("Failed to fetch appointments", 500);
  }
}

/**
 * POST /api/v1/appointments
 * Create a new appointment (typically called by AI agent during a call)
 */
export async function POST(request: NextRequest) {
  const authResult = await getOrgId(request);
  if ("error" in authResult) return authResult.error;

  const { orgId } = authResult;

  // Rate limiting
  if (request.headers.get("authorization")) {
    const rateLimit = checkRateLimit(orgId, 50, 60000);
    if (!rateLimit.allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string") {
      return apiError("title is required", 400);
    }
    if (!body.scheduled_at || typeof body.scheduled_at !== "string") {
      return apiError("scheduled_at is required (ISO 8601 format)", 400);
    }

    const scheduledAt = new Date(body.scheduled_at);
    if (isNaN(scheduledAt.getTime())) {
      return apiError("scheduled_at must be a valid ISO 8601 date", 400);
    }

    // Validate date is in the future
    if (scheduledAt < new Date()) {
      return apiError("scheduled_at must be in the future", 400);
    }

    const duration = body.duration || 30;
    const endAt = new Date(scheduledAt.getTime() + duration * 60000);

    // Check for conflicts
    const conflictingAppointment = await db.appointment.findFirst({
      where: {
        organizationId: orgId,
        status: { in: ["scheduled", "confirmed"] },
        OR: [
          {
            scheduledAt: { lte: scheduledAt },
            endAt: { gt: scheduledAt },
          },
          {
            scheduledAt: { lt: endAt },
            endAt: { gte: endAt },
          },
          {
            scheduledAt: { gte: scheduledAt },
            endAt: { lte: endAt },
          },
        ],
      },
    });

    if (conflictingAppointment) {
      return apiError("This time slot conflicts with an existing appointment", 409);
    }

    // Get contact info if contact_id provided
    let attendeeInfo = {
      attendeeName: body.attendee_name || null,
      attendeeEmail: body.attendee_email || null,
      attendeePhone: body.attendee_phone || null,
    };

    if (body.contact_id) {
      const contact = await db.contact.findFirst({
        where: { id: body.contact_id, organizationId: orgId },
      });
      if (contact) {
        attendeeInfo = {
          attendeeName: attendeeInfo.attendeeName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || null,
          attendeeEmail: attendeeInfo.attendeeEmail || contact.email,
          attendeePhone: attendeeInfo.attendeePhone || contact.phoneNumber,
        };
      }
    }

    const appointment = await db.appointment.create({
      data: {
        organizationId: orgId,
        title: body.title,
        description: body.description || null,
        scheduledAt,
        endAt,
        duration,
        timeZone: body.time_zone || "America/New_York",
        meetingType: body.meeting_type || "phone",
        meetingLink: body.meeting_link || null,
        location: body.location || null,
        phoneNumber: body.phone_number || null,
        contactId: body.contact_id || null,
        agentId: body.agent_id || null,
        callId: body.call_id || null,
        attendeeName: attendeeInfo.attendeeName,
        attendeeEmail: attendeeInfo.attendeeEmail,
        attendeePhone: attendeeInfo.attendeePhone,
        notes: body.notes || null,
        status: "scheduled",
      },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        endAt: true,
        duration: true,
        timeZone: true,
        meetingType: true,
        meetingLink: true,
        location: true,
        phoneNumber: true,
        attendeeName: true,
        attendeeEmail: true,
        attendeePhone: true,
        status: true,
        contactId: true,
        agentId: true,
        callId: true,
        createdAt: true,
      },
    });

    // Send confirmation email if email available and not explicitly disabled
    if (body.send_confirmation !== false && attendeeInfo.attendeeEmail) {
      try {
        await sendAppointmentConfirmation(
          attendeeInfo.attendeeEmail,
          attendeeInfo.attendeeName || "there",
          {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
          }
        );
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
        // Don't fail the appointment creation
      }
    }

    return apiSuccess({ appointment }, 201);
  } catch (error) {
    console.error("[API] POST /appointments error:", error);
    return apiError("Failed to create appointment", 500);
  }
}
