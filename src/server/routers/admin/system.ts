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

    // ── Vapi account ─────────────────────────────────────────────────────────
    type VapiAccount = {
      id?: string;
      name?: string;
      balance?: number;
      billingLimit?: number;
    };
    let vapiAccount: VapiAccount | null = null;
    let vapiOk = false;
    if (vapiKey) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch("https://api.vapi.ai/account", {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${vapiKey}` },
        });
        clearTimeout(t);
        if (res.ok) {
          vapiAccount = (await res.json()) as VapiAccount;
          vapiOk = true;
        }
      } catch {
        // network error
      }
    }

    // ── Twilio account balance ────────────────────────────────────────────────
    let twilioBalance: string | null = null;
    let twilioCurrency = "USD";
    let twilioOk = false;
    if (twilioSid && twilioToken) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const authB64 = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Balance.json`,
          { signal: ctrl.signal, headers: { Authorization: `Basic ${authB64}` } }
        );
        clearTimeout(t);
        if (res.ok) {
          const json = (await res.json()) as { balance?: string; currency?: string };
          twilioBalance = json.balance ?? null;
          twilioCurrency = json.currency ?? "USD";
          twilioOk = true;
        }
      } catch {
        // network error
      }
    }

    // balance field may be nested under billingLimit if not directly exposed
    const vapiBalance =
      vapiAccount?.balance ?? vapiAccount?.billingLimit ?? null;

    return {
      vapi: {
        configured: !!vapiKey,
        connected: vapiOk,
        accountName: vapiAccount?.name ?? null,
        balance: vapiBalance,
        lowBalanceThreshold: 10,
      },
      twilio: {
        configured: !!(twilioSid && twilioToken),
        connected: twilioOk,
        balance: twilioBalance,
        currency: twilioCurrency,
        lowBalanceThreshold: "10.00",
      },
    };
  }),

  getPhoneStats: superAdminProcedure.query(async ({ ctx }) => {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const twilioToken = process.env.TWILIO_AUTH_TOKEN ?? "";

    // ── DB counts ────────────────────────────────────────────────────────────
    const [
      totalNumbers,
      activeNumbers,
      withCallerIdRegistered,
      byType,
      byCountry,
    ] = await Promise.all([
      ctx.db.phoneNumber.count().catch(() => 0),
      ctx.db.phoneNumber.count({ where: { isActive: true } }).catch(() => 0),
      ctx.db.phoneNumber
        .count({ where: { cnamStatus: "registered" } })
        .catch(() => 0),
      ctx.db.phoneNumber
        .groupBy({ by: ["type"], _count: { id: true } })
        .catch(() => [] as { type: string; _count: { id: number } }[]),
      ctx.db.phoneNumber
        .groupBy({ by: ["countryCode"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 })
        .catch(() => [] as { countryCode: string | null; _count: { id: number } }[]),
    ]);

    // ── Twilio API: actual provisioned count ──────────────────────────────────
    let twilioProvisioned: number | null = null;
    if (twilioSid && twilioToken) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const authB64 = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json?PageSize=1`,
          { signal: ctrl.signal, headers: { Authorization: `Basic ${authB64}` } }
        );
        clearTimeout(t);
        if (res.ok) {
          const json = (await res.json()) as {
            meta?: { total?: number };
            end?: number;
          };
          twilioProvisioned = json.meta?.total ?? null;
        }
      } catch {
        // network error
      }
    }

    return {
      db: {
        total: totalNumbers,
        active: activeNumbers,
        callerIdRegistered: withCallerIdRegistered,
        byType: (byType as { type: string; _count: { id: number } }[]).map((r) => ({
          type: r.type,
          count: r._count.id,
        })),
        byCountry: (byCountry as { countryCode: string | null; _count: { id: number } }[]).map(
          (r) => ({ country: r.countryCode ?? "Unknown", count: r._count.id })
        ),
      },
      twilioProvisioned,
    };
  }),

  getOrgDemographics: superAdminProcedure.query(async ({ ctx }) => {
    // ── Referral sources ──────────────────────────────────────────────────────
    const byReferral = await ctx.db.organization
      .groupBy({
        by: ["referralSource"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      })
      .catch(() => [] as { referralSource: string | null; _count: { id: number } }[]);

    // ── Plan distribution ─────────────────────────────────────────────────────
    const byPlan = await ctx.db.organization.groupBy({
      by: ["planId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // ── Signups by month (last 6 months) ──────────────────────────────────────
    const now = new Date();
    const signupsByMonth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await ctx.db.organization.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      signupsByMonth.push({
        month: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        count,
      });
    }

    // ── User stats ────────────────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, newUsersLast30, totalOrgs] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.organization.count(),
    ]);

    return {
      byReferral: (
        byReferral as { referralSource: string | null; _count: { id: number } }[]
      ).map((r) => ({
        source: r.referralSource ?? "Direct / Unknown",
        count: r._count.id,
      })),
      byPlan: byPlan.map((r) => ({ planId: r.planId, count: r._count.id })),
      signupsByMonth,
      users: {
        total: totalUsers,
        newLast30: newUsersLast30,
        avgPerOrg: totalOrgs > 0 ? Math.round((totalUsers / totalOrgs) * 10) / 10 : 0,
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
