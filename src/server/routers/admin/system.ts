import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

async function pingUrl(url: string, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, method: "GET" });
    clearTimeout(id);
    // 4xx = service is up but needs auth, 5xx = down
    return { ok: res.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function pingWithAuth(
  url: string,
  authHeader: string,
  timeoutMs = 5000
): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      method: "GET",
      headers: { Authorization: authHeader },
    });
    clearTimeout(id);
    return { ok: res.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export const systemRouter = router({
  getHealthChecks: superAdminProcedure.query(async () => {
    const vapiKey = process.env.VAPI_API_KEY ?? "";
    const clerkKey = process.env.CLERK_SECRET_KEY ?? "";
    const resendKey = process.env.RESEND_API_KEY ?? "";
    const twilioSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const twilioToken = process.env.TWILIO_AUTH_TOKEN ?? "";

    const fb = (): { ok: boolean; latencyMs: number } => ({ ok: false, latencyMs: 0 });
    const twilioBasic =
      twilioSid && twilioToken
        ? `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`
        : "";

    // Each promise gets its own .catch() so TypeScript infers a tuple (no T | undefined)
    const [vapi, twilio, stripe, clerk, resend, supabase, cloudflare] = await Promise.all([
      (vapiKey
        ? pingWithAuth("https://api.vapi.ai/account", `Bearer ${vapiKey}`)
        : pingUrl("https://api.vapi.ai/health")
      ).catch(fb),
      (twilioSid && twilioToken
        ? pingWithAuth(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`,
            twilioBasic
          )
        : pingUrl("https://api.twilio.com")
      ).catch(fb),
      pingUrl("https://api.stripe.com/v1").catch(fb),
      (clerkKey
        ? pingWithAuth("https://api.clerk.com/v1/sessions?limit=1", `Bearer ${clerkKey}`)
        : pingUrl("https://clerk.com")
      ).catch(fb),
      (resendKey
        ? pingWithAuth("https://api.resend.com/domains", `Bearer ${resendKey}`)
        : pingUrl("https://resend.com")
      ).catch(fb),
      pingUrl("https://supabase.com").catch(fb),
      pingUrl("https://api.cloudflare.com").catch(fb),
    ]);

    const services: { name: string; ok: boolean; latencyMs: number }[] = [
      { name: "Vapi", ok: vapi.ok, latencyMs: vapi.latencyMs },
      { name: "Twilio", ok: twilio.ok, latencyMs: twilio.latencyMs },
      { name: "Stripe", ok: stripe.ok, latencyMs: stripe.latencyMs },
      { name: "Clerk", ok: clerk.ok, latencyMs: clerk.latencyMs },
      { name: "Resend", ok: resend.ok, latencyMs: resend.latencyMs },
      { name: "Supabase", ok: supabase.ok, latencyMs: supabase.latencyMs },
      { name: "Cloudflare R2", ok: cloudflare.ok, latencyMs: cloudflare.latencyMs },
    ];
    return { services, checkedAt: new Date().toISOString() };
  }),

  getUsageStats: superAdminProcedure.query(async () => {
    const vapiKey = process.env.VAPI_API_KEY ?? "";
    const twilioSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const twilioToken = process.env.TWILIO_AUTH_TOKEN ?? "";

    // Vapi account balance
    let vapiBalance: number | null = null;
    let vapiOk = false;
    if (vapiKey) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("https://api.vapi.ai/account", {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${vapiKey}` },
        });
        clearTimeout(id);
        if (res.ok) {
          const json = (await res.json()) as { balance?: number };
          vapiBalance = json.balance ?? null;
          vapiOk = true;
        }
      } catch {
        // Network error — leave null
      }
    }

    // Twilio account balance
    let twilioBalance: string | null = null;
    let twilioCurrency = "USD";
    let twilioOk = false;
    if (twilioSid && twilioToken) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 8000);
        const authB64 = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Balance.json`,
          { signal: controller.signal, headers: { Authorization: `Basic ${authB64}` } }
        );
        clearTimeout(id);
        if (res.ok) {
          const json = (await res.json()) as { balance?: string; currency?: string };
          twilioBalance = json.balance ?? null;
          twilioCurrency = json.currency ?? "USD";
          twilioOk = true;
        }
      } catch {
        // Network error — leave null
      }
    }

    return {
      vapi: {
        configured: !!vapiKey,
        balance: vapiBalance,
        ok: vapiOk,
        lowBalanceThreshold: 10,
      },
      twilio: {
        configured: !!(twilioSid && twilioToken),
        balance: twilioBalance,
        currency: twilioCurrency,
        ok: twilioOk,
        lowBalanceThreshold: "10.00",
      },
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
      ctx.db.organization.count().catch(() => 0),
      ctx.db.user.count().catch(() => 0),
      ctx.db.agent.count().catch(() => 0),
      ctx.db.call.count().catch(() => 0),
      ctx.db.campaign.count().catch(() => 0),
      ctx.db.contact.count().catch(() => 0),
      ctx.db.appointment.count().catch(() => 0),
      ctx.db.integration.count().catch(() => 0),
      ctx.db.webhookLog.count().catch(() => 0),
      ctx.db.auditLog.count().catch(() => 0),
      ctx.db.feedback.count().catch(() => 0),
      ctx.db.adminActivityLog.count().catch(() => 0),
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
