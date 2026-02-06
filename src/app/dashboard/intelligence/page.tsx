"use client";

import { Brain, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { InsightsOverview } from "@/components/intelligence/insights-overview";
import { CompetitorChart } from "@/components/intelligence/competitor-chart";
import { ObjectionPatterns } from "@/components/intelligence/objection-patterns";
import { BuyingSignalsFeed } from "@/components/intelligence/buying-signals-feed";
import { CoachingRecommendations } from "@/components/intelligence/coaching-recommendations";

export default function IntelligencePage() {
  const { data: insights, isLoading: loadingInsights } =
    trpc.intelligence.getInsights.useQuery({ days: 30 });

  const { data: buyingAlerts, isLoading: loadingAlerts } =
    trpc.intelligence.getBuyingSignalAlerts.useQuery({ limit: 10 });

  const { data: objectionPatterns, isLoading: loadingObjections } =
    trpc.intelligence.getObjectionPatterns.useQuery({ days: 30 });

  const { data: coachingInsights, isLoading: loadingCoaching } =
    trpc.intelligence.getCoachingInsights.useQuery({ days: 30 });

  const isAnyLoading =
    loadingInsights || loadingAlerts || loadingObjections || loadingCoaching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Brain className="h-7 w-7" />
          Conversation Intelligence
        </h1>
        <p className="text-gray-500 mt-1">
          AI-powered insights from your call conversations — competitor
          tracking, objection analysis, buying signals, and coaching
          recommendations.
        </p>
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
