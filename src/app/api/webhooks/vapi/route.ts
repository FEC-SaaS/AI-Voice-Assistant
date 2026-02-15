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

const getAnalyzeInterview = async () => {
  const { analyzeInterview } = await import("@/server/services/call-analysis.service");
  return analyzeInterview;
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

// Call object shape from Vapi
interface VapiCallObject {
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
}

// Vapi webhook event types
// Vapi Server Messages nest data inside body.message (not at top level).
// e.g. { message: { type: "status-update", call: {...}, status: "in-progress" } }
// e.g. { message: { type: "end-of-call-report", call: {...}, artifact: { transcript, messages, recordingUrl } } }
interface VapiWebhookEvent {
  // Legacy/direct format (may be undefined for server messages)
  type?: string;
  call?: VapiCallObject;
  // Server message format — Vapi sends ALL events here
  message?: {
    type: string;
    // Call object (present in status-update, end-of-call-report, etc.)
    call?: VapiCallObject;
    // Status for status-update events
    status?: string;
    // End reason for end-of-call-report
    endedReason?: string;
    // Artifact contains transcript, recording, messages for end-of-call-report
    artifact?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transcript?: string | any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages?: any[];
      recordingUrl?: string;
      stereoRecordingUrl?: string;
    };
    // Analysis contains AI-generated summary
    analysis?: {
      summary?: string;
      successEvaluation?: string;
    };
    // For tool/function calls
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
    // Timestamp
    timestamp?: string;
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
      .filter((msg) => {
        // Filter out system messages (contain knowledge base, prompts, etc.)
        const role = (msg.role || "").toLowerCase();
        return role !== "system";
      })
      .map((msg) => {
        const role = msg.role || "unknown";
        const text = msg.message || msg.content || msg.text || "";
        return `${role}: ${text}`;
      })
      .filter((line) => {
        // Filter out empty lines
        const parts = line.split(": ");
        return parts.length > 1 && parts.slice(1).join(": ").trim().length > 0;
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
    case "get_current_datetime": {
      const now = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const formatted = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return `Current date and time: ${formatted} at ${time}. Use this as reference for all scheduling.`;
    }

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

        if (staff.phoneNumber) {
          return `${staff.name} is available right now. Their number is ${staff.phoneNumber}. Would you like me to transfer you? If the transfer doesn't go through, I can notify them immediately to call you back.`;
        }
        return `${staff.name} is available right now but doesn't have a direct phone line for transfer. I can notify them immediately to call you back. Would you like me to do that?`;
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

    case "notify_staff": {
      const {
        staff_name,
        department_name,
        caller_name,
        caller_phone,
        reason,
        urgency,
      } = args;

      if (!caller_name || !reason) {
        return "I need the caller's name and the reason for the call to notify the staff member.";
      }

      // Find the staff member or department to notify
      let notifyPhone: string | null = null;
      let notifyEmail: string | null = null;
      let targetName = "the team";
      let staffMemberId: string | null = null;
      let departmentId: string | null = null;

      if (staff_name) {
        const staff = await db.staffMember.findFirst({
          where: {
            organizationId,
            name: { contains: staff_name, mode: "insensitive" },
          },
          include: { department: true },
        });
        if (staff) {
          notifyPhone = staff.phoneNumber;
          notifyEmail = staff.email;
          targetName = staff.name;
          staffMemberId = staff.id;
          departmentId = staff.departmentId;
        }
      }

      if (!notifyPhone && !notifyEmail && department_name) {
        const dept = await db.department.findFirst({
          where: {
            organizationId,
            name: { contains: department_name, mode: "insensitive" },
            isActive: true,
          },
        });
        if (dept) {
          notifyPhone = dept.phoneNumber;
          notifyEmail = dept.email;
          targetName = dept.name + " department";
          departmentId = dept.id;
        }
      }

      if (!notifyPhone && !notifyEmail) {
        return `I couldn't find contact info for ${staff_name || department_name || "that person"}. Would you like me to take a message instead?`;
      }

      // Create a priority message record
      const message = await db.receptionistMessage.create({
        data: {
          organizationId,
          agentId: agentId || null,
          callId: null,
          departmentId,
          staffMemberId,
          callerName: caller_name,
          callerPhone: caller_phone || customerPhone || null,
          callerEmail: null,
          callerCompany: null,
          body: `CALLBACK REQUESTED: ${reason}`,
          urgency: urgency || "high",
          status: "new",
        },
      });

      // Send immediate SMS notification
      if (notifyPhone) {
        try {
          const { sendReceptionistMessageSms } = await import("@/lib/sms");
          await sendReceptionistMessageSms(organizationId, notifyPhone, {
            callerName: caller_name,
            callerPhone: caller_phone || customerPhone || undefined,
            body: `CALLBACK NEEDED: ${caller_name}${caller_phone || customerPhone ? ` at ${caller_phone || customerPhone}` : ""} — ${reason}`,
            urgency: urgency || "high",
          });
        } catch (error) {
          toolLog.error("Failed to send staff notification SMS:", error);
        }
      }

      // Send immediate email notification
      if (notifyEmail) {
        try {
          const { sendReceptionistMessageNotification } = await import("@/lib/email");
          await sendReceptionistMessageNotification(notifyEmail, {
            callerName: caller_name,
            callerPhone: caller_phone || customerPhone || undefined,
            body: `CALLBACK REQUESTED: ${reason}`,
            urgency: urgency || "high",
            messageId: message.id,
          });
        } catch (error) {
          toolLog.error("Failed to send staff notification email:", error);
        }
      }

      // Audit log
      try {
        await db.auditLog.create({
          data: {
            organizationId,
            action: "receptionist.staff_notified",
            entityType: "ReceptionistMessage",
            entityId: message.id,
            details: {
              callerName: caller_name,
              callerPhone: caller_phone || customerPhone || null,
              targetName,
              reason,
              urgency: urgency || "high",
              notifiedViaSms: !!notifyPhone,
              notifiedViaEmail: !!notifyEmail,
            },
          },
        });
      } catch (error) {
        toolLog.error("Failed to create audit log:", error);
      }

      const contactMethod = notifyPhone && notifyEmail
        ? "via text and email"
        : notifyPhone
          ? "via text message"
          : "via email";

      return `I've sent an urgent notification to ${targetName} ${contactMethod} with your information. ${caller_phone || customerPhone ? `They have your number (${caller_phone || customerPhone}) and should call you back shortly.` : "Could you provide your phone number so they can reach you?"} Is there anything else I can help with?`;
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

  // VAPI_WEBHOOK_SECRET must be configured — reject if missing
  if (!secret) {
    log.error("VAPI_WEBHOOK_SECRET not configured — rejecting request");
    return false;
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
    const { message } = body;

    // Vapi Server Messages nest type and call inside body.message.
    // Support both legacy (body.type / body.call) and server message format.
    const type = body.type || message?.type;
    const call = body.call || message?.call;

    log.info(`Received event: ${type}`, {
      callId: call?.id,
      messageType: message?.type,
      hasArtifact: !!message?.artifact,
      bodyKeys: Object.keys(body),
    });

    // Handle assistant-request: Vapi asks which assistant to use for an inbound call.
    // This lets us return dynamic firstMessage based on business hours for receptionist agents.
    if (type === "assistant-request") {
      const db = await getDb();

      // Identify agent from the phone number receiving the call
      const phoneNumberId = call?.phoneNumberId;
      let agent: {
        id: string;
        vapiAssistantId: string | null;
        firstMessage: string | null;
        settings: unknown;
      } | null = null;

      if (phoneNumberId) {
        const phoneRecord = await db.phoneNumber.findFirst({
          where: { vapiPhoneId: phoneNumberId },
          select: {
            agentId: true,
            agent: {
              select: {
                id: true,
                vapiAssistantId: true,
                firstMessage: true,
                settings: true,
              },
            },
          },
        });
        agent = phoneRecord?.agent || null;
      }

      // Fallback: try assistantId from the call
      if (!agent && call?.assistantId) {
        agent = await db.agent.findFirst({
          where: { vapiAssistantId: call.assistantId },
          select: { id: true, vapiAssistantId: true, firstMessage: true, settings: true },
        });
      }

      if (!agent?.vapiAssistantId) {
        log.warn("assistant-request: no agent found for phone number", { phoneNumberId });
        return NextResponse.json({});
      }

      // Check if agent has receptionist enabled
      const settings = (agent.settings as Record<string, unknown>) || {};
      const enableReceptionist = settings.enableReceptionist === true;
      const receptionistConfig = (settings.receptionistConfig as Record<string, unknown>) || {};

      if (!enableReceptionist) {
        // Non-receptionist agent: inject fresh date for scheduling
        const now = new Date();
        const dayNamesNR = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNamesNR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const dateStrNR = `${dayNamesNR[now.getDay()]}, ${monthNamesNR[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

        return NextResponse.json({
          assistantId: agent.vapiAssistantId,
          assistantOverrides: {
            variableValues: { currentDate: dateStrNR },
          },
        });
      }

      // Receptionist agent: determine if we're within business hours
      // Check if ANY department is currently open
      const { isWithinBusinessHours } = await import("@/lib/business-hours");
      const departments = await db.department.findMany({
        where: {
          organizationId: (await db.phoneNumber.findFirst({
            where: { vapiPhoneId: phoneNumberId! },
            select: { organizationId: true },
          }))?.organizationId || "",
          isActive: true,
        },
        select: { businessHours: true },
      });

      const anyDeptOpen = departments.some((dept) => {
        const hours = dept.businessHours as Record<string, unknown> | null;
        return hours ? isWithinBusinessHours(hours as any) : true; // No hours = always open
      });

      // Pick the right greeting
      const duringGreeting = (receptionistConfig.duringHoursGreeting as string) || agent.firstMessage || undefined;
      const afterGreeting = (receptionistConfig.afterHoursGreeting as string) || undefined;
      const dynamicFirstMessage = anyDeptOpen ? duringGreeting : afterGreeting;

      log.info("assistant-request: receptionist dynamic greeting", {
        agentId: agent.id,
        anyDeptOpen,
        hasCustomGreeting: !!dynamicFirstMessage,
      });

      // Return assistantId with firstMessage and fresh date overrides
      const overrides: Record<string, unknown> = {};
      if (dynamicFirstMessage) {
        overrides.firstMessage = dynamicFirstMessage;
      }

      // Inject fresh date for scheduling
      const nowR = new Date();
      const dayNamesR = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNamesR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const dateStrR = `${dayNamesR[nowR.getDay()]}, ${monthNamesR[nowR.getMonth()]} ${nowR.getDate()}, ${nowR.getFullYear()}`;
      overrides.variableValues = { currentDate: dateStrR };

      return NextResponse.json({
        assistantId: agent.vapiAssistantId,
        assistantOverrides: overrides,
      });
    }

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
          let fullBody: Record<string, unknown> | undefined;
          try { fullBody = JSON.parse(rawBody); } catch { /* already parsed above, ignore */ }
          const possibleAssistantId = fullBody?.assistantId || (fullBody?.assistant as Record<string, unknown>)?.id;
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
            try {
              args = JSON.parse(toolCall.function.arguments || "{}");
            } catch {
              toolLog.error(`Failed to parse tool arguments for ${toolCall.function.name}`);
              args = {};
            }
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

    log.info(`Processing event: ${type}, callId: ${call.id}, assistantId: ${call.assistantId}, status: ${call.status}`);

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
    let organizationId = call.metadata?.organizationId || agent?.organizationId;

    // For inbound calls, metadata may be empty. Resolve org from the phone number.
    if (!organizationId && call.phoneNumberId) {
      const phoneRecord = await db.phoneNumber.findFirst({
        where: { vapiPhoneId: call.phoneNumberId },
        select: { organizationId: true, agentId: true },
      });
      if (phoneRecord) {
        organizationId = phoneRecord.organizationId;
        log.info(`Resolved org from phoneNumberId: ${organizationId}`);
      }
    }

    // Determine call direction: if metadata has direction use it, otherwise
    // check if this call was initiated by us (has metadata.callId) or is inbound
    const callDirection = call.metadata?.direction
      || (call.metadata?.callId ? "outbound" : "inbound");

    if (!organizationId) {
      log.warn("Could not determine organization for call", {
        callId: call.id,
        assistantId: call.assistantId,
        phoneNumberId: call.phoneNumberId,
        metadata: call.metadata,
      });
    }

    // Helper: try to find an existing DB call record by metadata.callId first,
    // then by vapiCallId. This handles outbound calls where the DB record was
    // created before the Vapi call and may not have vapiCallId set yet.
    const findExistingCallRecord = async (): Promise<string | null> => {
      // 1. Check by vapiCallId (standard path)
      const byVapi = await db.call.findUnique({
        where: { vapiCallId: call!.id },
        select: { id: true },
      });
      if (byVapi) return byVapi.id;

      // 2. Check by metadata.callId (outbound calls pass their DB id in metadata)
      if (call!.metadata?.callId) {
        const byMeta = await db.call.findUnique({
          where: { id: call!.metadata.callId },
          select: { id: true, vapiCallId: true },
        });
        if (byMeta) {
          // Link the vapiCallId to this record if not yet set
          if (!byMeta.vapiCallId) {
            await db.call.update({
              where: { id: byMeta.id },
              data: { vapiCallId: call!.id },
            });
            log.info(`Linked vapiCallId ${call!.id} to DB record ${byMeta.id} via metadata.callId`);
          }
          return byMeta.id;
        }
      }

      return null;
    };

    switch (type) {
      case "call.started":
      case "call-started":
      case "call.ringing": {
        // Try to find existing DB record first (for outbound calls)
        const existingId = await findExistingCallRecord();
        const startTime = call.startedAt ? new Date(call.startedAt) : new Date();

        if (existingId) {
          // Don't overwrite terminal statuses (completed/failed/no-answer)
          const existingStartRecord = await db.call.findUnique({
            where: { id: existingId },
            select: { status: true },
          });
          const terminalCheck = ["completed", "failed", "no-answer"];
          if (existingStartRecord?.status && terminalCheck.includes(existingStartRecord.status)) {
            log.info(`Call started: skipping — record ${existingId} already in terminal status ${existingStartRecord.status}`);
          } else {
            // Update existing record
            await db.call.update({
              where: { id: existingId },
              data: {
                vapiCallId: call.id,
                status: "in-progress",
                startedAt: startTime,
                agentId: agent?.id || undefined,
              },
            });
            log.info(`Call started: updated existing record ${existingId}`);
          }
        } else if (organizationId) {
          // Create new record (inbound calls)
          await db.call.create({
            data: {
              vapiCallId: call.id,
              organizationId,
              agentId: agent?.id,
              campaignId: campaignId || null,
              contactId: contactId || null,
              direction: callDirection,
              status: "in-progress",
              fromNumber: callDirection === "inbound" ? call.customer?.number : call.metadata?.fromNumber,
              toNumber: callDirection === "inbound" ? call.metadata?.fromNumber : call.customer?.number,
              startedAt: startTime,
            },
          });
          log.info(`Call started: created new ${callDirection} record for ${call.id}`);
        } else {
          log.warn(`Call started: skipping DB record — no organizationId for call ${call.id}`);
        }

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
        // Calculate duration from call timestamps OR from existing DB record
        const startedAt = call.startedAt ? new Date(call.startedAt) : null;
        const endedAt = call.endedAt ? new Date(call.endedAt) : new Date();
        let durationSeconds = startedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
          : 0;

        // If we couldn't calculate duration from timestamps, try to get from existing DB record
        if (durationSeconds === 0) {
          const existingForDuration = await findExistingCallRecord();
          if (existingForDuration) {
            const existingRecord = await db.call.findUnique({
              where: { id: existingForDuration },
              select: { startedAt: true },
            });
            if (existingRecord?.startedAt) {
              durationSeconds = Math.round((endedAt.getTime() - existingRecord.startedAt.getTime()) / 1000);
            }
          }
        }

        // Calculate cost
        const costCents = calculateCostCents(durationSeconds);

        // Determine final status using endedReason (most reliable) then call.status
        // Vapi's call.status in server messages is often stale ("queued")
        const endedReason = message?.endedReason;
        let finalStatus = "completed"; // Default to completed

        if (endedReason) {
          // Map Vapi endedReason to our status
          if (endedReason.includes("customer-ended") || endedReason === "hangup" || endedReason === "assistant-ended-call") {
            finalStatus = "completed";
          } else if (endedReason.includes("no-answer") || endedReason === "customer-did-not-answer") {
            finalStatus = "no-answer";
          } else if (endedReason.includes("error") || endedReason.includes("failed")) {
            finalStatus = "failed";
          } else if (endedReason === "busy" || endedReason === "customer-busy") {
            finalStatus = "no-answer";
          } else {
            finalStatus = "completed"; // Default for unknown reasons
          }
        } else {
          // Fallback to call.status if no endedReason
          const rawStatus = call.status || "completed";
          if (rawStatus === "ended") {
            finalStatus = "completed";
          } else if (rawStatus === "queued" || rawStatus === "ringing") {
            // Call object status is stale — if we got an end-of-call-report, it completed
            finalStatus = "completed";
          } else {
            finalStatus = rawStatus;
          }
        }

        // Only mark as no-answer if duration is truly 0 AND no transcript exists
        if (durationSeconds === 0 && !call.transcript && !message?.artifact?.transcript && !message?.artifact?.messages?.length) {
          finalStatus = "no-answer";
        }

        log.info(`Call end reason: ${endedReason}, raw status: ${call.status}, final: ${finalStatus}`);

        // Extract transcript from multiple possible sources:
        // 1. call.transcript (legacy)
        // 2. message.artifact.transcript (server message format)
        // 3. message.artifact.messages (array of role/message objects)
        const artifact = message?.artifact;
        let transcriptText = normalizeTranscript(call.transcript);
        if (!transcriptText && artifact?.transcript) {
          transcriptText = normalizeTranscript(artifact.transcript);
        }
        if (!transcriptText && artifact?.messages) {
          transcriptText = normalizeTranscript(artifact.messages);
        }

        // Extract recording URL from artifact if not on call object
        const recordingUrl = call.recordingUrl || artifact?.recordingUrl || artifact?.stereoRecordingUrl;

        // Extract AI-generated summary from analysis
        const summary = message?.analysis?.summary;

        log.info(`Call ended: ${call.id}, status: ${finalStatus}, duration: ${durationSeconds}s, transcript: ${transcriptText?.length ?? 0} chars, recording: ${!!recordingUrl}, summary: ${!!summary}`);

        // Try to find existing record first
        const existingEndId = await findExistingCallRecord();
        let updatedCall;

        if (existingEndId) {
          // Update existing record
          updatedCall = await db.call.update({
            where: { id: existingEndId },
            data: {
              vapiCallId: call.id,
              status: finalStatus,
              agentId: agent?.id || undefined,
              startedAt: startedAt || undefined,
              endedAt,
              durationSeconds,
              transcript: transcriptText,
              recordingUrl,
              summary,
              costCents,
            },
          });
          log.info(`Call ended: updated existing record ${existingEndId}`);
        } else if (organizationId) {
          // Create new record (shouldn't normally happen, but handles edge cases)
          updatedCall = await db.call.create({
            data: {
              vapiCallId: call.id,
              organizationId,
              agentId: agent?.id,
              campaignId: campaignId || null,
              contactId: contactId || null,
              direction: callDirection,
              status: finalStatus,
              fromNumber: callDirection === "inbound" ? call.customer?.number : call.metadata?.fromNumber,
              toNumber: callDirection === "inbound" ? call.metadata?.fromNumber : call.customer?.number,
              startedAt,
              endedAt,
              durationSeconds,
              transcript: transcriptText,
              recordingUrl,
              summary,
              costCents,
            },
          });
          log.info(`Call ended: created new record for ${call.id}`);
        } else {
          log.warn(`Call ended: skipping DB record — no organizationId for call ${call.id}`);
        }

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
        if (transcriptText && updatedCall?.id) {
          // Check if this call belongs to an interview campaign
          const callId = updatedCall.id;
          const campaignForAnalysis = campaignId
            ? await db.campaign.findUnique({
                where: { id: campaignId },
                select: { type: true },
              })
            : null;

          if (campaignForAnalysis?.type === "interview") {
            // Use interview-specific analysis
            getAnalyzeInterview().then((analyzeInterview) => {
              analyzeInterview(callId).catch((error) => {
                log.error("Interview analysis failed:", error);
              });
            });
          } else {
            // Standard call analysis
            getAnalyzeCall().then((analyzeCall) => {
              analyzeCall(callId).catch((error) => {
                log.error("Call analysis failed:", error);
              });
            });
          }
        }

        break;
      }

      case "transcript":
      case "transcript.partial":
      case "conversation-update": {
        // Update transcript mid-call for live monitoring
        // Vapi sends transcript in multiple formats depending on event type
        let partialText = normalizeTranscript(call.transcript);
        if (!partialText && message?.artifact?.messages) {
          partialText = normalizeTranscript(message.artifact.messages);
        }
        if (!partialText && message?.artifact?.transcript) {
          partialText = normalizeTranscript(message.artifact.transcript);
        }
        if (partialText) {
          // Use findExistingCallRecord to handle cases where vapiCallId isn't linked yet
          const existingTranscriptId = await findExistingCallRecord();
          if (existingTranscriptId) {
            await db.call.update({
              where: { id: existingTranscriptId },
              data: { vapiCallId: call.id, transcript: partialText },
            }).catch(() => {
              log.warn(`Transcript update failed for record ${existingTranscriptId}`);
            });
          } else {
            await db.call.update({
              where: { vapiCallId: call.id },
              data: { transcript: partialText },
            }).catch(() => {
              // Call record may not exist yet
            });
          }
        }
        break;
      }

      case "transcript.complete":
      case "transcript-complete": {
        // Update transcript when complete
        const completeText = normalizeTranscript(call.transcript)
          || normalizeTranscript(message?.artifact?.transcript)
          || normalizeTranscript(message?.artifact?.messages);
        if (completeText) {
          const existingCompleteId = await findExistingCallRecord();
          let updatedCallRecord;
          if (existingCompleteId) {
            updatedCallRecord = await db.call.update({
              where: { id: existingCompleteId },
              data: { vapiCallId: call.id, transcript: completeText },
            });
          } else {
            updatedCallRecord = await db.call.update({
              where: { vapiCallId: call.id },
              data: { transcript: completeText },
            }).catch(() => null);
          }

          // Trigger analysis now that we have the full transcript
          if (updatedCallRecord && updatedCallRecord.status === "completed") {
            getAnalyzeCall().then((analyzeCall) => {
              analyzeCall(updatedCallRecord.id).catch((error) => {
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
        // Use message.status (server message format); ignore stale call.status snapshot
        const newStatus = message?.status;
        if (!newStatus) {
          log.info(`Status update for ${call.id}: no message.status, ignoring stale call.status`);
          break;
        }
        if (newStatus && call.id) {
          // Normalize Vapi status to our status values
          let mappedStatus = newStatus;
          if (newStatus === "ended") mappedStatus = "completed";

          // NEVER set status to "queued" from a webhook — that's only set at call creation
          if (mappedStatus === "queued") {
            log.info(`Status update: ignoring "queued" status for ${call.id}`);
            break;
          }

          log.info(`Status update for ${call.id}: ${newStatus} -> ${mappedStatus}`);

          // Try to find existing record (handles outbound calls where vapiCallId might not be set)
          const existingStatusId = await findExistingCallRecord();
          if (existingStatusId) {
            // Check if the call is already in a terminal state — don't overwrite
            // completed/failed/no-answer with stale status-update events
            const existingStatusRecord = await db.call.findUnique({
              where: { id: existingStatusId },
              select: { status: true },
            });
            const terminalStatuses = ["completed", "failed", "no-answer"];
            if (existingStatusRecord?.status && terminalStatuses.includes(existingStatusRecord.status)) {
              log.info(`Status update: skipping ${mappedStatus} — call ${existingStatusId} already in terminal status ${existingStatusRecord.status}`);
            } else {
              await db.call.update({
                where: { id: existingStatusId },
                data: {
                  vapiCallId: call.id,
                  status: mappedStatus,
                  ...(newStatus === "in-progress" && !call.startedAt ? { startedAt: new Date() } : {}),
                },
              });
            }
          } else if (
            // No existing record found — this is likely an inbound call arriving
            // via Vapi server message (Vapi doesn't send call-started for server messages).
            // Create the record now so inbound calls appear on the dashboard.
            (newStatus === "ringing" || newStatus === "in-progress" || newStatus === "forwarding") &&
            organizationId
          ) {
            const inboundAgentId = agent?.id || undefined;
            // Also try to resolve agent from phone number if not found via assistantId
            let resolvedAgentId = inboundAgentId;
            if (!resolvedAgentId && call.phoneNumberId) {
              const phoneWithAgent = await db.phoneNumber.findFirst({
                where: { vapiPhoneId: call.phoneNumberId },
                select: { agentId: true },
              });
              resolvedAgentId = phoneWithAgent?.agentId || undefined;
            }

            try {
              await db.call.create({
                data: {
                  vapiCallId: call.id,
                  organizationId,
                  agentId: resolvedAgentId,
                  direction: callDirection,
                  status: mappedStatus,
                  fromNumber: callDirection === "inbound" ? call.customer?.number : call.metadata?.fromNumber,
                  toNumber: callDirection === "inbound" ? call.metadata?.fromNumber : call.customer?.number,
                  startedAt: newStatus === "in-progress" ? new Date() : undefined,
                },
              });
              log.info(`Status update: created new ${callDirection} record for ${call.id}`);
            } catch (createError) {
              // Might fail with unique constraint if record was created concurrently
              log.warn(`Status update: failed to create record for ${call.id}`, createError);
            }
          } else {
            // Fallback: try direct update by vapiCallId (with terminal status check)
            const existingFallback = await db.call.findUnique({
              where: { vapiCallId: call.id },
              select: { status: true },
            }).catch(() => null);
            const terminalFallback = ["completed", "failed", "no-answer"];
            if (existingFallback?.status && terminalFallback.includes(existingFallback.status)) {
              log.info(`Status update fallback: skipping ${mappedStatus} — already ${existingFallback.status}`);
            } else if (existingFallback) {
              await db.call.update({
                where: { vapiCallId: call.id },
                data: { status: mappedStatus },
              }).catch(() => {
                log.warn(`Status update fallback: failed to update call ${call.id}`);
              });
            }
          }
        }
        break;
      }

      case "call.failed":
      case "call-failed": {
        log.info(`Call failed: ${call.id}`);
        // Handle failed calls - find existing record first
        const existingFailId = await findExistingCallRecord();

        if (existingFailId) {
          await db.call.update({
            where: { id: existingFailId },
            data: { vapiCallId: call.id, status: "failed" },
          });
        } else {
          await db.call.create({
            data: {
              vapiCallId: call.id,
              organizationId: organizationId || "",
              agentId: agent?.id,
              campaignId: campaignId || null,
              contactId: contactId || null,
              direction: callDirection,
              status: "failed",
              fromNumber: callDirection === "inbound" ? call.customer?.number : call.metadata?.fromNumber,
              toNumber: callDirection === "inbound" ? call.metadata?.fromNumber : call.customer?.number,
            },
          });
        }

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

// Webhook endpoint does not expose a GET handler to avoid leaking configuration details
