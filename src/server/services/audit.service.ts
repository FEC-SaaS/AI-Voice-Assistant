import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("Audit");

export interface AuditLogInput {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        details: (input.details || {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    log.error("Failed to create audit log:", error);
  }
}
