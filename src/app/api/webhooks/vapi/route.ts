import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger("Vapi Webhook");
const toolLog = createLogger("Vapi Tool");

// Dynamic imports to avoid build-time database connection
const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

const getAnalyzeCall = async () => {
  const { analyzeCall } = await import("@/server/services/call-analysis.service");
  return analyzeCall;
};

const getEmailService = async () => {
  const { sendAppointmentConfirmation } = await import("@/lib/email");
  return { sendAppointmentConfirmation };
};

// Helper to get organization branding settings
async function getOrganizationBranding(
  db: Awaited<ReturnType<typeof getDb>>,
  organizationId: string
) {
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

// Vapi webhook event types
interface VapiWebhookEvent {
  type: string;
  call?: {
    id: string;
    assistantId?: string;
    phoneNumberId?: string;
    status?: string;
    startedAt?: string;
    endedAt?: string;
    // Vapi may send transcript as a string OR an array of message objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transcript?: string | any[];
    recordingUrl?: string;
    customer?: {
      number: string;
    };
    metadata?: Record<string, string>;
  };
  // For tool/function calls
  message?: {
    type: string;
    toolCalls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string | Record<string, unknown>;
      };
    }>;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string | Record<string, unknown>;
      };
    }>;
  };
}

/**
 * Normalize transcript from Vapi — handles both string and array-of-messages format.
 * Vapi v2 sends transcript as an array: [{ role: "assistant", message: "..." }, ...]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTranscript(transcript: string | any[] | undefined): string | undefined {
  if (!transcript) return undefined;
  if (typeof transcript === "string") return transcript;
  if (Array.isArray(transcript)) {
    return transcript
      .map((msg) => {
        const role = msg.role || "unknown";
        const text = msg.message || msg.content || msg.text || "";
        return `${role}: ${text}`;
      })
      .join("\n");
  }
  return String(transcript);
}

// Tool call result interface
interface ToolCallResult {
  toolCallId: string;
  result: string;
}

// Helper to format time for display
function formatTimeForDisplay(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Helper to generate time slots (similar to appointments router)
function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  duration: number,
  bufferAfter: number,
  existingAppointments: Array<{ scheduledAt: Date; endAt: Date }>
): string[] {
  const slots: string[] = [];
  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startH = startParts[0] ?? 9;
  const startM = startParts[1] ?? 0;
  const endH = endParts[0] ?? 17;
  const endM = endParts[1] ?? 0;

  const slotStart = new Date(date);
  slotStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(apt.endAt);
      aptEnd.setMinutes(aptEnd.getMinutes() + bufferAfter);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (!hasConflict && slotEnd <= dayEnd) {
      const timeStr = `${slotStart.getHours().toString().padStart(2, "0")}:${slotStart.getMinutes().toString().padStart(2, "0")}`;
      slots.push(timeStr);
    }

    slotStart.setMinutes(slotStart.getMinutes() + duration + bufferAfter);
  }

  return slots;
}

// Process tool calls
async function processToolCall(
  toolName: string,
  args: Record<string, string>,
  organizationId: string,
  agentId: string | undefined,
  customerPhone: string | undefined
): Promise<string> {
  toolLog.debug("Processing tool call:", {
    toolName,
    args,
    organizationId,
    agentId,
    customerPhone,
  });

  const db = await getDb();

  try {
    switch (toolName) {
    case "check_availability": {
      const { date, duration: durationStr } = args;
      const duration = parseInt(durationStr || "30", 10);

      if (!date) {
        return "I need a date to check availability. Please provide a date.";
      }

      // Parse the date
      const checkDate = new Date(date);
      if (isNaN(checkDate.getTime())) {
        return "I couldn't understand that date. Please provide it in YYYY-MM-DD format.";
      }

      // Get calendar settings
      const settings = await db.calendarSettings.findUnique({
        where: { organizationId },
      });

      const availableDays = (settings?.availableDays as number[]) || [1, 2, 3, 4, 5];
      const startTime = settings?.startTime || "09:00";
      const endTime = settings?.endTime || "17:00";
      const bufferAfter = settings?.bufferAfter || 15;

      // Check if day is available
      const dayOfWeek = checkDate.getDay();
      if (!availableDays.includes(dayOfWeek)) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return `Sorry, we don't have availability on ${dayNames[dayOfWeek]}s. We're available on ${availableDays.map(d => dayNames[d]).join(", ")}.`;
      }

      // Check min notice time
      const now = new Date();
      const minNoticeHours = settings?.minNoticeTime || 24;
      const minNoticeDate = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

      if (checkDate < new Date(now.toDateString())) {
        return "I can't check availability for past dates. Please provide a future date.";
      }

      // Get existing appointments
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);

      const existingAppointments = await db.appointment.findMany({
        where: {
          organizationId,
          status: { in: ["scheduled", "confirmed"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: { scheduledAt: true, endAt: true },
      });

      const slots = generateTimeSlots(
        checkDate,
        startTime,
        endTime,
        duration,
        bufferAfter,
        existingAppointments
      );

      // Filter slots that meet min notice
      const availableSlots = slots.filter((slot) => {
        const timeParts = slot.split(":").map(Number);
        const h = timeParts[0] ?? 0;
        const m = timeParts[1] ?? 0;
        const slotDate = new Date(checkDate);
        slotDate.setHours(h, m, 0, 0);
        return slotDate >= minNoticeDate;
      });

      if (availableSlots.length === 0) {
        return `I'm sorry, there are no available time slots on ${checkDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}. Would you like to check another date?`;
      }

      // Format slots for speaking
      const formattedSlots = availableSlots.slice(0, 6).map(formatTimeForDisplay);
      const dateStr = checkDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      if (formattedSlots.length === 1) {
        return `I have one available time slot on ${dateStr}: ${formattedSlots[0]}. Would that work for you?`;
      }

      return `I have ${availableSlots.length} available time slots on ${dateStr}. Here are some options: ${formattedSlots.join(", ")}. Which time works best for you?`;
    }

    case "schedule_appointment": {
      const {
        date,
        time,
        duration: durationStr,
        customer_name,
        customer_email,
        customer_phone,
        meeting_type,
        notification_preference,
        notes,
      } = args;

      if (!date || !time || !customer_name) {
        return "I need the date, time, and your name to schedule the appointment.";
      }

      const duration = parseInt(durationStr || "30", 10);

      // Parse date and time
      const dateParts = date.split("-").map(Number);
      const timeParts = time.split(":").map(Number);
      const year = dateParts[0] ?? 2024;
      const month = dateParts[1] ?? 1;
      const day = dateParts[2] ?? 1;
      const hours = timeParts[0] ?? 0;
      const minutes = timeParts[1] ?? 0;

      const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (isNaN(scheduledAt.getTime())) {
        return "I couldn't understand the date or time. Please try again.";
      }

      const endAt = new Date(scheduledAt.getTime() + duration * 60000);

      // Check for conflicts one more time
      const conflict = await db.appointment.findFirst({
        where: {
          organizationId,
          status: { in: ["scheduled", "confirmed"] },
          OR: [
            { scheduledAt: { lte: scheduledAt }, endAt: { gt: scheduledAt } },
            { scheduledAt: { lt: endAt }, endAt: { gte: endAt } },
          ],
        },
      });

      if (conflict) {
        return "I'm sorry, that time slot is no longer available. Would you like me to check for other available times?";
      }

      // Validate notification preference
      const validPreferences = ["email", "sms", "both", "none"];
      const notifPref = notification_preference && validPreferences.includes(notification_preference)
        ? notification_preference
        : "both"; // Default to both if not specified

      // Create the appointment with notification preference
      const appointment = await db.appointment.create({
        data: {
          organizationId,
          agentId,
          title: `Appointment with ${customer_name}`,
          scheduledAt,
          endAt,
          duration,
          timeZone: (await (async () => {
            const { getOrgTimezone } = await import("@/lib/timezone");
            return getOrgTimezone(organizationId);
          })()),
          meetingType: meeting_type || "phone",
          attendeeName: customer_name,
          attendeeEmail: customer_email,
          attendeePhone: customer_phone || customerPhone,
          notificationPreference: notifPref,
          notes,
          status: "scheduled",
        },
      });

      // Determine what notifications to send based on preference
      const shouldSendEmail = notifPref === "email" || notifPref === "both";
      const shouldSendSms = notifPref === "sms" || notifPref === "both";

      // Send confirmation email if preference allows and we have an email
      if (shouldSendEmail && customer_email) {
        try {
          const { sendAppointmentConfirmation } = await getEmailService();
          const branding = await getOrganizationBranding(db, organizationId);
          await sendAppointmentConfirmation(customer_email, customer_name, {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
            appointmentId: appointment.id, // Include ID for action links
          }, branding);
        } catch (error) {
          toolLog.error("Failed to send confirmation email:", error);
        }
      }

      // Send confirmation SMS if preference allows and we have a phone
      const phoneForSms = customer_phone || customerPhone;
      if (shouldSendSms && phoneForSms) {
        try {
          const { sendAppointmentSms } = await import("@/lib/sms");
          await sendAppointmentSms({
            appointmentId: appointment.id,
            type: "confirmation",
          });
        } catch (error) {
          toolLog.error("Failed to send confirmation SMS:", error);
        }
      }

      const dateStr = scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const timeStr = formatTimeForDisplay(time);

      let response = `I've scheduled your appointment for ${dateStr} at ${timeStr}.`;
      if (shouldSendEmail && customer_email) {
        response += ` A confirmation email has been sent to ${customer_email}.`;
      }
      if (shouldSendSms && phoneForSms) {
        response += ` You'll also receive a text message confirmation.`;
      }
      response += " Is there anything else I can help you with?";

      return response;
    }

    case "update_appointment": {
      const { customer_name, customer_phone, customer_email, notes } = args;

      if (!customer_name && !customer_phone && !customerPhone) {
        return "I need your name or phone number to find your appointment.";
      }

      // Find the most recent appointment for this customer
      const whereClause: Record<string, unknown> = {
        organizationId,
        status: { in: ["scheduled", "confirmed"] },
        scheduledAt: { gte: new Date() },
      };

      // Try to find by name first, then by phone
      if (customer_name) {
        whereClause.attendeeName = { contains: customer_name, mode: "insensitive" };
      }
      if (customer_phone || customerPhone) {
        whereClause.attendeePhone = customer_phone || customerPhone;
      }

      const appointment = await db.appointment.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" }, // Get the most recently created one
      });

      if (!appointment) {
        return "I couldn't find an upcoming appointment with that information. Let me schedule a new one for you instead.";
      }

      // Update the appointment with new info
      const updateData: Record<string, unknown> = {};
      if (customer_email) {
        updateData.attendeeEmail = customer_email;
      }
      if (notes) {
        updateData.notes = appointment.notes
          ? `${appointment.notes}\n${notes}`
          : notes;
      }

      if (Object.keys(updateData).length === 0) {
        return "Your appointment is already up to date!";
      }

      await db.appointment.update({
        where: { id: appointment.id },
        data: updateData,
      });

      // Send confirmation email if we just added an email
      if (customer_email) {
        try {
          const { sendAppointmentConfirmation } = await getEmailService();
          const branding = await getOrganizationBranding(db, organizationId);
          await sendAppointmentConfirmation(customer_email, appointment.attendeeName || customer_name || "Customer", {
            title: appointment.title,
            scheduledAt: appointment.scheduledAt,
            duration: appointment.duration,
            meetingType: appointment.meetingType,
            meetingLink: appointment.meetingLink,
            location: appointment.location,
            phoneNumber: appointment.phoneNumber,
            appointmentId: appointment.id, // Include ID for action links
          }, branding);
        } catch (error) {
          toolLog.error("Failed to send confirmation email:", error);
        }
      }

      const dateStr = appointment.scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const timeStr = formatTimeForDisplay(
        `${appointment.scheduledAt.getHours().toString().padStart(2, "0")}:${appointment.scheduledAt.getMinutes().toString().padStart(2, "0")}`
      );

      let response = `I've updated your appointment for ${dateStr} at ${timeStr}.`;
      if (customer_email) {
        response += ` A confirmation email has been sent to ${customer_email}.`;
      }
      response += " Is there anything else I can help you with?";

      return response;
    }

    case "cancel_appointment": {
      const { customer_email, customer_phone, reason } = args;

      // Find the appointment
      const whereClause: Record<string, unknown> = {
        organizationId,
        status: { in: ["scheduled", "confirmed"] },
        scheduledAt: { gte: new Date() },
      };

      if (customer_email) {
        whereClause.attendeeEmail = customer_email;
      } else if (customer_phone || customerPhone) {
        whereClause.attendeePhone = customer_phone || customerPhone;
      } else {
        return "I need your email or phone number to find your appointment.";
      }

      const appointment = await db.appointment.findFirst({
        where: whereClause,
        orderBy: { scheduledAt: "asc" },
      });

      if (!appointment) {
        return "I couldn't find an upcoming appointment with that information. Could you please verify your email or phone number?";
      }

      // Cancel the appointment
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      const dateStr = appointment.scheduledAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      return `I've cancelled your appointment that was scheduled for ${dateStr}. Would you like to schedule a new appointment?`;
    }

    // ==========================================
    // Receptionist Tools
    // ==========================================

    case "lookup_directory": {
      const { query } = args;
      if (!query) {
        return "I need to know who or what department you're looking for. Could you tell me more?";
      }

      const queryLower = query.toLowerCase();

      // Search departments by name and description
      const departments = await db.department.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          staffMembers: {
            where: { isAvailable: true },
            select: { name: true, role: true, phoneNumber: true, isAvailable: true },
          },
        },
      });

      // Also search staff by name
      const staffMatches = await db.staffMember.findMany({
        where: {
          organizationId,
          name: { contains: query, mode: "insensitive" },
        },
        include: {
          department: { select: { name: true, phoneNumber: true, businessHours: true } },
        },
      });

      if (departments.length === 0 && staffMatches.length === 0) {
        // Broad search — get all departments for the user
        const allDepts = await db.department.findMany({
          where: { organizationId, isActive: true },
          include: { staffMembers: { where: { isAvailable: true }, select: { name: true, role: true } } },
        });

        if (allDepts.length === 0) {
          return "I don't have a directory set up yet. Let me take a message for you instead.";
        }

        const listing = allDepts.map((d) => {
          const staff = d.staffMembers.map((s) => `${s.name}${s.role ? ` (${s.role})` : ""}`).join(", ");
          return `${d.name}${d.description ? ` — ${d.description}` : ""}${staff ? `. Staff: ${staff}` : ""}`;
        }).join("; ");

        return `I couldn't find an exact match for "${query}". Here are our departments: ${listing}. Which one would you like?`;
      }

      // Build response
      const parts: string[] = [];

      if (departments.length > 0) {
        for (const dept of departments) {
          const { isWithinBusinessHours } = await import("@/lib/business-hours");
          const hours = dept.businessHours as Record<string, unknown>;
          const isOpen = hours ? isWithinBusinessHours(hours as any) : true;
          const staff = dept.staffMembers.map((s) => `${s.name}${s.role ? ` (${s.role})` : ""}`).join(", ");
          parts.push(
            `${dept.name} department — ${isOpen ? "currently open" : "currently closed"}. ` +
            `Phone: ${dept.phoneNumber || "no direct line"}. ` +
            (staff ? `Available staff: ${staff}.` : "No staff currently available.")
          );
        }
      }

      if (staffMatches.length > 0) {
        for (const staff of staffMatches) {
          parts.push(
            `${staff.name}${staff.role ? ` (${staff.role})` : ""} in ${staff.department.name} department. ` +
            `${staff.isAvailable ? "Currently available" : "Currently unavailable"}.` +
            (staff.phoneNumber ? ` Direct: ${staff.phoneNumber}.` : "")
          );
        }
      }

      return parts.join(" ");
    }

    case "check_staff_availability": {
      const { department_name, staff_name } = args;

      if (staff_name) {
        const staff = await db.staffMember.findFirst({
          where: {
            organizationId,
            name: { contains: staff_name, mode: "insensitive" },
          },
          include: { department: { select: { name: true, phoneNumber: true, businessHours: true } } },
        });

        if (!staff) {
          return `I couldn't find anyone named ${staff_name} in our directory.`;
        }

        const { isWithinBusinessHours } = await import("@/lib/business-hours");
        const deptHours = staff.department.businessHours as Record<string, unknown>;
        const deptOpen = deptHours ? isWithinBusinessHours(deptHours as any) : true;

        if (!staff.isAvailable) {
          return `${staff.name} is currently marked as unavailable. Would you like me to take a message for them?`;
        }
        if (!deptOpen) {
          return `The ${staff.department.name} department is currently closed. ${staff.name} would normally be available during business hours. Would you like me to take a message?`;
        }

        return `${staff.name} is available right now.${staff.phoneNumber ? ` Their number is ${staff.phoneNumber}.` : ""} Would you like me to transfer you?`;
      }

      if (department_name) {
        const dept = await db.department.findFirst({
          where: {
            organizationId,
            name: { contains: department_name, mode: "insensitive" },
            isActive: true,
          },
          include: {
            staffMembers: {
              where: { isAvailable: true },
              select: { name: true, role: true, phoneNumber: true },
            },
          },
        });

        if (!dept) {
          return `I couldn't find a ${department_name} department.`;
        }

        const { isWithinBusinessHours } = await import("@/lib/business-hours");
        const hours = dept.businessHours as Record<string, unknown>;
        const isOpen = hours ? isWithinBusinessHours(hours as any) : true;

        if (!isOpen) {
          return `The ${dept.name} department is currently closed. Would you like me to take a message?`;
        }

        if (dept.staffMembers.length === 0) {
          return `The ${dept.name} department is open but no staff members are currently available. Would you like me to take a message?`;
        }

        const available = dept.staffMembers.map((s) => s.name).join(", ");
        return `The ${dept.name} department is open. Available staff: ${available}.${dept.phoneNumber ? ` Department phone: ${dept.phoneNumber}.` : ""} Would you like me to transfer you?`;
      }

      return "I need either a department name or a person's name to check availability. Who are you looking for?";
    }

    case "take_message": {
      const {
        caller_name,
        caller_phone,
        caller_email,
        caller_company,
        message_body,
        department_name,
        staff_name,
        urgency,
      } = args;

      if (!caller_name || !message_body) {
        return "I need at least your name and the message to leave. Could you provide those?";
      }

      // Resolve department
      let departmentId: string | null = null;
      let staffMemberId: string | null = null;

      if (department_name) {
        const dept = await db.department.findFirst({
          where: { organizationId, name: { contains: department_name, mode: "insensitive" } },
        });
        if (dept) departmentId = dept.id;
      }

      if (staff_name) {
        const staff = await db.staffMember.findFirst({
          where: { organizationId, name: { contains: staff_name, mode: "insensitive" } },
          include: { department: true },
        });
        if (staff) {
          staffMemberId = staff.id;
          if (!departmentId) departmentId = staff.departmentId;
        }
      }

      // Create the message
      const message = await db.receptionistMessage.create({
        data: {
          organizationId,
          agentId: agentId || null,
          callId: null, // We don't have direct call ID in tool context
          departmentId,
          staffMemberId,
          callerName: caller_name,
          callerPhone: caller_phone || customerPhone || null,
          callerEmail: caller_email || null,
          callerCompany: caller_company || null,
          body: message_body,
          urgency: urgency || "normal",
          status: "new",
        },
      });

      // Send notifications
      // Try to find email for the target staff/department
      let notifyEmail: string | null = null;
      let notifyPhone: string | null = null;

      if (staffMemberId) {
        const staff = await db.staffMember.findUnique({
          where: { id: staffMemberId },
          select: { email: true, phoneNumber: true },
        });
        notifyEmail = staff?.email || null;
        notifyPhone = staff?.phoneNumber || null;
      }

      if (!notifyEmail && departmentId) {
        const dept = await db.department.findUnique({
          where: { id: departmentId },
          select: { email: true },
        });
        notifyEmail = dept?.email || null;
      }

      // Send email notification
      if (notifyEmail) {
        try {
          const { sendReceptionistMessageNotification } = await import("@/lib/email");
          await sendReceptionistMessageNotification(notifyEmail, {
            callerName: caller_name,
            callerPhone: caller_phone || customerPhone || undefined,
            callerCompany: caller_company,
            body: message_body,
            urgency: urgency || "normal",
            messageId: message.id,
          });
        } catch (error) {
          toolLog.error("Failed to send message notification email:", error);
        }
      }

      // Send SMS notification
      if (notifyPhone) {
        try {
          const { sendReceptionistMessageSms } = await import("@/lib/sms");
          await sendReceptionistMessageSms(organizationId, notifyPhone, {
            callerName: caller_name,
            callerPhone: caller_phone || customerPhone || undefined,
            body: message_body,
            urgency: urgency || "normal",
          });
        } catch (error) {
          toolLog.error("Failed to send message notification SMS:", error);
        }
      }

      // Audit log
      try {
        await db.auditLog.create({
          data: {
            organizationId,
            action: "receptionist.message_taken",
            entityType: "ReceptionistMessage",
            entityId: message.id,
            details: {
              callerName: caller_name,
              departmentId,
              staffMemberId,
              urgency: urgency || "normal",
            },
          },
        });
      } catch (error) {
        toolLog.error("Failed to create audit log:", error);
      }

      let response = `I've taken your message, ${caller_name}. `;
      if (staff_name) {
        response += `${staff_name} will receive your message`;
      } else if (department_name) {
        response += `The ${department_name} department will receive your message`;
      } else {
        response += "Your message has been recorded";
      }
      response += " and someone will get back to you";
      if (caller_phone || customerPhone) {
        response += ` at ${caller_phone || customerPhone}`;
      }
      response += ". Is there anything else I can help you with?";

      return response;
    }

    default:
      toolLog.warn("Unknown tool:", toolName);
      return `I'm not sure how to handle that request. Is there something else I can help you with?`;
    }
  } catch (error) {
    toolLog.error("Error processing tool call:", error);
    return "I'm having trouble processing your request right now. Please try again.";
  }
}

/**
 * Verify Vapi webhook secret
 * Vapi sends the secret in the x-vapi-secret header
 */
