import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

async function pingUrl(url: string, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, method: "GET" });
    clearTimeout(id);
    return { ok: res.ok || res.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export const systemRouter = router({
  getHealthChecks: superAdminProcedure.query(async () => {
    const [vapi, twilio, stripe] = await Promise.all([
      pingUrl("https://api.vapi.ai/health").catch(() => ({ ok: false, latencyMs: 0 })),
      pingUrl("https://api.twilio.com").catch(() => ({ ok: false, latencyMs: 0 })),
      pingUrl("https://api.stripe.com/v1").catch(() => ({ ok: false, latencyMs: 0 })),
    ]);

    return {
      services: [
        { name: "Vapi", ...vapi },
        { name: "Twilio", ...twilio },
        { name: "Stripe", ...stripe },
      ],
      checkedAt: new Date().toISOString(),
    };
  }),

  getDBStats: superAdminProcedure.query(async ({ ctx }) => {
    const [
      organizations,
      users,
      agents,
      calls,
      campaigns,
      contacts,
      appointments,
      integrations,
      webhookLogs,
      auditLogs,
      feedback,
      adminLogs,
    ] = await Promise.all([
      ctx.db.organization.count(),
      ctx.db.user.count(),
      ctx.db.agent.count(),
      ctx.db.call.count(),
      ctx.db.campaign.count(),
      ctx.db.contact.count(),
      ctx.db.appointment.count(),
      ctx.db.integration.count(),
      ctx.db.webhookLog.count(),
      ctx.db.auditLog.count(),
      ctx.db.feedback.count(),
      ctx.db.adminActivityLog.count(),
    ]);

    return {
      tables: [
        { table: "organizations", rows: organizations },
        { table: "users", rows: users },
        { table: "agents", rows: agents },
        { table: "calls", rows: calls },
        { table: "campaigns", rows: campaigns },
        { table: "contacts", rows: contacts },
        { table: "appointments", rows: appointments },
        { table: "integrations", rows: integrations },
        { table: "webhook_logs", rows: webhookLogs },
        { table: "audit_logs", rows: auditLogs },
        { table: "feedback", rows: feedback },
        { table: "admin_activity_logs", rows: adminLogs },
      ],
    };
  }),
});
