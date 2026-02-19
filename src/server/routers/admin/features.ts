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
      withInterviewCampaign,
      withCall,
      withAppointment,
      withKnowledge,
      withIntegration,
      withReceptionistMsg,
      withApiKey,
      withPhoneNumber,
    ] = await Promise.all([
      ctx.db.organization.count({ where: { agents: { some: {} } } }),
      ctx.db.organization.count({ where: { campaigns: { some: {} } } }),
      ctx.db.organization.count({
        where: { campaigns: { some: { type: "interview" } } },
      }),
      ctx.db.organization.count({ where: { calls: { some: {} } } }),
      ctx.db.organization.count({ where: { appointments: { some: {} } } }),
      ctx.db.organization.count({ where: { knowledgeDocs: { some: {} } } }),
      ctx.db.organization.count({
        where: { integrations: { some: { status: "connected" } } },
      }),
      ctx.db.organization.count({ where: { receptionistMessages: { some: {} } } }),
      ctx.db.organization.count({ where: { apiKeys: { some: {} } } }),
      ctx.db.organization.count({ where: { phoneNumbers: { some: {} } } }).catch(() => 0),
    ]);

    return [
      { feature: "AI Voice Agents", orgs: withAgent, pct: pct(withAgent) },
      { feature: "Cold-Call Campaigns", orgs: withCampaign, pct: pct(withCampaign) },
      { feature: "Interview Campaigns", orgs: withInterviewCampaign, pct: pct(withInterviewCampaign) },
      { feature: "Calls Made", orgs: withCall, pct: pct(withCall) },
      { feature: "Appointment Booking", orgs: withAppointment, pct: pct(withAppointment) },
      { feature: "Knowledge Base", orgs: withKnowledge, pct: pct(withKnowledge) },
      { feature: "Integrations", orgs: withIntegration, pct: pct(withIntegration) },
      { feature: "AI Receptionist", orgs: withReceptionistMsg, pct: pct(withReceptionistMsg) },
      { feature: "API Keys (Dev)", orgs: withApiKey, pct: pct(withApiKey) },
      { feature: "Phone Numbers", orgs: withPhoneNumber, pct: pct(withPhoneNumber) },
    ];
  }),

  getMostUsedFeatures: superAdminProcedure.query(async ({ ctx }) => {
    const [
      agents,
      calls,
      campaigns,
      interviewCampaigns,
      contacts,
      appointments,
      knowledgeDocs,
      integrations,
      phoneNumbers,
    ] = await Promise.all([
      ctx.db.agent.count(),
      ctx.db.call.count(),
      ctx.db.campaign.count({ where: { type: "cold_calling" } }),
      ctx.db.campaign.count({ where: { type: "interview" } }),
      ctx.db.contact.count(),
      ctx.db.appointment.count(),
      ctx.db.knowledgeDocument.count(),
      ctx.db.integration.count({ where: { status: "connected" } }),
      ctx.db.phoneNumber.count().catch(() => 0),
    ]);
    return {
      agents,
      calls,
      campaigns,
      interviewCampaigns,
      contacts,
      appointments,
      knowledgeDocs,
      integrations,
      phoneNumbers,
    };
  }),

  // Adoption per plan tier
  getAdoptionByPlan: superAdminProcedure.query(async ({ ctx }) => {
    const plans = ["free-trial", "starter", "professional", "enterprise"];
    const result: { plan: string; feature: string; pct: number }[] = [];

    for (const planId of plans) {
      const total = await ctx.db.organization.count({ where: { planId } });
      if (total === 0) continue;
      const [withCall, withIntegration, withInterview] = await Promise.all([
        ctx.db.organization.count({ where: { planId, calls: { some: {} } } }),
        ctx.db.organization.count({
          where: { planId, integrations: { some: { status: "connected" } } },
        }),
        ctx.db.organization.count({
          where: { planId, campaigns: { some: { type: "interview" } } },
        }),
      ]);
      result.push({ plan: planId, feature: "Made Call", pct: Math.round((withCall / total) * 100) });
      result.push({
        plan: planId,
        feature: "Integration",
        pct: Math.round((withIntegration / total) * 100),
      });
      result.push({
        plan: planId,
        feature: "Interview",
        pct: Math.round((withInterview / total) * 100),
      });
    }
    return result;
  }),
});
