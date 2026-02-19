"use client";

import { cn } from "@/lib/utils";

interface CohortRow {
  cohort: string;
  size: number;
  m1: number;
  m2: number;
  m3: number;
}

interface CohortTableProps {
  data: CohortRow[];
}

function heatColor(pct: number) {
  if (pct >= 70) return "bg-green-500 text-white";
  if (pct >= 50) return "bg-green-300 text-green-900";
  if (pct >= 30) return "bg-yellow-200 text-yellow-900";
  if (pct >= 10) return "bg-orange-200 text-orange-900";
  return "bg-red-100 text-red-800";
}

export function CohortTable({ data }: CohortTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Cohort</th>
            <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Size</th>
            <th className="py-2 pr-2 text-center font-medium text-muted-foreground">Month 1</th>
            <th className="py-2 pr-2 text-center font-medium text-muted-foreground">Month 2</th>
            <th className="py-2 text-center font-medium text-muted-foreground">Month 3</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.cohort} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{row.cohort}</td>
              <td className="py-2 pr-4 text-right text-muted-foreground">{row.size}</td>
              {[row.m1, row.m2, row.m3].map((pct, i) => (
                <td key={i} className="py-2 pr-2">
                  <div className={cn(
                    "mx-auto w-12 rounded px-1 py-0.5 text-center text-xs font-medium",
                    row.size === 0 ? "bg-muted text-muted-foreground" : heatColor(pct)
                  )}>
                    {row.size === 0 ? "—" : `${pct}%`}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
