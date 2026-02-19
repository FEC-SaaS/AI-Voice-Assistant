"use client";

import { useState } from "react";
import { Loader2, GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

// ── Side-by-side metric card ─────────────────────────────────────────
function MetricCard({
  label,
  aValue,
  bValue,
  aName,
  bName,
  higherIsBetter = true,
}: {
  label: string;
  aValue: string | number;
  bValue: string | number;
  aName: string;
  bName: string;
  higherIsBetter?: boolean;
}) {
  const aNum = parseFloat(String(aValue));
  const bNum = parseFloat(String(bValue));
  const aWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? aNum > bNum : aNum < bNum);
  const bWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? bNum > aNum : bNum < aNum);

  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`rounded p-2 text-center ${
            aWins
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-secondary"
          }`}
        >
          <p className="text-xs text-muted-foreground truncate">{aName}</p>
          <p className={`text-xl font-bold ${aWins ? "text-green-400" : ""}`}>
            {aValue}
          </p>
        </div>
        <div
          className={`rounded p-2 text-center ${
            bWins
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-secondary"
          }`}
        >
          <p className="text-xs text-muted-foreground truncate">{bName}</p>
          <p className={`text-xl font-bold ${bWins ? "text-green-400" : ""}`}>
            {bValue}
          </p>
        </div>
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

// ── Main component ────────────────────────────────────────────────────
export function ComparisonPanel() {
  const [mode, setMode] = useState<"agents" | "periods">("agents");
  const [agentAId, setAgentAId] = useState("");
  const [agentBId, setAgentBId] = useState("");
  const [periodA, setPeriodA] = useState("30");
  const [periodB, setPeriodB] = useState("7");

  const { data: filterOptions } = trpc.analytics.getReportFilterOptions.useQuery();

  const isReady =
    mode === "agents"
      ? !!agentAId && !!agentBId && agentAId !== agentBId
      : periodA !== periodB;

  const { data, isLoading } = trpc.analytics.getComparisonData.useQuery(
    {
      mode,
      agentAId: mode === "agents" ? agentAId || undefined : undefined,
      agentBId: mode === "agents" ? agentBId || undefined : undefined,
      periodADays: mode === "periods" ? parseInt(periodA) : undefined,
      periodBDays: mode === "periods" ? parseInt(periodB) : undefined,
    },
    { enabled: isReady }
  );

  const a = data?.a;
  const b = data?.b;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Comparison Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "agents" | "periods")}
        >
          <TabsList>
            <TabsTrigger value="agents">Compare Agents</TabsTrigger>
            <TabsTrigger value="periods">Compare Periods</TabsTrigger>
          </TabsList>

          {/* Agent selectors */}
          <TabsContent value="agents" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Agent A</p>
                <Select value={agentAId} onValueChange={setAgentAId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.agents
                      .filter((a) => a.value !== agentBId)
                      .map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Agent B</p>
                <Select value={agentBId} onValueChange={setAgentBId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions?.agents
                      .filter((a) => a.value !== agentAId)
                      .map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Period selectors */}
          <TabsContent value="periods" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Period A</p>
                <Select value={periodA} onValueChange={setPeriodA}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.filter((o) => o.value !== periodB).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Period B</p>
                <Select value={periodB} onValueChange={setPeriodB}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.filter((o) => o.value !== periodA).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Placeholder */}
        {!isReady && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {mode === "agents"
              ? "Select two different agents to compare their all-time performance"
              : "Select two different periods to compare call outcomes"}
          </p>
        )}

        {/* Loading */}
        {isReady && isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Results grid */}
        {isReady && !isLoading && a && b && (
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Total Calls"
              aValue={a.totalCalls}
              bValue={b.totalCalls}
              aName={a.name}
              bName={b.name}
            />
            <MetricCard
              label="Success Rate"
              aValue={`${a.successRate}%`}
              bValue={`${b.successRate}%`}
              aName={a.name}
              bName={b.name}
            />
            <MetricCard
              label="Total Minutes"
              aValue={a.totalMinutes}
              bValue={b.totalMinutes}
              aName={a.name}
              bName={b.name}
            />
            <MetricCard
              label="Positive Sentiment"
              aValue={a.positive}
              bValue={b.positive}
              aName={a.name}
              bName={b.name}
            />
          </div>
        )}

        {/* No data state */}
        {isReady && !isLoading && (!a || !b) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No data available for the selected{" "}
            {mode === "agents" ? "agents" : "periods"}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
