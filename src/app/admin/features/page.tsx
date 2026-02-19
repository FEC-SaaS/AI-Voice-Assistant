"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { FeatureMatrix } from "@/components/admin/feature-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function AdminFeaturesPage() {
  const { data: adoption } = trpc.admin.features.getAdoptionMatrix.useQuery();
  const { data: byPlan } = trpc.admin.features.getAdoptionByPlan.useQuery();
  const { data: totals } = trpc.admin.features.getMostUsedFeatures.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feature Usage</h1>
        <p className="text-muted-foreground text-sm">Adoption rates across all organizations</p>
      </div>

      {/* Volume KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Agents" value={(totals?.agents ?? 0).toLocaleString()} />
        <StatCard label="Total Calls" value={(totals?.calls ?? 0).toLocaleString()} />
        <StatCard label="Total Campaigns" value={(totals?.campaigns ?? 0).toLocaleString()} />
        <StatCard label="Total Contacts" value={(totals?.contacts ?? 0).toLocaleString()} />
        <StatCard label="Total Appointments" value={(totals?.appointments ?? 0).toLocaleString()} />
        <StatCard label="Knowledge Docs" value={(totals?.knowledgeDocs ?? 0).toLocaleString()} />
      </div>

      {/* Adoption % Cards */}
      <Card>
        <CardHeader><CardTitle className="text-base">Feature Adoption (% of orgs using)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(adoption ?? []).map((feat) => (
            <div key={feat.feature} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{feat.feature}</span>
                <span className="text-muted-foreground">{feat.orgs} orgs · {feat.pct}%</span>
              </div>
              <Progress value={feat.pct} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature × Plan heatmap */}
      {byPlan && byPlan.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Feature Adoption by Plan Tier</CardTitle></CardHeader>
          <CardContent>
            <FeatureMatrix data={byPlan} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
