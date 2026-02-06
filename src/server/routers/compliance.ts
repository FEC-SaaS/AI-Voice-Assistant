import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { format } from "date-fns";

// Two-party consent states
const TWO_PARTY_CONSENT_STATES = [
  "CA", "CT", "FL", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "PA", "VT", "WA",
] as const;

// Simplified area code to state mapping for two-party consent states
const AREA_CODE_TO_STATE: Record<string, string> = {
  // California
  "209": "CA", "213": "CA", "279": "CA", "310": "CA", "323": "CA", "341": "CA",
  "408": "CA", "415": "CA", "424": "CA", "442": "CA", "510": "CA", "530": "CA",
  "559": "CA", "562": "CA", "619": "CA", "626": "CA", "628": "CA", "650": "CA",
  "657": "CA", "661": "CA", "669": "CA", "707": "CA", "714": "CA", "747": "CA",
  "760": "CA", "805": "CA", "818": "CA", "831": "CA", "858": "CA", "909": "CA",
  "916": "CA", "925": "CA", "949": "CA", "951": "CA",
  // Connecticut
  "203": "CT", "475": "CT", "860": "CT",
  // Florida
  "239": "FL", "305": "FL", "321": "FL", "352": "FL", "386": "FL", "407": "FL",
  "561": "FL", "727": "FL", "754": "FL", "772": "FL", "786": "FL", "813": "FL",
  "850": "FL", "863": "FL", "904": "FL", "941": "FL", "954": "FL",
  // Illinois
  "217": "IL", "224": "IL", "309": "IL", "312": "IL", "331": "IL", "618": "IL",
  "630": "IL", "708": "IL", "773": "IL", "779": "IL", "815": "IL", "847": "IL",
  "872": "IL",
  // Maryland
  "240": "MD", "301": "MD", "410": "MD", "443": "MD", "667": "MD",
  // Massachusetts
  "339": "MA", "351": "MA", "413": "MA", "508": "MA", "617": "MA", "774": "MA",
  "781": "MA", "857": "MA", "978": "MA",
  // Michigan
  "231": "MI", "248": "MI", "269": "MI", "313": "MI", "517": "MI", "586": "MI",
  "616": "MI", "734": "MI", "810": "MI", "906": "MI", "947": "MI", "989": "MI",
  // Montana
  "406": "MT",
  // Nevada
  "702": "NV", "725": "NV", "775": "NV",
  // New Hampshire
  "603": "NH",
  // Pennsylvania
  "215": "PA", "223": "PA", "267": "PA", "272": "PA", "412": "PA", "445": "PA",
  "484": "PA", "570": "PA", "610": "PA", "717": "PA", "724": "PA", "814": "PA",
  "878": "PA",
  // Vermont
  "802": "VT",
  // Washington
  "206": "WA", "253": "WA", "360": "WA", "425": "WA", "509": "WA", "564": "WA",
};

/**
 * Extract area code from a phone number string.
 * Handles formats like +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX, (XXX) XXX-XXXX, etc.
 */
function extractAreaCode(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1, 4);
  }
  if (digits.length === 10) {
    return digits.substring(0, 3);
  }
  return null;
}

/**
 * Get the two-party consent state for a phone number, or null if not in one.
 */
function getConsentState(phone: string): string | null {
  const areaCode = extractAreaCode(phone);
  if (!areaCode) return null;
  return AREA_CODE_TO_STATE[areaCode] || null;
}

/**
 * Calculate the compliance score for an organization.
 * Returns a breakdown of categories and total weighted score.
 */
