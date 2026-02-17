import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { createLogger } from "@/lib/logger";
import { TRPCError } from "@trpc/server";
import {
  INTEGRATION_CATALOG,
  canUseIntegrations,
  getOAuthUrl,
  getOrgIntegrations,
  disconnectIntegration,
  saveIntegrationConnection,
  generateWebhookSecret,
  deliverWebhookToOrg,
  type IntegrationType,
} from "../services/integration.service";
import { db } from "@/lib/db";

const log = createLogger("Integrations");

const integrationTypeSchema = z.enum([
  "ghl",
  "google_calendar",
  "google_sheets",
  "make",
  "slack",
  "zapier",
  "hubspot",
  "salesforce",
  "mcp",
]);

export const integrationsRouter = router({
  // ==========================================
  // List all integrations with connection status
  // ==========================================
  list: protectedProcedure.query(async ({ ctx }) => {
    const org = await db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { planId: true },
    });

    const planAllowed = canUseIntegrations(org?.planId || "free-trial");
    const connected = await getOrgIntegrations(ctx.orgId);

    const connectedMap = new Map(connected.map((c) => [c.type, c]));

    return INTEGRATION_CATALOG.map((info) => {
      const connection = connectedMap.get(info.id);
      return {
        ...info,
        status: connection?.status || "disconnected",
        connected: connection?.status === "connected",
        planAllowed,
        lastSyncedAt: connection?.lastSyncedAt || null,
        errorMessage: connection?.errorMessage || null,
        config: connection?.config || null,
        hasWebhookUrl: !!connection?.webhookUrl,
      };
    });
  }),

  // ==========================================
  // Get OAuth URL for a provider
  // ==========================================
  getOAuthUrl: adminProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const org = await db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { planId: true },
      });

      if (!canUseIntegrations(org?.planId || "free-trial")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Integrations require a Professional plan or higher",
        });
      }

      const url = getOAuthUrl(input.type, ctx.orgId);
      if (!url) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `OAuth not configured for ${input.type}. Please set the required environment variables.`,
        });
      }

      log.info(`OAuth URL generated for ${input.type} in org ${ctx.orgId}`);
      return { url };
    }),

  // ==========================================
  // Connect webhook-based integration (Make, Zapier, MCP)
  // ==========================================
  connectWebhook: adminProcedure
    .input(
      z.object({
        type: integrationTypeSchema,
        webhookUrl: z.string().url("Must be a valid URL"),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { planId: true },
      });

      if (!canUseIntegrations(org?.planId || "free-trial")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Integrations require a Professional plan or higher",
        });
      }

      const integration = await saveIntegrationConnection(
        ctx.orgId,
        input.type as IntegrationType,
        {
          webhookUrl: input.webhookUrl,
          config: input.config as Record<string, unknown>,
        }
      );

      log.info(`Webhook integration ${input.type} connected for org ${ctx.orgId}`);
      return { success: true, integration };
    }),

  // ==========================================
  // Update integration config
  // ==========================================
  updateConfig: adminProcedure
    .input(
      z.object({
        type: integrationTypeSchema,
        config: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const integration = await db.integration.findUnique({
        where: {
          organizationId_type: {
            organizationId: ctx.orgId,
            type: input.type,
          },
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      const existingConfig = (integration.config || {}) as Record<string, unknown>;
      const mergedConfig = { ...existingConfig, ...input.config };

      const updated = await db.integration.update({
        where: { id: integration.id },
        data: {
          config: JSON.parse(JSON.stringify(mergedConfig)),
        },
      });

      return { success: true, integration: updated };
    }),

  // ==========================================
  // Disconnect an integration
  // ==========================================
  disconnect: adminProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        await disconnectIntegration(ctx.orgId, input.type as IntegrationType);
        log.info(`Integration ${input.type} disconnected for org ${ctx.orgId}`);
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }
    }),

  // ==========================================
  // Webhook Endpoints CRUD
  // ==========================================
  webhooks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.webhookEndpoint.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { logs: true } },
        },
      });
    }),

    create: adminProcedure
      .input(
        z.object({
          url: z.string().url("Must be a valid URL"),
          events: z.array(z.string()).min(1, "Select at least one event"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const org = await db.organization.findUnique({
          where: { id: ctx.orgId },
          select: { planId: true },
        });

        if (!canUseIntegrations(org?.planId || "free-trial")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Webhooks require a Professional plan or higher",
          });
        }

        // Limit to 5 webhook endpoints per org
        const count = await db.webhookEndpoint.count({
          where: { organizationId: ctx.orgId },
        });
        if (count >= 5) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 5 webhook endpoints per organization",
          });
        }

        const secret = generateWebhookSecret();

        const endpoint = await db.webhookEndpoint.create({
          data: {
            organizationId: ctx.orgId,
            url: input.url,
            secret,
            events: input.events,
            description: input.description,
          },
        });

        log.info(`Webhook endpoint created for org ${ctx.orgId}: ${input.url}`);
        return { ...endpoint, secret }; // Return secret only on creation
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          url: z.string().url().optional(),
          events: z.array(z.string()).min(1).optional(),
          isActive: z.boolean().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const endpoint = await db.webhookEndpoint.findFirst({
          where: { id: input.id, organizationId: ctx.orgId },
        });

        if (!endpoint) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook endpoint not found" });
        }

        return db.webhookEndpoint.update({
          where: { id: input.id },
          data: {
            url: input.url,
            events: input.events,
            isActive: input.isActive,
            description: input.description,
          },
        });
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const endpoint = await db.webhookEndpoint.findFirst({
          where: { id: input.id, organizationId: ctx.orgId },
        });

        if (!endpoint) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook endpoint not found" });
        }

        await db.webhookEndpoint.delete({ where: { id: input.id } });
        return { success: true };
      }),

    refreshSecret: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const endpoint = await db.webhookEndpoint.findFirst({
          where: { id: input.id, organizationId: ctx.orgId },
        });

        if (!endpoint) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook endpoint not found" });
        }

        const newSecret = generateWebhookSecret();
        await db.webhookEndpoint.update({
          where: { id: input.id },
          data: { secret: newSecret },
        });

        return { secret: newSecret };
      }),

    // Recent delivery logs for a webhook
    logs: protectedProcedure
      .input(
        z.object({
          endpointId: z.string(),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const endpoint = await db.webhookEndpoint.findFirst({
          where: { id: input.endpointId, organizationId: ctx.orgId },
        });

        if (!endpoint) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return db.webhookLog.findMany({
          where: { webhookEndpointId: input.endpointId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    // Test a webhook endpoint
    test: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const endpoint = await db.webhookEndpoint.findFirst({
          where: { id: input.id, organizationId: ctx.orgId },
        });

        if (!endpoint) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const { deliverWebhook } = await import("../services/integration.service");
        const result = await deliverWebhook(endpoint.id, "webhook.test", {
          event: "webhook.test",
          timestamp: new Date().toISOString(),
          organizationId: ctx.orgId,
          message: "This is a test webhook delivery from VoxForge AI",
        });

        return result || { success: false, statusCode: null };
      }),
  }),
});
