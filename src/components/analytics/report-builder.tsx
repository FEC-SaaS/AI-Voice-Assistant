"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Play,
  Save,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ReportResults } from "./report-results";

type GroupBy = "agent" | "campaign" | "day" | "week" | "month";
type Metric = "calls" | "minutes" | "successRate" | "sentimentBreakdown" | "leadScoreAvg";

interface ReportConfig {
  name: string;
  groupBy: GroupBy;
  metrics: Metric[];
  filters: {
    agentIds: string[];
    campaignIds: string[];
    statuses: string[];
    sentiments: string[];
    startDate: string;
    endDate: string;
  };
}

interface SavedReport {
  id: string;
  name: string;
  config: ReportConfig;
  createdAt: string;
}

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "campaign", label: "Campaign" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "calls", label: "Total Calls" },
  { value: "minutes", label: "Total Minutes" },
  { value: "successRate", label: "Success Rate" },
  { value: "sentimentBreakdown", label: "Sentiment Breakdown" },
  { value: "leadScoreAvg", label: "Avg Lead Score" },
];

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  agent: "Agent",
  campaign: "Campaign",
  day: "Date",
  week: "Week Starting",
  month: "Month",
};

const STORAGE_KEY = "voxforge-saved-reports";

function loadSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedReports(reports: SavedReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between gap-2">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-60 overflow-y-auto" align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={selected.includes(opt.value)}
            onCheckedChange={() => onToggle(opt.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No options available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function defaultConfig(): ReportConfig {
  return {
    name: "",
    groupBy: "agent",
    metrics: ["calls", "minutes", "successRate"],
    filters: {
      agentIds: [],
      campaignIds: [],
      statuses: [],
      sentiments: [],
      startDate: "",
      endDate: "",
    },
  };
}

export function ReportBuilder() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    setSavedReports(loadSavedReports());
  }, []);

  const { data: filterOptions } = trpc.analytics.getReportFilterOptions.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const {
    data: reportData,
    isLoading: reportLoading,
    refetch,
  } = trpc.analytics.runCustomReport.useQuery(
    {
      groupBy: config.groupBy,
      metrics: config.metrics,
      filters: {
        agentIds: config.filters.agentIds.length ? config.filters.agentIds : undefined,
        campaignIds: config.filters.campaignIds.length ? config.filters.campaignIds : undefined,
        statuses: config.filters.statuses.length ? config.filters.statuses : undefined,
        sentiments: config.filters.sentiments.length ? config.filters.sentiments : undefined,
        startDate: config.filters.startDate ? new Date(config.filters.startDate) : undefined,
        endDate: config.filters.endDate ? new Date(config.filters.endDate) : undefined,
      },
    },
    { enabled: hasRun }
  );

  const toggleFilter = useCallback(
    (key: "agentIds" | "campaignIds" | "statuses" | "sentiments", value: string) => {
      setConfig((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          [key]: prev.filters[key].includes(value)
            ? prev.filters[key].filter((v) => v !== value)
            : [...prev.filters[key], value],
        },
      }));
      setHasRun(false);
    },
    []
  );

  const toggleMetric = useCallback((metric: Metric) => {
    setConfig((prev) => {
      const next = prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric];
      return { ...prev, metrics: next.length > 0 ? next : prev.metrics };
    });
    setHasRun(false);
  }, []);

  const runReport = useCallback(() => {
    if (config.metrics.length === 0) return;
    setHasRun(true);
    if (hasRun) {
      refetch();
    }
  }, [config.metrics.length, hasRun, refetch]);

  const saveConfig = useCallback(() => {
    const name = config.name.trim() || `Report ${savedReports.length + 1}`;
    const report: SavedReport = {
      id: Date.now().toString(),
      name,
      config: { ...config, name },
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedReports, report];
    setSavedReports(updated);
    persistSavedReports(updated);
    setConfig((prev) => ({ ...prev, name }));
  }, [config, savedReports]);

  const loadConfig = useCallback((report: SavedReport) => {
    setConfig(report.config);
    setHasRun(false);
  }, []);

  const deleteConfig = useCallback(
    (id: string) => {
      const updated = savedReports.filter((r) => r.id !== id);
      setSavedReports(updated);
      persistSavedReports(updated);
    },
    [savedReports]
  );

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Report Builder
          </span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">
          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Saved Reports</Label>
              <div className="flex flex-wrap gap-2">
                {savedReports.map((report) => (
                  <div key={report.id} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadConfig(report)}
                    >
                      {report.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteConfig(report.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Group By */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Group By</Label>
              <Select
                value={config.groupBy}
                onValueChange={(v) => {
                  setConfig((prev) => ({ ...prev, groupBy: v as GroupBy }));
                  setHasRun(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_BY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={config.filters.startDate}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    filters: { ...prev.filters, startDate: e.target.value },
                  }));
                  setHasRun(false);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                type="date"
                value={config.filters.endDate}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    filters: { ...prev.filters, endDate: e.target.value },
                  }));
                  setHasRun(false);
                }}
              />
            </div>

            {/* Report Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Report Name</Label>
              <Input
                placeholder="My Report"
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Metrics</Label>
            <div className="flex flex-wrap gap-2">
              {METRIC_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={config.metrics.includes(opt.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMetric(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filters</Label>
            <div className="flex flex-wrap gap-2">
              <MultiSelectDropdown
                label="Agents"
                options={filterOptions?.agents || []}
                selected={config.filters.agentIds}
                onToggle={(v) => toggleFilter("agentIds", v)}
              />
              <MultiSelectDropdown
                label="Campaigns"
                options={filterOptions?.campaigns || []}
                selected={config.filters.campaignIds}
                onToggle={(v) => toggleFilter("campaignIds", v)}
              />
              <MultiSelectDropdown
                label="Status"
                options={filterOptions?.statuses || []}
                selected={config.filters.statuses}
                onToggle={(v) => toggleFilter("statuses", v)}
              />
              <MultiSelectDropdown
                label="Sentiment"
                options={filterOptions?.sentiments || []}
                selected={config.filters.sentiments}
                onToggle={(v) => toggleFilter("sentiments", v)}
              />
            </div>
            {/* Active filter badges */}
            {(config.filters.agentIds.length > 0 ||
              config.filters.campaignIds.length > 0 ||
              config.filters.statuses.length > 0 ||
              config.filters.sentiments.length > 0) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {config.filters.agentIds.map((id) => {
                  const agent = filterOptions?.agents.find((a) => a.value === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {agent?.label || id}
                    </Badge>
                  );
                })}
                {config.filters.campaignIds.map((id) => {
                  const campaign = filterOptions?.campaigns.find((c) => c.value === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {campaign?.label || id}
                    </Badge>
                  );
                })}
                {config.filters.statuses.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
                {config.filters.sentiments.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={runReport} disabled={config.metrics.length === 0}>
              <Play className="mr-2 h-4 w-4" />
              Run Report
            </Button>
            <Button variant="outline" onClick={saveConfig}>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>

          {/* Results */}
          {hasRun && (
            <ReportResults
              data={reportData}
              isLoading={reportLoading}
              metrics={config.metrics}
              groupByLabel={GROUP_BY_LABELS[config.groupBy]}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
