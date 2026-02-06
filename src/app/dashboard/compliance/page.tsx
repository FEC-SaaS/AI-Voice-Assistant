"use client";

import { Shield, PhoneOff, FileCheck, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ComplianceScore } from "@/components/compliance/compliance-score";
import { ScoreBreakdown } from "@/components/compliance/score-breakdown";
import { DncViolations } from "@/components/compliance/dnc-violations";
import { ConsentByState } from "@/components/compliance/consent-by-state";
import { DNCList } from "@/components/compliance/dnc-list";
import { AuditLogTable } from "@/components/compliance/audit-log-table";
import { ComplianceExportButton } from "@/components/compliance/compliance-export-button";

export default function CompliancePage() {
  // Fetch compliance data
  const { data: overview, isLoading: loadingOverview } =
    trpc.compliance.getOverview.useQuery();

  const { data: scoreData, isLoading: loadingScore } =
    trpc.compliance.getComplianceScore.useQuery();

  const { data: violations, isLoading: loadingViolations } =
    trpc.compliance.getViolationAlerts.useQuery();

  const { data: consentData, isLoading: loadingConsent } =
    trpc.compliance.getConsentByState.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Shield className="h-6 w-6" />
          Compliance Dashboard
        </h1>
        <p className="text-gray-500">
          Monitor regulatory compliance, DNC lists, and audit trails
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DNC Entries</CardTitle>
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.totalDncEntries?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.activeConsents?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Opt-Outs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.recentOptOuts?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">
                {overview?.complianceScore ?? 0}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / 100
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Compliance Score Gauge + Score Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ComplianceScore
            score={scoreData?.totalScore}
            isLoading={loadingScore}
          />
        </div>
        <div className="lg:col-span-2">
          <ScoreBreakdown
            breakdown={scoreData?.breakdown}
            isLoading={loadingScore}
          />
        </div>
      </div>

      {/* Row 2: Violations + Consent by State */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DncViolations alerts={violations} isLoading={loadingViolations} />
        <ConsentByState data={consentData} isLoading={loadingConsent} />
      </div>

      {/* Full width: DNC List */}
      <DNCList />

      {/* Full width: Audit Log Table with Export Button */}
      <AuditLogTable headerExtra={<ComplianceExportButton />} />
    </div>
  );
}
