"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Metric = "calls" | "minutes" | "successRate" | "sentimentBreakdown" | "leadScoreAvg";

interface ReportResultsProps {
  data: {
    rows: Array<Record<string, unknown>>;
    summary: Record<string, unknown>;
  } | undefined;
  isLoading: boolean;
  metrics: Metric[];
  groupByLabel: string;
}

const METRIC_COLUMNS: Record<Metric, { key: string; label: string; suffix?: string }[]> = {
  calls: [{ key: "calls", label: "Calls" }],
  minutes: [{ key: "minutes", label: "Minutes" }],
  successRate: [{ key: "successRate", label: "Success Rate", suffix: "%" }],
  sentimentBreakdown: [
    { key: "positive", label: "Positive" },
    { key: "neutral", label: "Neutral" },
    { key: "negative", label: "Negative" },
  ],
  leadScoreAvg: [{ key: "leadScoreAvg", label: "Avg Lead Score" }],
};

function getColumns(metrics: Metric[]) {
  const cols: { key: string; label: string; suffix?: string }[] = [];
  for (const m of metrics) {
    cols.push(...METRIC_COLUMNS[m]);
  }
  return cols;
}

function formatCell(value: unknown, suffix?: string): string {
  if (value == null) return "-";
  return `${value}${suffix || ""}`;
}

export function ReportResults({ data, isLoading, metrics, groupByLabel }: ReportResultsProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No data matching the selected filters.
      </div>
    );
  }

  const columns = getColumns(metrics);

  const exportCSV = () => {
    const header = [groupByLabel, ...columns.map((c) => c.label)].join(",");
    const rows = data.rows.map((row) =>
      [
        String(row.groupLabel || "").replace(/,/g, ";"),
        ...columns.map((c) => formatCell(row[c.key], c.suffix)),
      ].join(",")
    );
    const summaryRow = [
      "TOTAL",
      ...columns.map((c) => formatCell(data.summary[c.key], c.suffix)),
    ].join(",");

    const csv = [header, ...rows, summaryRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.rows.length} group{data.rows.length !== 1 ? "s" : ""} found
        </p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{groupByLabel}</TableHead>
            {columns.map((col) => (
              <TableHead key={col.key} className="text-right">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">
                {String(row.groupLabel || "")}
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.key} className="text-right">
                  {formatCell(row[col.key], col.suffix)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            {columns.map((col) => (
              <TableCell key={col.key} className="text-right font-bold">
                {formatCell(data.summary[col.key], col.suffix)}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