async function calculateComplianceScore(orgId: string, db: any) {
  // DNC Scrubbing (30%)
  const dncCount = await db.dNCEntry.count({
    where: { organizationId: orgId },
  });
  const dncScore = dncCount > 0 ? 100 : 50;
  const dncRecommendation = dncCount > 0
    ? "DNC list is active and configured."
    : "Upload or configure your DNC list to improve compliance.";

  // Consent Management (25%)
  const totalContacts = await db.contact.count({
    where: { organizationId: orgId },
  });
  const now = new Date();
  const contactsWithConsent = await db.consent.count({
    where: {
      organizationId: orgId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
  });
  const consentScore = totalContacts > 0
    ? Math.round((contactsWithConsent / totalContacts) * 100)
    : 100; // If no contacts, score as compliant
  const consentRecommendation = consentScore >= 80
    ? "Good consent coverage across contacts."
    : "Increase consent collection rate. Ensure all contacts have valid consent records.";

  // Calling Hours (20%) - enforced by system
  const callingHoursScore = 100;
  const callingHoursRecommendation = "Calling hours are enforced by the system automatically.";

  // AI Disclosure (15%)
  const agents = await db.agent.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { systemPrompt: true },
  });
  const totalAgents = agents.length;
  const agentsWithDisclosure = agents.filter(
    (a: { systemPrompt: string }) =>
      /\bAI\b/i.test(a.systemPrompt) || /artificial/i.test(a.systemPrompt)
  ).length;
  const aiDisclosureScore = totalAgents > 0
    ? Math.round((agentsWithDisclosure / totalAgents) * 100)
    : 100;
  const aiDisclosureRecommendation = aiDisclosureScore >= 100
    ? "All agents include AI disclosure in their prompts."
    : "Ensure all agent system prompts include AI disclosure language (mention 'AI' or 'artificial').";

  // Opt-Out Handling (10%) - system auto-handles
  const optOutScore = 100;
  const optOutRecommendation = "Opt-out requests are automatically handled by the system.";

  const breakdown = [
    {
      category: "DNC Scrubbing",
      weight: 30,
      score: dncScore,
      maxScore: 100,
      recommendation: dncRecommendation,
    },
    {
      category: "Consent Management",
      weight: 25,
      score: consentScore,
      maxScore: 100,
      recommendation: consentRecommendation,
    },
    {
      category: "Calling Hours",
      weight: 20,
      score: callingHoursScore,
      maxScore: 100,
      recommendation: callingHoursRecommendation,
    },
    {
      category: "AI Disclosure",
      weight: 15,
      score: aiDisclosureScore,
      maxScore: 100,
      recommendation: aiDisclosureRecommendation,
    },
    {
      category: "Opt-Out Handling",
      weight: 10,
      score: optOutScore,
      maxScore: 100,
      recommendation: optOutRecommendation,
    },
  ];

  const totalScore = Math.round(
    breakdown.reduce((sum, item) => sum + (item.score * item.weight) / 100, 0)
  );

  return { breakdown, totalScore };
}

