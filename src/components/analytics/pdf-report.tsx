"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    objectFit: "contain" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  headerRight: {
    textAlign: "right" as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  statSubtext: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 2,
  },
  table: {
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
    paddingBottom: 6,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    color: "#475569",
  },
  tableCell: {
    fontSize: 9,
    color: "#334155",
  },
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

interface OverviewData {
  calls: { total: number; completed: number; successRate: number };
  minutes: { total: number; avgPerCall: number };
  agents: { total: number; active: number };
  campaigns: { total: number; active: number };
}

interface DailyCallData {
  date: string;
  count: number;
}

interface AgentData {
  id: string;
  name: string;
  totalCalls: number;
  completedCalls: number;
  successRate: number;
  totalMinutes: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface SentimentData {
  sentiment: string | null;
  count: number;
}

interface AnalyticsReportProps {
  brandName: string;
  brandLogoUrl: string | null;
  primaryColor: string;
  dateRange: string;
  overview: OverviewData | null;
  callsByDay: DailyCallData[] | null;
  agentPerformance: AgentData[] | null;
  sentimentBreakdown: SentimentData[] | null;
}

export function AnalyticsReport({
  brandName,
  brandLogoUrl,
  primaryColor,
  dateRange,
  overview,
  callsByDay,
  agentPerformance,
  sentimentBreakdown,
}: AnalyticsReportProps) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: primaryColor },
          ]}
        >
          <View style={styles.headerLeft}>
            {brandLogoUrl && (
              <Image src={brandLogoUrl} style={styles.headerLogo} />
            )}
            <View>
              <Text style={[styles.headerTitle, { color: primaryColor }]}>
                Analytics Report
              </Text>
              <Text style={styles.headerSubtitle}>{brandName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 9, color: "#64748b" }}>{dateRange}</Text>
            <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>
              Generated {now}
            </Text>
          </View>
        </View>

        {/* Overview Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Calls</Text>
            <Text style={styles.statValue}>
              {overview?.calls.total ?? 0}
            </Text>
            <Text style={styles.statSubtext}>
              {overview?.calls.successRate ?? 0}% success rate
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Minutes</Text>
            <Text style={styles.statValue}>
              {overview?.minutes.total ?? 0}
            </Text>
            <Text style={styles.statSubtext}>
              Avg {overview?.minutes.avgPerCall ?? 0} min/call
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Agents</Text>
            <Text style={styles.statValue}>
              {overview?.agents.active ?? 0}
            </Text>
            <Text style={styles.statSubtext}>
              of {overview?.agents.total ?? 0} total
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Campaigns</Text>
            <Text style={styles.statValue}>
              {overview?.campaigns.active ?? 0}
            </Text>
            <Text style={styles.statSubtext}>
              of {overview?.campaigns.total ?? 0} total
            </Text>
          </View>
        </View>

        {/* Daily Call Volume */}
        {callsByDay && callsByDay.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Daily Call Volume</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Calls
                </Text>
              </View>
              {callsByDay.slice(-14).map((day) => (
                <View key={day.date} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {day.date}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1, textAlign: "right" as const },
                    ]}
                  >
                    {day.count}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Agent Performance */}
        {agentPerformance && agentPerformance.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Agent Performance</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                  Agent
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Calls
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Success %
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Minutes
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Sentiment
                </Text>
              </View>
              {agentPerformance.map((agent) => {
                const totalSentiment =
                  agent.sentimentCounts.positive +
                  agent.sentimentCounts.neutral +
                  agent.sentimentCounts.negative;
                const sentimentPct =
                  totalSentiment > 0
                    ? Math.round(
                        (agent.sentimentCounts.positive / totalSentiment) * 100
                      )
                    : 0;
                return (
                  <View key={agent.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {agent.name}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, textAlign: "right" as const },
                      ]}
                    >
                      {agent.totalCalls}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, textAlign: "right" as const },
                      ]}
                    >
                      {agent.successRate}%
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, textAlign: "right" as const },
                      ]}
                    >
                      {agent.totalMinutes}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, textAlign: "right" as const },
                      ]}
                    >
                      {sentimentPct}% pos
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Sentiment Breakdown */}
        {sentimentBreakdown && sentimentBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sentiment Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                  Sentiment
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    { flex: 1, textAlign: "right" as const },
                  ]}
                >
                  Count
                </Text>
              </View>
              {sentimentBreakdown.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {item.sentiment
                      ? item.sentiment.charAt(0).toUpperCase() +
                        item.sentiment.slice(1)
                      : "Unknown"}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1, textAlign: "right" as const },
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by {brandName}</Text>
          <Text>{now}</Text>
        </View>
      </Page>
    </Document>
  );
}
