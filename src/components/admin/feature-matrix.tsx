"use client";

import { cn } from "@/lib/utils";

interface MatrixRow {
  plan: string;
  feature: string;
  pct: number;
}

interface FeatureMatrixProps {
  data: MatrixRow[];
}

function heatColor(pct: number) {
  if (pct >= 80) return "bg-green-500 text-white";
  if (pct >= 60) return "bg-green-300 text-green-900";
  if (pct >= 40) return "bg-yellow-200 text-yellow-900";
  if (pct >= 20) return "bg-orange-200 text-orange-900";
  return "bg-red-100 text-red-900";
}

const PLAN_LABELS: Record<string, string> = {
  "free-trial": "Free",
  starter: "Starter",
  professional: "Pro",
  enterprise: "Enterprise",
};

export function FeatureMatrix({ data }: FeatureMatrixProps) {
  const plans = Array.from(new Set(data.map((d) => d.plan)));
  const features = Array.from(new Set(data.map((d) => d.feature)));

  // Build lookup
  const lookup: Record<string, Record<string, number>> = {};
  for (const row of data) {
    if (!lookup[row.feature]) lookup[row.feature] = {};
    lookup[row.feature]![row.plan] = row.pct;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Feature</th>
            {plans.map((p) => (
              <th key={p} className="py-2 px-2 text-center font-medium text-muted-foreground">
                {PLAN_LABELS[p] ?? p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{feature}</td>
              {plans.map((plan) => {
                const pct = lookup[feature]?.[plan] ?? 0;
                return (
                  <td key={plan} className="py-2 px-2">
                    <div className={cn(
                      "mx-auto w-14 rounded px-1 py-0.5 text-center text-xs font-medium",
                      heatColor(pct)
                    )}>
                      {pct}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
