import { db } from "@/lib/db";

export interface DashboardStats {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  totalMinutes: number;
  avgCallDuration: number;
  successRate: number;
  totalAgents: number;
  activeCampaigns: number;
}

export interface TrendData {
  date: string;
  calls: number;
  minutes: number;
  completed: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  avgDuration: number;
  positiveRate: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  status: string;
  totalContacts: number;
  contacted: number;
  completed: number;
  conversionRate: number;
}

/**
 * Get dashboard overview stats
 */
export async function getDashboardStats(
  organizationId: string,
  days: number = 30
): Promise<DashboardStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    callStats,
    durationStats,
    agentCount,
    activeCampaigns,
  ] = await Promise.all([
    db.call.groupBy({
      by: ["status"],
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _count: true,
    }),
    db.call.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      _sum: { durationSeconds: true },
      _avg: { durationSeconds: true },
    }),
    db.agent.count({
      where: { organizationId, isActive: true },
    }),
    db.campaign.count({
      where: {
        organizationId,
        status: { in: ["running", "scheduled"] },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  callStats.forEach((s) => {
    if (s.status) statusMap[s.status] = s._count;
  });

  const totalCalls = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completedCalls = statusMap["completed"] || 0;
  const failedCalls = (statusMap["failed"] || 0) + (statusMap["no-answer"] || 0);

  return {
    totalCalls,
    completedCalls,
    failedCalls,
    totalMinutes: Math.round((durationStats._sum.durationSeconds || 0) / 60),
    avgCallDuration: Math.round(durationStats._avg.durationSeconds || 0),
    successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
    totalAgents: agentCount,
    activeCampaigns,
  };
}

/**
 * Get call trend data for charts
 */
export async function getCallTrends(
  organizationId: string,
  days: number = 30
): Promise<TrendData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const calls = await db.call.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      status: true,
      durationSeconds: true,
    },
  });

  // Group by date
  const dailyData = new Map<string, { calls: number; minutes: number; completed: number }>();

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0] || "";
    dailyData.set(key, { calls: 0, minutes: 0, completed: 0 });
  }

  // Aggregate calls
  calls.forEach((call) => {
    const key = call.createdAt.toISOString().split("T")[0] || "";
    const existing = dailyData.get(key) || { calls: 0, minutes: 0, completed: 0 };

    existing.calls++;
    existing.minutes += Math.round((call.durationSeconds || 0) / 60);
    if (call.status === "completed") {
      existing.completed++;
    }

    dailyData.set(key, existing);
  });

  // Convert to array and sort
  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get agent performance metrics
 */
export async function getAgentPerformance(
  organizationId: string,
  days: number = 30
): Promise<AgentPerformance[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const agents = await db.agent.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      calls: {
        where: { createdAt: { gte: startDate } },
        select: {
          status: true,
          durationSeconds: true,
          sentiment: true,
        },
      },
    },
  });

  return agents.map((agent) => {
    const totalCalls = agent.calls.length;
    const completedCalls = agent.calls.filter((c) => c.status === "completed").length;
    const totalDuration = agent.calls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
    const positiveCalls = agent.calls.filter((c) => c.sentiment === "positive").length;
    const callsWithSentiment = agent.calls.filter((c) => c.sentiment).length;

    return {
      agentId: agent.id,
      agentName: agent.name,
      totalCalls,
      completedCalls,
      successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
      avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      positiveRate: callsWithSentiment > 0 ? Math.round((positiveCalls / callsWithSentiment) * 100) : 0,
    };
  });
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(
  organizationId: string
): Promise<CampaignPerformance[]> {
  const campaigns = await db.campaign.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: { contacts: true },
      },
      contacts: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return campaigns.map((campaign) => {
    const totalContacts = campaign._count.contacts;
    const contacted = campaign.contacts.filter((c) => c.status !== "pending").length;
    const completed = campaign.contacts.filter((c) => c.status === "completed").length;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      totalContacts,
      contacted,
      completed,
      conversionRate: contacted > 0 ? Math.round((completed / contacted) * 100) : 0,
    };
  });
}

/**
 * Get sentiment distribution
 */
export async function getSentimentDistribution(
  organizationId: string,
  days: number = 30
): Promise<Record<string, number>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sentiments = await db.call.groupBy({
    by: ["sentiment"],
    where: {
      organizationId,
      sentiment: { not: null },
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  const result: Record<string, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  sentiments.forEach((s) => {
    if (s.sentiment && s.sentiment in result) {
      result[s.sentiment] = s._count;
    }
  });

  return result;
}

/**
 * Get hourly call distribution
 */
export async function getHourlyDistribution(
  organizationId: string,
  days: number = 30
): Promise<{ hour: number; calls: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const calls = await db.call.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
  });

  const hourlyData = new Array(24).fill(0);

  calls.forEach((call) => {
    const hour = call.createdAt.getHours();
    hourlyData[hour]++;
  });

  return hourlyData.map((calls, hour) => ({ hour, calls }));
}

/**
 * Get top performing contacts (leads)
 */
export async function getTopLeads(
  organizationId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  name: string;
  company: string | null;
  phone: string;
  sentiment: string | null;
  leadScore: number | null;
}>> {
  const contacts = await db.contact.findMany({
    where: {
      organizationId,
      status: "completed",
    },
    include: {
      calls: {
        where: { status: "completed" },
        select: { sentiment: true, leadScore: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return contacts.map((contact) => ({
    id: contact.id,
    name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown",
    company: contact.company,
    phone: contact.phoneNumber,
    sentiment: contact.calls[0]?.sentiment || null,
    leadScore: contact.calls[0]?.leadScore || null,
  }));
}

/**
 * Get usage summary for billing
 */
export async function getUsageSummary(
  organizationId: string,
  month?: Date
): Promise<{
  totalCalls: number;
  totalMinutes: number;
  totalCost: number;
  byAgent: Array<{ agentId: string; agentName: string; calls: number; minutes: number }>;
}> {
  const startDate = month || new Date();
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const [callStats, agentStats, costStats] = await Promise.all([
    db.call.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lt: endDate },
      },
      _count: true,
      _sum: { durationSeconds: true },
    }),
    db.call.groupBy({
      by: ["agentId"],
      where: {
        organizationId,
        agentId: { not: null },
        createdAt: { gte: startDate, lt: endDate },
      },
      _count: true,
      _sum: { durationSeconds: true },
    }),
    db.call.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { costCents: true },
    }),
  ]);

  // Get agent names
  const agentIds = agentStats.map((a) => a.agentId).filter((id): id is string => id !== null);
  const agents = await db.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });

  const agentMap = new Map(agents.map((a) => [a.id, a.name]));

  return {
    totalCalls: callStats._count || 0,
    totalMinutes: Math.round((callStats._sum.durationSeconds || 0) / 60),
    totalCost: (costStats._sum.costCents || 0) / 100,
    byAgent: agentStats.map((stat) => ({
      agentId: stat.agentId || "",
      agentName: agentMap.get(stat.agentId || "") || "Unknown",
      calls: stat._count,
      minutes: Math.round((stat._sum.durationSeconds || 0) / 60),
    })),
  };
}
