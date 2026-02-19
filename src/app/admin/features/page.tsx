"use client";

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { FeatureMatrix } from "@/components/admin/feature-matrix";
import {
  Bot,
  Phone,
  Megaphone,
  UserCheck,
  BookOpen,
  Plug,
  Key,
  Calendar,
  Users,
} from "lucide-react";

function DarkCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: "1px solid rgba(99,102,241,0.1)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "rgba(241,245,249,0.7)" }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: "rgba(241,245,249,0.3)" }}
    >
      {children}
    </h2>
  );
}

function AdoptionBar({ feature, orgs, pct }: { feature: string; orgs: number; pct: number }) {
  const barColor =
    pct >= 60 ? "#10b981" : pct >= 30 ? "#6366f1" : pct >= 10 ? "#f59e0b" : "#475569";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: "rgba(241,245,249,0.8)" }}>
          {feature}
        </span>
        <span className="text-xs font-mono" style={{ color: "rgba(241,245,249,0.4)" }}>
          {orgs} orgs · {pct}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
            boxShadow: pct > 0 ? `0 0 8px ${barColor}60` : "none",
          }}
        />
      </div>
    </div>
  );
}


export default function AdminFeaturesPage() {
  const { data: adoption, isLoading: adoptionLoading } =
    trpc.admin.features.getAdoptionMatrix.useQuery();
  const { data: byPlan } = trpc.admin.features.getAdoptionByPlan.useQuery();
  const { data: totals } = trpc.admin.features.getMostUsedFeatures.useQuery();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-1 w-6 rounded-full"
            style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
          />
          <SectionTitle>Product Analytics</SectionTitle>
        </div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Feature Usage
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
          Adoption rates and usage volumes across all organizations.
        </p>
      </div>

      {/* Volume KPIs */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #06b6d4, #22d3ee)" }}
          />
          <SectionTitle>Platform Totals</SectionTitle>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Agents"
            value={totals?.agents ?? 0}
            icon={<Bot />}
            accentColor="#6366f1"
          />
          <StatCard
            label="Total Calls"
            value={totals?.calls ?? 0}
            icon={<Phone />}
            accentColor="#06b6d4"
          />
          <StatCard
            label="Cold-Call Campaigns"
            value={totals?.campaigns ?? 0}
            icon={<Megaphone />}
            accentColor="#3b82f6"
          />
          <StatCard
            label="Interview Campaigns"
            value={totals?.interviewCampaigns ?? 0}
            icon={<UserCheck />}
            accentColor="#8b5cf6"
          />
          <StatCard
            label="Contacts"
            value={totals?.contacts ?? 0}
            icon={<Users />}
            accentColor="#10b981"
          />
          <StatCard
            label="Appointments"
            value={totals?.appointments ?? 0}
            icon={<Calendar />}
            accentColor="#f59e0b"
          />
          <StatCard
            label="Knowledge Docs"
            value={totals?.knowledgeDocs ?? 0}
            icon={<BookOpen />}
            accentColor="#ec4899"
          />
          <StatCard
            label="Active Integrations"
            value={totals?.integrations ?? 0}
            icon={<Plug />}
            accentColor="#14b8a6"
          />
          <StatCard
            label="Phone Numbers"
            value={totals?.phoneNumbers ?? 0}
            icon={<Phone />}
            accentColor="#6366f1"
          />
        </div>
      </div>

      {/* Adoption % Bars */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}
          />
          <SectionTitle>Org Adoption Rates</SectionTitle>
        </div>
        <DarkCard title="Feature Adoption (% of organizations using)">
          {adoptionLoading ? (
            <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
              Loading…
            </p>
          ) : (
            <div className="space-y-4">
              {(adoption ?? []).map((feat) => (
                <AdoptionBar
                  key={feat.feature}
                  feature={feat.feature}
                  orgs={feat.orgs}
                  pct={feat.pct}
                />
              ))}
            </div>
          )}
        </DarkCard>
      </div>

      {/* Feature × Plan heatmap */}
      {byPlan && byPlan.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-1 w-4 rounded-full"
              style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
            />
            <SectionTitle>Adoption by Plan Tier</SectionTitle>
          </div>
          <DarkCard>
            <FeatureMatrix data={byPlan} />
          </DarkCard>
        </div>
      )}
    </div>
  );
}