export const complianceRouter = router({
  /**
   * Get compliance dashboard overview stats.
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalDncEntries, activeConsents, recentOptOuts, complianceScore] =
      await Promise.all([
        ctx.db.dNCEntry.count({
          where: { organizationId: ctx.orgId },
        }),
        ctx.db.consent.count({
          where: {
            organizationId: ctx.orgId,
            revokedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        }),
        ctx.db.dNCEntry.count({
          where: {
            organizationId: ctx.orgId,
            source: "verbal_request",
            addedAt: { gte: thirtyDaysAgo },
          },
        }),
        calculateComplianceScore(ctx.orgId, ctx.db),
      ]);

    return {
      totalDncEntries,
      activeConsents,
      recentOptOuts,
      complianceScore: complianceScore.totalScore,
    };
  }),

  /**
   * Get detailed compliance score with weighted breakdown.
   */
  getComplianceScore: protectedProcedure.query(async ({ ctx }) => {
    return calculateComplianceScore(ctx.orgId, ctx.db);
  }),

  /**
   * Get compliance status for each campaign.
   */
  getCampaignCompliance: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: { organizationId: ctx.orgId },
      select: {
        id: true,
        name: true,
        contacts: {
          select: {
            id: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Get all DNC phone numbers for this org for efficient lookup
    const dncEntries = await ctx.db.dNCEntry.findMany({
      where: { organizationId: ctx.orgId },
      select: { phoneNumber: true },
    });
    const dncSet = new Set(dncEntries.map((d: { phoneNumber: string }) => d.phoneNumber));

    // Get all active consents for this org for efficient lookup
    const now = new Date();
    const consents = await ctx.db.consent.findMany({
      where: {
        organizationId: ctx.orgId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: { contactPhone: true },
    });
    const consentSet = new Set(consents.map((c: { contactPhone: string }) => c.contactPhone));

    return campaigns.map((campaign: {
      id: string;
      name: string;
      contacts: Array<{ id: string; phoneNumber: string }>;
    }) => {
      const totalContacts = campaign.contacts.length;

      // DNC-scrubbed = contacts whose phone is NOT in DNC
      const scrubbedCount = campaign.contacts.filter(
        (c) => !dncSet.has(c.phoneNumber)
      ).length;

      // Contacts with valid consent
      const consentCount = campaign.contacts.filter(
        (c) => consentSet.has(c.phoneNumber)
      ).length;

      const scrubRate = totalContacts > 0
        ? Math.round((scrubbedCount / totalContacts) * 100)
        : 100;
      const consentRate = totalContacts > 0
        ? Math.round((consentCount / totalContacts) * 100)
        : 100;

      // Composite score: average of scrub rate and consent rate
      const score = Math.round((scrubRate + consentRate) / 2);

      return {
        campaignId: campaign.id,
        name: campaign.name,
        totalContacts,
        scrubRate,
        consentRate,
        score,
      };
    });
  }),

  /**
   * Get paginated DNC list with optional search.
   */
  getDNCList: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: any = {
        organizationId: ctx.orgId,
      };

      if (search) {
        where.OR = [
          { phoneNumber: { contains: search } },
          { reason: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } },
        ];
      }

      const [entries, total] = await Promise.all([
        ctx.db.dNCEntry.findMany({
          where,
          orderBy: { addedAt: "desc" },
          skip,
          take: limit,
        }),
        ctx.db.dNCEntry.count({ where }),
      ]);

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get consent compliance broken down by two-party consent state.
   */
  getConsentByState: protectedProcedure.query(async ({ ctx }) => {
    // Get all contacts for this org
    const contacts = await ctx.db.contact.findMany({
      where: { organizationId: ctx.orgId },
      select: { phoneNumber: true },
    });

    // Get all active consents for this org
    const now = new Date();
    const consents = await ctx.db.consent.findMany({
      where: {
        organizationId: ctx.orgId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: { contactPhone: true },
    });
    const consentSet = new Set(consents.map((c: { contactPhone: string }) => c.contactPhone));

    // Group contacts by two-party consent state
    const stateData: Record<string, { total: number; withConsent: number }> = {};
    for (const state of TWO_PARTY_CONSENT_STATES) {
      stateData[state] = { total: 0, withConsent: 0 };
    }

    for (const contact of contacts) {
      const state = getConsentState(contact.phoneNumber);
      if (state && stateData[state] !== undefined) {
        stateData[state].total++;
        if (consentSet.has(contact.phoneNumber)) {
          stateData[state].withConsent++;
        }
      }
    }

    return TWO_PARTY_CONSENT_STATES.map((state) => {
      const data = stateData[state] ?? { total: 0, withConsent: 0 };
      return {
        state,
        totalContacts: data.total,
        withConsent: data.withConsent,
        complianceRate:
          data.total > 0
            ? Math.round((data.withConsent / data.total) * 100)
            : 100,
      };
    });
  }),

  /**
   * Get recent violation alerts (blocked calls from audit logs).
   */
  getViolationAlerts: protectedProcedure.query(async ({ ctx }) => {
    const alerts = await ctx.db.auditLog.findMany({
      where: {
        organizationId: ctx.orgId,
        action: "call.blocked",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return alerts;
  }),

  /**
   * Get paginated audit logs with optional filtering.
   */
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        action: z.string().optional(),
        entityType: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { action, entityType, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: any = {
        organizationId: ctx.orgId,
      };

      if (action) {
        where.action = action;
      }

      if (entityType) {
        where.entityType = entityType;
      }

      const [logs, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        ctx.db.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Export audit logs as CSV (admin only).
   */
  exportAuditLogs: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const where: any = {
        organizationId: ctx.orgId,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      const logs = await ctx.db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const header = "Date,Action,Entity Type,Entity ID,User ID,Details";
      const rows = logs.map(
        (log: {
          createdAt: Date;
          action: string;
          entityType: string;
          entityId: string | null;
          userId: string | null;
          details: any;
        }) => {
          const detailsStr = JSON.stringify(log.details).replace(/,/g, ";").replace(/"/g, "'");
          return [
            format(log.createdAt, "yyyy-MM-dd HH:mm:ss"),
            log.action,
            log.entityType,
            log.entityId || "",
            log.userId || "",
            `"${detailsStr}"`,
          ].join(",");
        }
      );

      return {
        csv: [header, ...rows].join("\n"),
        filename: `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`,
      };
    }),
});
