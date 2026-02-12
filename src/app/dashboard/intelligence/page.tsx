"use client";

import { useState } from "react";
import { Brain, Loader2, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightsOverview } from "@/components/intelligence/insights-overview";
import { CompetitorChart } from "@/components/intelligence/competitor-chart";
import { ObjectionPatterns } from "@/components/intelligence/objection-patterns";
import { BuyingSignalsFeed } from "@/components/intelligence/buying-signals-feed";
import { CoachingRecommendations } from "@/components/intelligence/coaching-recommendations";
import { toast } from "sonner";

const TIME_PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

export default function IntelligencePage() {
  const [days, setDays] = useState(30);

  const { data: insights, isLoading: loadingInsights } =
    trpc.intelligence.getInsights.useQuery({ days });

  const { data: buyingAlerts, isLoading: loadingAlerts } =
    trpc.intelligence.getBuyingSignalAlerts.useQuery({ limit: 20 });

  const { data: objectionPatterns, isLoading: loadingObjections } =
    trpc.intelligence.getObjectionPatterns.useQuery({ days });

  const { data: coachingInsights, isLoading: loadingCoaching } =
    trpc.intelligence.getCoachingInsights.useQuery({ days });

  const isAnyLoading =
    loadingInsights || loadingAlerts || loadingObjections || loadingCoaching;

  const handleExport = () => {
    const sections: string[] = [];
    sections.push(`Conversation Intelligence Report — Last ${days} Days`);
    sections.push(`Generated: ${new Date().toLocaleString()}`);
    sections.push("");

    if (insights) {
      sections.push("=== KEY METRICS ===");
      sections.push(`Total Analyzed Calls: ${insights.totalAnalyzedCalls}`);
      sections.push(`Avg Close Probability: ${insights.avgCloseProbability}%`);
      sections.push(`Total Buying Signals: ${insights.totalBuyingSignals}`);
      sections.push(`Total Competitor Mentions: ${insights.totalCompetitorMentions}`);
      sections.push("");

      if (insights.topCompetitors.length > 0) {
        sections.push("=== TOP COMPETITORS ===");
        for (const c of insights.topCompetitors) {
          sections.push(`  ${c.name}: ${c.count} mentions`);
        }
        sections.push("");
      }

      if (insights.topObjectionCategories.length > 0) {
        sections.push("=== TOP OBJECTION CATEGORIES ===");
        for (const o of insights.topObjectionCategories) {
          sections.push(`  ${o.category}: ${o.count} occurrences`);
        }
        sections.push("");
      }
    }

    if (objectionPatterns && objectionPatterns.length > 0) {
      sections.push("=== OBJECTION PATTERNS ===");
      for (const p of objectionPatterns) {
        sections.push(`  Category: ${p.category} (${p.count}x)`);
        if (p.topObjections.length > 0) {
          sections.push(`    Top objections: ${p.topObjections.join("; ")}`);
        }
        if (p.suggestedResponse) {
          sections.push(`    Suggested response: ${p.suggestedResponse}`);
        }
      }
      sections.push("");
    }

    if (buyingAlerts && buyingAlerts.length > 0) {
      sections.push("=== HOT LEADS (BUYING SIGNALS) ===");
      for (const a of buyingAlerts) {
        sections.push(`  ${a.contactName || "Unknown"} (Score: ${a.leadScore}) — ${a.buyingSignals.join(", ")}`);
      }
      sections.push("");
    }

    if (coachingInsights && coachingInsights.length > 0) {
      sections.push("=== COACHING RECOMMENDATIONS ===");
      for (const r of coachingInsights) {
        sections.push(`  ${r.recommendation} (${r.count}x)`);
      }
    }

    const text = sections.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligence-report-${days}d-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Brain className="h-7 w-7" />
            Conversation Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart insights from your call conversations — competitor
            tracking, objection analysis, buying signals, and coaching
            recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isAnyLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Global loading indicator */}
      {isAnyLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing conversation data...
        </div>
      )}

      {/* Key Metrics */}
      <InsightsOverview data={insights} isLoading={loadingInsights} />

      {/* Competitor Chart + Objection Patterns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompetitorChart competitors={insights?.topCompetitors} />
        <ObjectionPatterns patterns={objectionPatterns} />
      </div>

      {/* Buying Signals Feed - full width */}
      <BuyingSignalsFeed alerts={buyingAlerts} />

      {/* Coaching Recommendations */}
      <CoachingRecommendations recommendations={coachingInsights} />
    </div>
  );
}
