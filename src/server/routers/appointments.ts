import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentCancellation,
  sendAppointmentRescheduled,
  type EmailBrandingConfig,
} from "@/lib/email";
import { sendAppointmentSms } from "@/lib/sms";

// Helper to get organization branding settings
async function getOrganizationBranding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { organization: { findUnique: (args: { where: { id: string }; select: { settings: true; name: true } }) => Promise<{ settings: unknown; name: string } | null> } },
  organizationId: string
): Promise<EmailBrandingConfig | undefined> {
  const org = await db.organization.findUnique({
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

// Helper to generate time slots
function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  duration: number,
  bufferAfter: number,
  existingAppointments: { scheduledAt: Date; endAt: Date }[]
): string[] {
  const slots: string[] = [];
  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startHour = startParts[0] ?? 9;
  const startMin = startParts[1] ?? 0;
  const endHour = endParts[0] ?? 17;
  const endMin = endParts[1] ?? 0;

  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Check if slot doesn't overlap with existing appointments
    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(apt.endAt);
      // Add buffer after existing appointment
      aptEnd.setMinutes(aptEnd.getMinutes() + bufferAfter);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (!hasConflict && slotEnd <= dayEnd) {
      slots.push(slotStart.toISOString());
    }

    // Move to next slot
    slotStart.setMinutes(slotStart.getMinutes() + duration + bufferAfter);
  }

  return slots;
}

interface ListFilters {
  status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled" | "all";
  startDate?: string;
  endDate?: string;
  agentId?: string;
  contactId?: string;
  limit: number;
  cursor?: string;
}

export const appointmentsRouter = router({
  // List appointments with filters
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "rescheduled", "all"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.string().optional(),
        contactId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters: ListFilters = {
        status: input?.status,
        startDate: input?.startDate,
        endDate: input?.endDate,
        agentId: input?.agentId,
        contactId: input?.contactId,
        limit: input?.limit ?? 50,
        cursor: input?.cursor,
      };
      const where: Record<string, unknown> = {
        organizationId: ctx.orgId,
      };

      if (filters.status && filters.status !== "all") {
        where.status = filters.status;
      }

      if (filters.startDate) {
        where.scheduledAt = { gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        where.scheduledAt = {
          ...(where.scheduledAt as Record<string, Date> || {}),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.agentId) {
        where.agentId = filters.agentId;
      }

      if (filters.contactId) {
        where.contactId = filters.contactId;
      }

      const appointments = await ctx.db.appointment.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              company: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
          call: {
            select: {
              id: true,
              vapiCallId: true,
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: filters.limit + 1,
        cursor: filters.cursor ? { id: filters.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (appointments.length > filters.limit) {
        const nextItem = appointments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        appointments,
        nextCursor,
      };
    }),

  // Get single appointment
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const appointment = await ctx.db.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          contact: true,
          agent: true,
          call: true,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      return appointment;
    }),

  // Create appointment
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        scheduledAt: z.string(), // ISO date string
        duration: z.number().min(15).max(480).default(30),
        timeZone: z.string().default("America/New_York"),
        meetingType: z.enum(["phone", "video", "in_person"]).default("phone"),
        meetingLink: z.string().url().optional(),
        location: z.string().optional(),
        phoneNumber: z.string().optional(),
        contactId: z.string().optional(),
        agentId: z.string().optional(),
        callId: z.string().optional(),
        attendeeName: z.string().optional(),
        attendeeEmail: z.string().email().optional(),
        attendeePhone: z.string().optional(),
        notes: z.string().optional(),
        sendConfirmation: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scheduledAt = new Date(input.scheduledAt);
      const endAt = new Date(scheduledAt.getTime() + input.duration * 60000);

      // Check for conflicts
      const conflictingAppointment = await ctx.db.appointment.findFirst({
        where: {
          organizationId: ctx.orgId,
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
        throw new TRPCError({
          code: "CONFLICT",
          message: "This time slot conflicts with an existing appointment",
        });
      }

      // Get contact info if contactId provided
      let attendeeInfo: {
        attendeeName: string | null | undefined;
        attendeeEmail: string | null | undefined;
        attendeePhone: string | null | undefined;
      } = {
        attendeeName: input.attendeeName,
        attendeeEmail: input.attendeeEmail,
        attendeePhone: input.attendeePhone,
      };

      if (input.contactId) {
        const contact = await ctx.db.contact.findFirst({
          where: { id: input.contactId, organizationId: ctx.orgId },
        });
        if (contact) {
          attendeeInfo = {
            attendeeName: attendeeInfo.attendeeName || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || undefined,
            attendeeEmail: attendeeInfo.attendeeEmail || contact.email || undefined,
            attendeePhone: attendeeInfo.attendeePhone || contact.phoneNumber || undefined,
          };
        }
      }

      const appointment = await ctx.db.appointment.create({
        data: {
          organizationId: ctx.orgId,
          title: input.title,
          description: input.description,
          scheduledAt,
          endAt,
          duration: input.duration,
          timeZone: input.timeZone,
          meetingType: input.meetingType,
          meetingLink: input.meetingLink,
          location: input.location,
          phoneNumber: input.phoneNumber,
          contactId: input.contactId,
          agentId: input.agentId,
          callId: input.callId,
          attendeeName: attendeeInfo.attendeeName,
          attendeeEmail: attendeeInfo.attendeeEmail,
          attendeePhone: attendeeInfo.attendeePhone,
          notes: input.notes,
          status: "scheduled",
        },
        include: {
          contact: true,
          agent: true,
        },
      });

      // Send confirmation email if requested and email available
      if (input.sendConfirmation && attendeeInfo.attendeeEmail) {
        try {
          // Get organization branding for the email
          const branding = await getOrganizationBranding(ctx.db, ctx.orgId);

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
              appointmentId: appointment.id, // Include for action links
            },
            branding
          );
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
          // Don't fail the appointment creation
        }
      }

      // Send confirmation SMS if requested and phone available
      if (input.sendConfirmation && attendeeInfo.attendeePhone) {
        try {
          await sendAppointmentSms({
            appointmentId: appointment.id,
            type: "confirmation",
          });
        } catch (error) {
          console.error("Failed to send confirmation SMS:", error);
          // Don't fail the appointment creation
        }
      }

      return appointment;
    }),

  // Update appointment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        scheduledAt: z.string().optional(),
        duration: z.number().min(15).max(480).optional(),
        timeZone: z.string().optional(),
        meetingType: z.enum(["phone", "video", "in_person"]).optional(),
        meetingLink: z.string().url().optional().nullable(),
        location: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "rescheduled"]).optional(),
        notes: z.string().optional(),
        cancelReason: z.string().optional(),
        notifyAttendee: z.boolean().default(true),
        // Attendee info - for correcting AI transcription errors
        attendeeName: z.string().optional().nullable(),
        attendeeEmail: z.string().email().optional().nullable(),
        attendeePhone: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      const updateData: Record<string, unknown> = {};

      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.timeZone) updateData.timeZone = input.timeZone;
      if (input.meetingType) updateData.meetingType = input.meetingType;
      if (input.meetingLink !== undefined) updateData.meetingLink = input.meetingLink;
      if (input.location !== undefined) updateData.location = input.location;
      if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;
      if (input.notes !== undefined) updateData.notes = input.notes;
      // Attendee info - useful for correcting AI transcription errors
      if (input.attendeeName !== undefined) updateData.attendeeName = input.attendeeName;
      if (input.attendeeEmail !== undefined) updateData.attendeeEmail = input.attendeeEmail;
      if (input.attendeePhone !== undefined) updateData.attendeePhone = input.attendeePhone;

      // Handle rescheduling
      if (input.scheduledAt || input.duration) {
        const newScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : existing.scheduledAt;
        const newDuration = input.duration || existing.duration;
        const newEndAt = new Date(newScheduledAt.getTime() + newDuration * 60000);

        // Check for conflicts (excluding current appointment)
        const conflict = await ctx.db.appointment.findFirst({
          where: {
            organizationId: ctx.orgId,
            id: { not: input.id },
            status: { in: ["scheduled", "confirmed"] },
            OR: [
              {
                scheduledAt: { lte: newScheduledAt },
                endAt: { gt: newScheduledAt },
              },
              {
                scheduledAt: { lt: newEndAt },
                endAt: { gte: newEndAt },
              },
            ],
          },
        });

        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This time slot conflicts with an existing appointment",
          });
        }

        updateData.scheduledAt = newScheduledAt;
        updateData.endAt = newEndAt;
        updateData.duration = newDuration;

        // Mark as rescheduled if time changed
        if (input.scheduledAt && existing.scheduledAt.toISOString() !== newScheduledAt.toISOString()) {
          updateData.status = "rescheduled";
        }
      }

      // Handle status changes
      if (input.status) {
        updateData.status = input.status;
        if (input.status === "confirmed") {
          updateData.confirmedAt = new Date();
        } else if (input.status === "cancelled") {
          updateData.cancelledAt = new Date();
          updateData.cancelReason = input.cancelReason;
        } else if (input.status === "completed") {
          updateData.completedAt = new Date();
        }
      }

      const appointment = await ctx.db.appointment.update({
        where: { id: input.id },
        data: updateData,
        include: {
          contact: true,
          agent: true,
        },
      });

      // Send rescheduled email if the time was changed and notification is enabled
      if (
        updateData.status === "rescheduled" &&
        existing.attendeeEmail &&
        input.scheduledAt &&
        input.notifyAttendee
      ) {
        try {
          const branding = await getOrganizationBranding(ctx.db, ctx.orgId);
          await sendAppointmentRescheduled(
            existing.attendeeEmail,
            existing.attendeeName || "there",
            {
              title: appointment.title,
              scheduledAt: appointment.scheduledAt,
              duration: appointment.duration,
              meetingType: appointment.meetingType,
              meetingLink: appointment.meetingLink,
              location: appointment.location,
              phoneNumber: appointment.phoneNumber,
              appointmentId: appointment.id, // Include for action links
            },
            existing.scheduledAt, // Previous date
            branding
          );
        } catch (error) {
          console.error("Failed to send rescheduled email:", error);
          // Don't fail the update
        }
      }

      return appointment;
    }),

  // Cancel appointment
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
        notifyAttendee: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.db.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      if (appointment.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Appointment is already cancelled",
        });
      }

      const updated = await ctx.db.appointment.update({
        where: { id: input.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: input.reason,
        },
      });

      // Send cancellation email
      if (input.notifyAttendee && appointment.attendeeEmail) {
        try {
          const branding = await getOrganizationBranding(ctx.db, ctx.orgId);
          await sendAppointmentCancellation(
            appointment.attendeeEmail,
            appointment.attendeeName || "there",
            {
              title: appointment.title,
              scheduledAt: appointment.scheduledAt,
              reason: input.reason,
            },
            branding
          );
        } catch (error) {
          console.error("Failed to send cancellation email:", error);
        }
      }

      return updated;
    }),

  // Resend confirmation email
  resendConfirmation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.db.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      if (!appointment.attendeeEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address on file for this appointment",
        });
      }

      if (appointment.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send confirmation for cancelled appointment",
        });
      }

      try {
        // Get organization branding
        const branding = await getOrganizationBranding(ctx.db, ctx.orgId);

        await sendAppointmentConfirmation(
          appointment.attendeeEmail,
          appointment.attendeeName || "there",
          {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
            appointmentId: appointment.id, // Include for action links
          },
          branding
        );

        return { success: true, message: `Confirmation email sent to ${appointment.attendeeEmail}` };
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send confirmation email. Please try again.",
        });
      }
    }),

  // Delete appointment
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.db.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found",
        });
      }

      await ctx.db.appointment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get available time slots
  getAvailableSlots: protectedProcedure
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
        duration: z.number().min(15).max(480).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get calendar settings
      const settings = await ctx.db.calendarSettings.findUnique({
        where: { organizationId: ctx.orgId },
      });

      // Use defaults if no settings
      const availableDays = settings?.availableDays as number[] || [1, 2, 3, 4, 5];
      const startTime = settings?.startTime || "09:00";
      const endTime = settings?.endTime || "17:00";
      const bufferAfter = settings?.bufferAfter || 15;

      const date = new Date(input.date);
      const dayOfWeek = date.getDay();

      // Check if day is available
      if (!availableDays.includes(dayOfWeek)) {
        return { slots: [], message: "This day is not available for appointments" };
      }

      // Check min notice time
      const now = new Date();
      const minNoticeHours = settings?.minNoticeTime || 24;
      const minNoticeDate = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

      if (date < new Date(now.toDateString())) {
        return { slots: [], message: "Cannot book appointments in the past" };
      }

      // Get existing appointments for the day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const existingAppointments = await ctx.db.appointment.findMany({
        where: {
          organizationId: ctx.orgId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: {
          scheduledAt: true,
          endAt: true,
        },
      });

      // Generate available slots
      const slots = generateTimeSlots(
        date,
        startTime,
        endTime,
        input.duration,
        bufferAfter,
        existingAppointments
      );

      // Filter out slots that don't meet min notice requirement
      const availableSlots = slots.filter((slot) => new Date(slot) >= minNoticeDate);

      return { slots: availableSlots };
    }),

  // Get calendar settings
  getCalendarSettings: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.db.calendarSettings.findUnique({
      where: { organizationId: ctx.orgId },
    });

    // Return defaults if no settings exist
    if (!settings) {
      settings = {
        id: "",
        organizationId: ctx.orgId,
        timeZone: "America/New_York",
        availableDays: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "17:00",
        defaultDuration: 30,
        bufferBefore: 0,
        bufferAfter: 15,
        maxAdvanceBooking: 30,
        minNoticeTime: 24,
        allowPhone: true,
        allowVideo: true,
        allowInPerson: false,
        videoProvider: null,
        videoApiKey: null,
        googleCalendarId: null,
        googleRefreshToken: null,
        outlookCalendarId: null,
        outlookRefreshToken: null,
        sendConfirmation: true,
        sendReminder: true,
        reminderHoursBefore: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return settings;
  }),

  // Update calendar settings
  updateCalendarSettings: adminProcedure
    .input(
      z.object({
        timeZone: z.string().optional(),
        availableDays: z.array(z.number().min(0).max(6)).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        defaultDuration: z.number().min(15).max(480).optional(),
        bufferBefore: z.number().min(0).max(120).optional(),
        bufferAfter: z.number().min(0).max(120).optional(),
        maxAdvanceBooking: z.number().min(1).max(365).optional(),
        minNoticeTime: z.number().min(0).max(168).optional(),
        allowPhone: z.boolean().optional(),
        allowVideo: z.boolean().optional(),
        allowInPerson: z.boolean().optional(),
        sendConfirmation: z.boolean().optional(),
        sendReminder: z.boolean().optional(),
        reminderHoursBefore: z.number().min(1).max(168).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.calendarSettings.upsert({
        where: { organizationId: ctx.orgId },
        create: {
          organizationId: ctx.orgId,
          ...input,
        },
        update: input,
      });

      return settings;
    }),

  // Get appointment stats
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const dateFilter = {
        gte: input?.startDate ? new Date(input.startDate) : startOfMonth,
        lte: input?.endDate ? new Date(input.endDate) : endOfMonth,
      };

      const [total, scheduled, confirmed, completed, cancelled, noShow] = await Promise.all([
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, scheduledAt: dateFilter },
        }),
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, status: "scheduled", scheduledAt: dateFilter },
        }),
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, status: "confirmed", scheduledAt: dateFilter },
        }),
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, status: "completed", scheduledAt: dateFilter },
        }),
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, status: "cancelled", scheduledAt: dateFilter },
        }),
        ctx.db.appointment.count({
          where: { organizationId: ctx.orgId, status: "no_show", scheduledAt: dateFilter },
        }),
      ]);

      // Upcoming appointments (next 7 days)
      const upcoming = await ctx.db.appointment.count({
        where: {
          organizationId: ctx.orgId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      return {
        total,
        scheduled,
        confirmed,
        completed,
        cancelled,
        noShow,
        upcoming,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      };
    }),
});
