import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";
import { isWithinBusinessHours, type BusinessHoursConfig } from "@/lib/business-hours";

const log = createLogger("Receptionist");

// Helper to sync all receptionist agents in an org after department/staff changes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncReceptionistAgents(db: any, orgId: string) {
  try {
    const agents = await (db as any).agent.findMany({
      where: { organizationId: orgId },
      select: { id: true, settings: true, vapiAssistantId: true },
    });

    const receptionistAgents = agents.filter((a: any) => {
      const settings = (a.settings as Record<string, unknown>) || {};
      return settings.enableReceptionist === true && a.vapiAssistantId;
    });

    if (receptionistAgents.length > 0) {
      log.info(`Found ${receptionistAgents.length} receptionist agent(s) to sync after directory change`);
      // We don't auto-sync here to avoid circular imports; the UI can trigger syncToVapi
    }
  } catch (error) {
    log.error("Error checking receptionist agents:", error);
  }
}

// Business hours schema
const dayScheduleSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
}).nullable();

const businessHoursSchema = z.object({
  timezone: z.string().default("America/New_York"),
  schedule: z.object({
    sunday: dayScheduleSchema.optional(),
    monday: dayScheduleSchema.optional(),
    tuesday: dayScheduleSchema.optional(),
    wednesday: dayScheduleSchema.optional(),
    thursday: dayScheduleSchema.optional(),
    friday: dayScheduleSchema.optional(),
    saturday: dayScheduleSchema.optional(),
  }).optional(),
});