async function verifySignature(req: NextRequest, _body: string): Promise<boolean> {
  const vapiSecret = req.headers.get("x-vapi-secret");
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    log.warn("VAPI_WEBHOOK_SECRET not configured - skipping signature verification");
    return true;
  }

  if (!vapiSecret) {
    log.error("Missing x-vapi-secret header");
    return false;
  }

  // Simple comparison - Vapi sends the secret directly in the header
  // Use timing-safe comparison to prevent timing attacks
  try {
    const secretBuffer = Buffer.from(secret);
    const vapiSecretBuffer = Buffer.from(vapiSecret);

    if (secretBuffer.length !== vapiSecretBuffer.length) {
      log.error("Secret length mismatch");
      return false;
    }

    const isValid = crypto.timingSafeEqual(secretBuffer, vapiSecretBuffer);
    if (!isValid) {
      log.error("Secret mismatch");
    }
    return isValid;
  } catch (error) {
    log.error("Secret verification error:", error);
    return false;
  }
}

/**
 * Calculate cost in cents based on call duration
 * Vapi pricing: approximately $0.05-0.15/min depending on model
 */
function calculateCostCents(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  const costPerMinuteCents = 10; // $0.10 per minute (adjust based on actual Vapi pricing)
  return minutes * costPerMinuteCents;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const isValid = await verifySignature(req, rawBody);
    if (!isValid) {
      log.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as VapiWebhookEvent;
    const { type, call, message } = body;

    log.debug(`Received event: ${type}`, {
      callId: call?.id,
      messageType: message?.type,
    });

    // Handle tool/function calls (Vapi sends these as assistant-request or tool-calls)
    if (message?.type === "tool-calls" || message?.toolCalls || message?.toolCallList) {
      const toolCalls = message.toolCalls || message.toolCallList || [];

      if (toolCalls.length > 0) {
        const db = await getDb();

        // Get organization from call metadata or assistant
        let organizationId = call?.metadata?.organizationId;
        let agentId = call?.metadata?.agentId;
        const customerPhone = call?.customer?.number;

        // Try to get from call.assistantId
        if (!organizationId && call?.assistantId) {
          const agent = await db.agent.findFirst({
            where: { vapiAssistantId: call.assistantId },
            select: { id: true, organizationId: true },
          });
          if (agent) {
            organizationId = agent.organizationId;
            agentId = agent.id;
          }
        }

        // Try to get from x-call-id header by looking up call record
        if (!organizationId) {
          const xCallId = req.headers.get("x-call-id");
          if (xCallId) {
            const callRecord = await db.call.findFirst({
              where: { vapiCallId: xCallId },
              select: { organizationId: true, agentId: true, agent: { select: { vapiAssistantId: true } } },
            });
            if (callRecord) {
              organizationId = callRecord.organizationId;
              agentId = callRecord.agentId || undefined;
            }
          }
        }

        // Try to get from call.id if different from x-call-id
        if (!organizationId && call?.id) {
          const callRecord = await db.call.findFirst({
            where: { vapiCallId: call.id },
            select: { organizationId: true, agentId: true },
          });
          if (callRecord) {
            organizationId = callRecord.organizationId;
            agentId = callRecord.agentId || undefined;
          }
        }

        // Fallback: For inbound calls, find organization from phone number with an assigned agent
        if (!organizationId) {
          const phoneWithAgent = await db.phoneNumber.findFirst({
            where: { agentId: { not: null } },
            include: {
              agent: {
                select: { id: true, organizationId: true },
              },
            },
          });

          if (phoneWithAgent?.agent) {
            organizationId = phoneWithAgent.agent.organizationId;
            agentId = phoneWithAgent.agent.id;

            const xCallId = req.headers.get("x-call-id");
            if (xCallId) {
              await db.call.upsert({
                where: { vapiCallId: xCallId },
                create: {
                  vapiCallId: xCallId,
                  organizationId,
                  agentId,
                  direction: "inbound",
                  status: "in-progress",
                  startedAt: new Date(),
                },
                update: {
                  organizationId,
                  agentId,
                },
              });
            }
          }
        }

        // Final fallback: assistantId from full webhook body
        if (!organizationId) {
          const fullBody = JSON.parse(rawBody);
          const possibleAssistantId = fullBody.assistantId || fullBody.assistant?.id;
          if (possibleAssistantId) {
            const agentByAssistant = await db.agent.findFirst({
              where: { vapiAssistantId: possibleAssistantId },
              select: { id: true, organizationId: true },
            });
            if (agentByAssistant) {
              organizationId = agentByAssistant.organizationId;
              agentId = agentByAssistant.id;
            }
          }
        }

        if (!organizationId) {
          log.error("Could not determine organization for tool call", {
            callId: call?.id,
            assistantId: call?.assistantId,
          });
          return NextResponse.json({
            results: toolCalls.map((tc) => ({
              toolCallId: tc.id,
              result: "I'm having trouble processing your request. Please try again.",
            })),
          });
        }

        // Process each tool call
        const results: ToolCallResult[] = [];
        for (const toolCall of toolCalls) {
          // Handle both string and object arguments - Vapi sometimes sends them pre-parsed
          let args: Record<string, string>;
          if (typeof toolCall.function.arguments === "string") {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } else {
            args = (toolCall.function.arguments as Record<string, string>) || {};
          }
          toolLog.debug(`Processing tool: ${toolCall.function.name}`, args);

          const result = await processToolCall(
            toolCall.function.name,
            args,
            organizationId,
            agentId,
            customerPhone
          );

          results.push({
            toolCallId: toolCall.id,
            result,
          });
        }

        log.debug("Tool call results:", results);
        return NextResponse.json({ results });
      }
    }

    if (!call) {
      return NextResponse.json({ received: true });
    }

    const db = await getDb();

    // Find the agent by Vapi assistant ID
    const agent = call.assistantId
      ? await db.agent.findFirst({
          where: { vapiAssistantId: call.assistantId },
          select: { id: true, organizationId: true },
        })
      : null;

    // Get campaign and contact IDs from metadata
    const campaignId = call.metadata?.campaignId;
    const contactId = call.metadata?.contactId;
    const organizationId = call.metadata?.organizationId || agent?.organizationId;

    if (!organizationId) {
      log.warn("Could not determine organization for call", { callId: call.id });
    }

    switch (type) {
      case "call.started":
      case "call-started":
      case "call.ringing": {
        // Create or update call record when call starts
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: "in-progress",
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
            startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
          },
          update: {
            status: "in-progress",
            startedAt: call.startedAt ? new Date(call.startedAt) : new Date(),
          },
        });

        // Update contact status if applicable
        if (contactId) {
          await db.contact.update({
            where: { id: contactId },
            data: { status: "called", lastCalledAt: new Date() },
          }).catch(() => {
            // Contact might not exist
          });
        }

        break;
      }

      case "call.ended":
      case "call-ended":
      case "end-of-call-report": {
        // Calculate duration
        const startedAt = call.startedAt ? new Date(call.startedAt) : null;
        const endedAt = call.endedAt ? new Date(call.endedAt) : new Date();
        const durationSeconds = startedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
          : 0;

        // Calculate cost
        const costCents = calculateCostCents(durationSeconds);

        // Determine final status
        // Vapi may send status as "ended" in end-of-call-report — normalize to "completed"
        let finalStatus = call.status || "completed";
        if (finalStatus === "ended") {
          finalStatus = "completed";
        }
        if (durationSeconds === 0) {
          finalStatus = "no-answer";
        }

        // Normalize transcript (Vapi may send as string or array of messages)
        const transcriptText = normalizeTranscript(call.transcript);
        log.info(`Call ended: ${call.id}, status: ${finalStatus}, duration: ${durationSeconds}s, transcript: ${transcriptText?.length ?? 0} chars`);

        // Update call record
        const updatedCall = await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: finalStatus,
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
            startedAt,
            endedAt,
            durationSeconds,
            transcript: transcriptText,
            recordingUrl: call.recordingUrl,
            costCents,
          },
          update: {
            status: finalStatus,
            endedAt,
            durationSeconds,
            transcript: transcriptText,
            recordingUrl: call.recordingUrl,
            costCents,
          },
        });

        // Update contact status based on call outcome
        if (contactId) {
          const contactStatus = finalStatus === "completed" ? "completed" : "failed";
          await db.contact.update({
            where: { id: contactId },
            data: {
              status: contactStatus,
              callAttempts: { increment: 1 },
            },
          }).catch(() => {
            // Contact might not exist
          });
        }

        // Trigger async call analysis if we have a transcript
        if (transcriptText && updatedCall.id) {
          // Fire and forget - analyze in background
          getAnalyzeCall().then((analyzeCall) => {
            analyzeCall(updatedCall.id).catch((error) => {
              log.error("Call analysis failed:", error);
            });
          });
        }

        // Detect missed calls for inbound calls
        // A missed call is: inbound + (no-answer status OR zero duration OR failed with short duration)
        const callDirection = call.metadata?.direction || updatedCall.direction || "outbound";
        const isMissedCall =
          callDirection === "inbound" &&
          (finalStatus === "no-answer" ||
           (durationSeconds <= 5 && finalStatus !== "completed") ||
           finalStatus === "busy");

        if (isMissedCall && organizationId && call.customer?.number) {
          // Fire and forget — process missed call in background
          import("@/lib/missed-calls").then(({ processMissedCall }) => {
            processMissedCall({
              organizationId: organizationId!,
              agentId: agent?.id,
              callerNumber: call!.customer!.number,
              calledNumber: call!.metadata?.fromNumber,
              reason: finalStatus === "busy" ? "busy" : "no_answer",
              vapiCallId: call!.id,
            }).catch((error) => {
              log.error("Missed call processing failed:", error);
            });
          });
        }

        break;
      }

      case "transcript":
      case "transcript.partial": {
        // Update transcript mid-call for live monitoring
        const partialText = normalizeTranscript(call.transcript);
        if (partialText) {
          await db.call.update({
            where: { vapiCallId: call.id },
            data: { transcript: partialText },
          }).catch(() => {
            // Call record may not exist yet
          });
        }
        break;
      }

      case "transcript.complete":
      case "transcript-complete": {
        // Update transcript when complete
        const completeText = normalizeTranscript(call.transcript);
        if (completeText) {
          const updatedCall = await db.call.update({
            where: { vapiCallId: call.id },
            data: { transcript: completeText },
          });

          // Trigger analysis now that we have the full transcript
          if (updatedCall.status === "completed") {
            getAnalyzeCall().then((analyzeCall) => {
              analyzeCall(updatedCall.id).catch((error) => {
                log.error("Call analysis failed:", error);
              });
            });
          }
        }
        break;
      }

      case "function.called":
      case "function-called": {
        // Legacy function call handling (newer versions use tool-calls message type)
        log.debug("Function called (legacy):", call.id);
        break;
      }

      case "status-update": {
        // Handle intermediate status updates from Vapi
        const newStatus = call.status;
        if (newStatus && call.id) {
          // Normalize Vapi status to our status values
          let mappedStatus = newStatus;
          if (newStatus === "ended") mappedStatus = "completed";

          await db.call.update({
            where: { vapiCallId: call.id },
            data: { status: mappedStatus },
          }).catch(() => {
            // Call record may not exist yet
          });
          log.debug(`Status update for ${call.id}: ${newStatus}`);
        }
        break;
      }

      case "call.failed":
      case "call-failed": {
        // Handle failed calls
        await db.call.upsert({
          where: { vapiCallId: call.id },
          create: {
            vapiCallId: call.id,
            organizationId: organizationId || "",
            agentId: agent?.id,
            campaignId: campaignId || null,
            contactId: contactId || null,
            direction: call.metadata?.direction || "outbound",
            status: "failed",
            fromNumber: call.metadata?.fromNumber,
            toNumber: call.customer?.number,
          },
          update: {
            status: "failed",
          },
        });

        // Update contact status
        if (contactId) {
          await db.contact.update({
            where: { id: contactId },
            data: {
              status: "failed",
              callAttempts: { increment: 1 },
            },
          }).catch(() => {
            // Contact might not exist
          });
        }

        // Detect missed inbound calls that failed
        const failedDirection = call.metadata?.direction || "outbound";
        if (failedDirection === "inbound" && organizationId && call.customer?.number) {
          import("@/lib/missed-calls").then(({ processMissedCall }) => {
            processMissedCall({
              organizationId: organizationId!,
              agentId: agent?.id,
              callerNumber: call!.customer!.number,
              calledNumber: call!.metadata?.fromNumber,
              reason: "agent_unavailable",
              vapiCallId: call!.id,
            }).catch((error) => {
              log.error("Missed call processing failed:", error);
            });
          });
        }

        break;
      }

      default:
        log.debug(`Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("Error:", error);

    // Return 200 to prevent Vapi from retrying (we logged the error)
    // Change to 500 if you want Vapi to retry
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}

// Health check / status endpoint
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "NOT SET";
  const hasWebhookSecret = !!process.env.VAPI_WEBHOOK_SECRET;
  const hasVapiKey = !!process.env.VAPI_API_KEY;

  return NextResponse.json({
    status: "Vapi webhook endpoint is active",
    configuration: {
      appUrl,
      webhookUrl: `${appUrl}/api/webhooks/vapi`,
      hasWebhookSecret,
      hasVapiKey,
    },
    timestamp: new Date().toISOString(),
  });
}
