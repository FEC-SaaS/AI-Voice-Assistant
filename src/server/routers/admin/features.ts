import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const featuresRouter = router({
  getAdoptionMatrix: superAdminProcedure.query(async ({ ctx }) => {
    const totalOrgs = await ctx.db.organization.count();
    if (totalOrgs === 0) return [];

    const pct = (n: number) => Math.round((n / totalOrgs) * 100);

    const [
      withAgent,
      withCampaign,
      withCall,
      withAppointment,
      withKnowledge,
      withIntegration,
      withReceptionistMsg,
      withApiKey,
    ] = await Promise.all([
      ctx.db.organization.count({ where: { agents: { some: {} } } }),
      ctx.db.organization.count({ where: { campaigns: { some: {} } } }),
      ctx.db.organization.count({ where: { calls: { some: {} } } }),
      ctx.db.organization.count({ where: { appointments: { some: {} } } }),
      ctx.db.organization.count({ where: { knowledgeDocs: { some: {} } } }),
      ctx.db.organization.count({ where: { integrations: { some: { status: "connected" } } } }),
      ctx.db.organization.count({ where: { receptionistMessages: { some: {} } } }),
      ctx.db.organization.count({ where: { apiKeys: { some: {} } } }),
    ]);

    return [
      { feature: "Agents", orgs: withAgent, pct: pct(withAgent) },
      { feature: "Campaigns", orgs: withCampaign, pct: pct(withCampaign) },
      { feature: "Calls Made", orgs: withCall, pct: pct(withCall) },
      { feature: "Appointments", orgs: withAppointment, pct: pct(withAppointment) },
      { feature: "Knowledge Base", orgs: withKnowledge, pct: pct(withKnowledge) },
      { feature: "Integrations", orgs: withIntegration, pct: pct(withIntegration) },
      { feature: "Receptionist", orgs: withReceptionistMsg, pct: pct(withReceptionistMsg) },
      { feature: "API Keys", orgs: withApiKey, pct: pct(withApiKey) },
    ];
  }),

  getMostUsedFeatures: superAdminProcedure.query(async ({ ctx }) => {
    const [agents, calls, campaigns, contacts, appointments, knowledgeDocs] = await Promise.all([
      ctx.db.agent.count(),
      ctx.db.call.count(),
      ctx.db.campaign.count(),
      ctx.db.contact.count(),
      ctx.db.appointment.count(),
      ctx.db.knowledgeDocument.count(),
    ]);
    return { agents, calls, campaigns, contacts, appointments, knowledgeDocs };
  }),

  // Adoption per plan tier
  getAdoptionByPlan: superAdminProcedure.query(async ({ ctx }) => {
    const plans = ["free-trial", "starter", "professional", "enterprise"];
    const result: { plan: string; feature: string; pct: number }[] = [];

    for (const planId of plans) {
      const total = await ctx.db.organization.count({ where: { planId } });
      if (total === 0) continue;
      const withCall = await ctx.db.organization.count({ where: { planId, calls: { some: {} } } });
      const withIntegration = await ctx.db.organization.count({
        where: { planId, integrations: { some: { status: "connected" } } },
      });
      result.push({ plan: planId, feature: "Made Call", pct: Math.round((withCall / total) * 100) });
      result.push({ plan: planId, feature: "Integration", pct: Math.round((withIntegration / total) * 100) });
    }
    return result;
  }),
});