export const receptionistRouter = router({
  // ==========================================
  // Department CRUD
  // ==========================================

  "departments.list": protectedProcedure.query(async ({ ctx }) => {
    const departments = await ctx.db.department.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { staffMembers: true, messages: true } },
      },
    });

    return departments.map((dept) => {
      const hours = dept.businessHours as BusinessHoursConfig | null;
      const isOpen = hours ? isWithinBusinessHours(hours) : false;
      return { ...dept, isOpen };
    });
  }),

  "departments.get": protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const dept = await ctx.db.department.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: {
          staffMembers: { orderBy: { name: "asc" } },
          messages: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });

      if (!dept) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      const hours = dept.businessHours as BusinessHoursConfig | null;
      const isOpen = hours ? isWithinBusinessHours(hours) : false;
      return { ...dept, isOpen };
    }),

  "departments.create": adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      phoneNumber: z.string().optional(),
      extension: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      businessHours: businessHoursSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dept = await ctx.db.department.create({
        data: {
          organizationId: ctx.orgId,
          name: input.name,
          description: input.description,
          phoneNumber: input.phoneNumber,
          extension: input.extension,
          email: input.email || null,
          businessHours: input.businessHours || {},
        },
      });

      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return dept;
    }),

  "departments.update": adminProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        phoneNumber: z.string().optional(),
        extension: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        isActive: z.boolean().optional(),
        businessHours: businessHoursSchema.optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.department.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      const dept = await ctx.db.department.update({
        where: { id: input.id },
        data: {
          ...input.data,
          email: input.data.email === "" ? null : input.data.email,
          businessHours: input.data.businessHours || undefined,
        },
      });

      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return dept;
    }),

  "departments.delete": adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.department.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      await ctx.db.department.delete({ where: { id: input.id } });
      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return { success: true };
    }),

  // ==========================================
  // Staff CRUD
  // ==========================================

  "staff.list": protectedProcedure
    .input(z.object({ departmentId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { organizationId: ctx.orgId };
      if (input?.departmentId) where.departmentId = input.departmentId;

      return ctx.db.staffMember.findMany({
        where,
        orderBy: { name: "asc" },
        include: { department: { select: { id: true, name: true } } },
      });
    }),

  "staff.create": adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      role: z.string().optional(),
      phoneNumber: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      departmentId: z.string(),
      availabilitySchedule: businessHoursSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify department belongs to org
      const dept = await ctx.db.department.findFirst({
        where: { id: input.departmentId, organizationId: ctx.orgId },
      });
      if (!dept) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      }

      const staff = await ctx.db.staffMember.create({
        data: {
          organizationId: ctx.orgId,
          departmentId: input.departmentId,
          name: input.name,
          role: input.role,
          phoneNumber: input.phoneNumber,
          email: input.email || null,
          availabilitySchedule: input.availabilitySchedule || {},
        },
      });

      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return staff;
    }),

  "staff.update": adminProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().min(1).max(100).optional(),
        role: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        departmentId: z.string().optional(),
        isAvailable: z.boolean().optional(),
        availabilitySchedule: businessHoursSchema.optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.staffMember.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      }

      const staff = await ctx.db.staffMember.update({
        where: { id: input.id },
        data: {
          ...input.data,
          email: input.data.email === "" ? null : input.data.email,
          availabilitySchedule: input.data.availabilitySchedule || undefined,
        },
      });

      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return staff;
    }),

  "staff.delete": adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.staffMember.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      }

      await ctx.db.staffMember.delete({ where: { id: input.id } });
      await syncReceptionistAgents(ctx.db, ctx.orgId);
      return { success: true };
    }),

  "staff.toggleAvailability": protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.staffMember.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      }

      return ctx.db.staffMember.update({
        where: { id: input.id },
        data: { isAvailable: !existing.isAvailable },
      });
    }),

  // ==========================================
  // Messages
  // ==========================================

  "messages.list": protectedProcedure
    .input(z.object({
      status: z.enum(["new", "read", "forwarded", "resolved"]).optional(),
      departmentId: z.string().optional(),
      urgency: z.enum(["low", "normal", "high", "urgent"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(25),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 25;
      const where: Record<string, unknown> = { organizationId: ctx.orgId };
      if (input?.status) where.status = input.status;
      if (input?.departmentId) where.departmentId = input.departmentId;
      if (input?.urgency) where.urgency = input.urgency;
      if (input?.startDate || input?.endDate) {
        where.createdAt = {
          ...(input.startDate && { gte: input.startDate }),
          ...(input.endDate && { lte: input.endDate }),
        };
      }

      const messages = await ctx.db.receptionistMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(input?.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        include: {
          department: { select: { id: true, name: true } },
          staffMember: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const next = messages.pop();
        nextCursor = next?.id;
      }

      return { messages, nextCursor };
    }),

  "messages.get": protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const msg = await ctx.db.receptionistMessage.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: {
          department: { select: { id: true, name: true } },
          staffMember: { select: { id: true, name: true, email: true, phoneNumber: true } },
          agent: { select: { id: true, name: true } },
        },
      });

      if (!msg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      return msg;
    }),

  "messages.updateStatus": protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["new", "read", "forwarded", "resolved"]),
      resolvedBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.receptionistMessage.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "resolved") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = input.resolvedBy || ctx.userId;
      }
      if (input.notes) {
        updateData.notes = existing.notes
          ? `${existing.notes}\n${input.notes}`
          : input.notes;
      }

      return ctx.db.receptionistMessage.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  "messages.forward": protectedProcedure
    .input(z.object({
      id: z.string(),
      via: z.enum(["email", "sms"]),
      to: z.string(), // email or phone number
    }))
    .mutation(async ({ ctx, input }) => {
      const msg = await ctx.db.receptionistMessage.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
        include: {
          department: { select: { name: true } },
          staffMember: { select: { name: true } },
        },
      });
      if (!msg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      if (input.via === "email") {
        try {
          const { sendReceptionistMessageNotification } = await import("@/lib/email");
          await sendReceptionistMessageNotification(input.to, {
            callerName: msg.callerName || "Unknown",
            callerPhone: msg.callerPhone || undefined,
            callerCompany: msg.callerCompany || undefined,
            body: msg.body,
            urgency: msg.urgency,
            departmentName: msg.department?.name,
            staffName: msg.staffMember?.name,
            messageId: msg.id,
          });
        } catch (error) {
          log.error("Failed to forward message via email:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email" });
        }
      } else {
        try {
          const { sendReceptionistMessageSms } = await import("@/lib/sms");
          await sendReceptionistMessageSms(ctx.orgId, input.to, {
            callerName: msg.callerName || "Unknown",
            callerPhone: msg.callerPhone || undefined,
            body: msg.body,
            urgency: msg.urgency,
          });
        } catch (error) {
          log.error("Failed to forward message via SMS:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send SMS" });
        }
      }

      // Update message status
      await ctx.db.receptionistMessage.update({
        where: { id: input.id },
        data: {
          status: "forwarded",
          forwardedAt: new Date(),
          forwardedVia: input.via,
        },
      });

      // Audit log
      await ctx.db.auditLog.create({
        data: {
          organizationId: ctx.orgId,
          action: "receptionist.message_forwarded",
          entityType: "ReceptionistMessage",
          entityId: msg.id,
          userId: ctx.userId,
          details: { via: input.via, to: input.to },
        },
      });

      return { success: true };
    }),

  "messages.delete": adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.receptionistMessage.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      await ctx.db.receptionistMessage.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ==========================================
  // Dashboard Stats
  // ==========================================

  "dashboard.stats": protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get receptionist agents
    const agents = await ctx.db.agent.findMany({
      where: { organizationId: ctx.orgId },
      select: { id: true, settings: true },
    });
    const receptionistAgentIds = agents
      .filter((a) => {
        const settings = (a.settings as Record<string, unknown>) || {};
        return settings.enableReceptionist === true;
      })
      .map((a) => a.id);

    // Calls handled by receptionist agents
    const callsHandled = receptionistAgentIds.length > 0
      ? await ctx.db.call.count({
          where: {
            organizationId: ctx.orgId,
            agentId: { in: receptionistAgentIds },
            createdAt: { gte: thirtyDaysAgo },
          },
        })
      : 0;

    // Messages by status
    const [newMessages, readMessages, forwardedMessages, resolvedMessages, totalMessages] = await Promise.all([
      ctx.db.receptionistMessage.count({ where: { organizationId: ctx.orgId, status: "new" } }),
      ctx.db.receptionistMessage.count({ where: { organizationId: ctx.orgId, status: "read" } }),
      ctx.db.receptionistMessage.count({ where: { organizationId: ctx.orgId, status: "forwarded" } }),
      ctx.db.receptionistMessage.count({ where: { organizationId: ctx.orgId, status: "resolved" } }),
      ctx.db.receptionistMessage.count({ where: { organizationId: ctx.orgId } }),
    ]);

    // Department count
    const departmentCount = await ctx.db.department.count({ where: { organizationId: ctx.orgId } });

    // Staff count
    const staffCount = await ctx.db.staffMember.count({ where: { organizationId: ctx.orgId } });

    // Available staff
    const availableStaff = await ctx.db.staffMember.count({
      where: { organizationId: ctx.orgId, isAvailable: true },
    });

    return {
      callsHandled,
      messages: { new: newMessages, read: readMessages, forwarded: forwardedMessages, resolved: resolvedMessages, total: totalMessages },
      departmentCount,
      staffCount,
      availableStaff,
      receptionistAgentCount: receptionistAgentIds.length,
    };
  }),
});
