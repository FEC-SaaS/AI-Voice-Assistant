import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyActionToken } from "@/lib/appointment-tokens";
import {
  sendAppointmentCancellation,
  EmailBrandingConfig,
} from "@/lib/email";

// Helper to get organization branding
async function getOrganizationBranding(
  organizationId: string
): Promise<EmailBrandingConfig | undefined> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true, name: true },
  });

  if (!org) return undefined;

  const settings = org.settings as Record<string, unknown> | null;
  if (!settings) return { businessName: org.name };

  return {
    businessName: (settings.emailBusinessName as string) || org.name,
    fromEmail: settings.emailFromAddress as string | undefined,
    replyToEmail: settings.emailReplyTo as string | undefined,
    primaryColor: settings.emailPrimaryColor as string | undefined,
    logoUrl: settings.emailLogoUrl as string | undefined,
  };
}

// GET: Verify token and get appointment details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payload = verifyActionToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        endAt: true,
        duration: true,
        meetingType: true,
        meetingLink: true,
        location: true,
        phoneNumber: true,
        status: true,
        attendeeName: true,
        attendeeEmail: true,
        organization: {
          select: {
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify email matches
    if (
      appointment.attendeeEmail?.toLowerCase() !== payload.email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
    }

    const settings = appointment.organization?.settings as Record<
      string,
      unknown
    > | null;
    const businessName =
      (settings?.emailBusinessName as string) ||
      appointment.organization?.name ||
      "CallTone AI";

    // Build branding info for public pages
    const brandLogoUrl =
      (settings?.brandLogoUrl as string) ||
      (settings?.emailLogoUrl as string) ||
      null;
    const brandPrimaryColor =
      (settings?.brandPrimaryColor as string) ||
      (settings?.emailPrimaryColor as string) ||
      null;
    const brandPoweredByHidden =
      (settings?.poweredByHidden as boolean) || false;

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        title: appointment.title,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
        duration: appointment.duration,
        meetingType: appointment.meetingType,
        meetingLink: appointment.meetingLink,
        location: appointment.location,
        phoneNumber: appointment.phoneNumber,
        status: appointment.status,
        attendeeName: appointment.attendeeName,
      },
      action: payload.action,
      businessName,
      branding: {
        logoUrl: brandLogoUrl,
        primaryColor: brandPrimaryColor,
        brandName: businessName,
        poweredByHidden: brandPoweredByHidden,
      },
    });
  } catch (error) {
    console.error("[Appointment Action] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Execute the action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, reason, newDate, newTime } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payload = verifyActionToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      include: {
        organization: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify email matches
    if (
      appointment.attendeeEmail?.toLowerCase() !== payload.email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
    }

    // Check if appointment can be modified
    if (appointment.status === "cancelled") {
      return NextResponse.json(
        { error: "Appointment is already cancelled" },
        { status: 400 }
      );
    }

    if (appointment.status === "completed") {
      return NextResponse.json(
        { error: "Appointment is already completed" },
        { status: 400 }
      );
    }

    const branding = await getOrganizationBranding(appointment.organizationId);

    switch (action) {
      case "confirm": {
        const updated = await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "confirmed",
            confirmedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Appointment confirmed successfully",
          appointment: updated,
        });
      }

      case "cancel": {
        const updated = await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: reason || "Cancelled by attendee",
          },
        });

        // Send cancellation email
        if (appointment.attendeeEmail) {
          await sendAppointmentCancellation(
            appointment.attendeeEmail,
            appointment.attendeeName || "Customer",
            {
              title: appointment.title,
              scheduledAt: appointment.scheduledAt,
              reason: reason || "Cancelled by attendee",
            },
            branding
          );
        }

        return NextResponse.json({
          success: true,
          message: "Appointment cancelled successfully",
          appointment: updated,
        });
      }

      case "reschedule": {
        if (!newDate || !newTime) {
          return NextResponse.json(
            { error: "New date and time are required for rescheduling" },
            { status: 400 }
          );
        }

        // Parse new date and time
        const newScheduledAt = new Date(`${newDate}T${newTime}`);
        const newEndAt = new Date(
          newScheduledAt.getTime() + appointment.duration * 60000
        );

        // Store previous date for notification
        const previousDate = appointment.scheduledAt;

        const updated = await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            scheduledAt: newScheduledAt,
            endAt: newEndAt,
            status: "rescheduled",
            notes: appointment.notes
              ? `${appointment.notes}\n\nRescheduled from ${previousDate.toISOString()} by attendee`
              : `Rescheduled from ${previousDate.toISOString()} by attendee`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Appointment rescheduled successfully",
          appointment: updated,
          previousDate,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Appointment Action] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
