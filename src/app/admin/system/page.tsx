"use client";

import { trpc } from "@/lib/trpc";
import { SystemHealth } from "@/components/admin/system-health";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Server,
  AlertTriangle,
  Zap,
  Phone,
  CheckCircle2,
  XCircle,
  Database,
  Globe,
  TrendingUp,
  Users,
  PhoneCall,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Shared layout components ──────────────────────────────────────────────

function DarkCard({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: React.ReactNode;
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
        <div className="mb-4 flex items-center gap-2">
          {icon && (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <span className="text-indigo-400 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
            </div>
          )}
          <h3 className="text-sm font-semibold" style={{ color: "rgba(241,245,249,0.7)" }}>
            {title}
          </h3>
        </div>
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

const tooltipStyle = {
  contentStyle: {
    background: "#0c0c1e",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "12px",
  },
  cursor: { fill: "rgba(99,102,241,0.06)" },
};

// ─── Usage card ────────────────────────────────────────────────────────────

function UsageCard({
  name,
  icon,
  configured,
  connected,
  accountName,
  balance,
  unit = "$",
  threshold,
  extra,
  isLoading,
}: {
  name: string;
  icon: React.ReactNode;
  configured: boolean;
  connected: boolean;
  accountName?: string | null;
  balance: string | number | null;
  unit?: string;
  threshold: string | number;
  extra?: React.ReactNode;
  isLoading: boolean;
}) {
  const balanceNum = typeof balance === "string" ? parseFloat(balance) : balance;
  const thresholdNum = typeof threshold === "string" ? parseFloat(threshold) : threshold;
  const isLow = balanceNum !== null && balanceNum < thresholdNum;
  const accentColor = !configured
    ? "#475569"
    : connected && !isLow
    ? "#10b981"
    : isLow
    ? "#f59e0b"
    : "#ef4444";

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #0c0c1e 0%, #10102a 100%)",
        border: `1px solid ${accentColor}25`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
            >
              <span style={{ color: accentColor }} className="[&>svg]:h-4 [&>svg]:w-4">
                {icon}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                {name}
              </span>
              {accountName && (
                <div className="text-[10px]" style={{ color: "rgba(241,245,249,0.35)" }}>
                  {accountName}
                </div>
              )}
            </div>
          </div>
          {configured ? (
            connected ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )
          ) : (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "rgba(71,85,105,0.2)",
                color: "rgba(241,245,249,0.3)",
                border: "1px solid rgba(71,85,105,0.3)",
              }}
            >
              Not configured
            </span>
          )}
        </div>

        {!configured ? (
          <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
            Add API credentials to see balance.
          </p>
        ) : isLoading ? (
          <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
            Fetching…
          </p>
        ) : balance !== null ? (
          <div>
            <div
              className="text-3xl font-bold"
              style={{
                background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {unit === "$"
                ? `$${balanceNum?.toFixed(2)}`
                : `${balance} ${unit}`}
            </div>
            {isLow && (
              <div
                className="mt-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                  width: "fit-content",
                }}
              >
                <AlertTriangle className="h-3 w-3" />
                Low balance — below {unit === "$" ? `$${threshold}` : `${threshold} ${unit}`}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "rgba(241,245,249,0.4)" }}>
            {connected
              ? "Balance not exposed by API — check dashboard"
              : "Could not connect to API"}
          </p>
        )}

        {extra && <div className="mt-3">{extra}</div>}
      </div>
    </div>
  );
}

// ─── Mini stat pill ────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.1)" }}
    >
      <span className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

const COUNTRY_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminSystemPage() {
  const {
    data: health,
    isLoading: healthLoading,
    refetch,
    isFetching,
  } = trpc.admin.system.getHealthChecks.useQuery(undefined, { refetchInterval: false });

  const { data: dbStats, isLoading: dbLoading } = trpc.admin.system.getDBStats.useQuery();
  const { data: usageStats, isLoading: usageLoading } =
    trpc.admin.system.getUsageStats.useQuery();
  const { data: phoneStats } = trpc.admin.system.getPhoneStats.useQuery();
  const { data: demographics } = trpc.admin.system.getOrgDemographics.useQuery();

  type TableRow = { table: string; rows: number };
  const tableColumns: Column<TableRow>[] = [
    {
      key: "table",
      header: "Table",
      render: (r) => (
        <span className="font-mono text-xs" style={{ color: "#a5b4fc" }}>
          {r.table}
        </span>
      ),
    },
    {
      key: "rows",
      header: "Row Count",
      render: (r) => (
        <span className="font-mono text-sm font-semibold" style={{ color: "#f1f5f9" }}>
          {r.rows.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-1 w-6 rounded-full"
            style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
          />
          <SectionTitle>Infrastructure</SectionTitle>
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
          System & Infrastructure
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
          Service health, usage billing, phone numbers, and org demographics.
        </p>
      </div>

      {/* External Service Health */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-4 rounded-full"
              style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}
            />
            <SectionTitle>Service Status</SectionTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 rounded-xl px-3 text-xs"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.12)",
              color: "#818cf8",
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <DarkCard icon={<Server />} title="External Services">
          <SystemHealth services={health?.services ?? []} isLoading={healthLoading} />
          {health?.checkedAt && (
            <p className="mt-4 text-[10px]" style={{ color: "rgba(241,245,249,0.2)" }}>
              Last checked: {format(new Date(health.checkedAt), "MMM d, yyyy HH:mm:ss")}
            </p>
          )}
        </DarkCard>
      </div>

      {/* Usage & Billing */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
          />
          <SectionTitle>Usage & Billing Alerts</SectionTitle>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <UsageCard
            name="Vapi AI Credits"
            icon={<Zap />}
            configured={usageStats?.vapi.configured ?? false}
            connected={usageStats?.vapi.connected ?? false}
            accountName={usageStats?.vapi.accountName}
            balance={usageStats?.vapi.balance ?? null}
            unit="$"
            threshold={usageStats?.vapi.lowBalanceThreshold ?? 10}
            isLoading={usageLoading}
          />
          <UsageCard
            name="Twilio Balance"
            icon={<Phone />}
            configured={usageStats?.twilio.configured ?? false}
            connected={usageStats?.twilio.connected ?? false}
            balance={usageStats?.twilio.balance ?? null}
            unit="$"
            threshold={usageStats?.twilio.lowBalanceThreshold ?? "10.00"}
            isLoading={usageLoading}
            extra={
              phoneStats ? (
                <div className="space-y-1.5">
                  <MiniStat
                    label="Provisioned (Twilio API)"
                    value={phoneStats.twilioProvisioned ?? "—"}
                  />
                  <MiniStat label="In DB (active)" value={phoneStats.db.active} />
                  <MiniStat label="Caller ID registered" value={phoneStats.db.callerIdRegistered} />
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {/* Phone Number Details */}
      {phoneStats && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-1 w-4 rounded-full"
              style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
            />
            <SectionTitle>Phone Number Details</SectionTitle>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DarkCard icon={<PhoneCall />} title="By Type">
              <div className="space-y-2">
                {phoneStats.db.byType.length === 0 ? (
                  <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
                    No phone numbers yet.
                  </p>
                ) : (
                  phoneStats.db.byType.map((t) => (
                    <MiniStat key={t.type} label={t.type} value={t.count} />
                  ))
                )}
              </div>
            </DarkCard>

            <DarkCard icon={<Globe />} title="By Country">
              {phoneStats.db.byCountry.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
                  No data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={phoneStats.db.byCountry}
                      dataKey="count"
                      nameKey="country"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      label={({ country, percent }) =>
                        `${country} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ stroke: "rgba(241,245,249,0.2)" }}
                    >
                      {phoneStats.db.byCountry.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0c0c1e",
                        border: "1px solid rgba(99,102,241,0.2)",
                        borderRadius: "10px",
                        color: "#f1f5f9",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </DarkCard>
          </div>
        </div>
      )}

      {/* Org Demographics */}
      {demographics && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-1 w-4 rounded-full"
              style={{ background: "linear-gradient(90deg, #ec4899, #f472b6)" }}
            />
            <SectionTitle>Org Demographics</SectionTitle>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* User stats */}
            <DarkCard icon={<Users />} title="Registered Users">
              <div className="space-y-2">
                <MiniStat label="Total users" value={demographics.users.total} />
                <MiniStat label="New (last 30d)" value={demographics.users.newLast30} />
                <MiniStat label="Avg users / org" value={demographics.users.avgPerOrg} />
              </div>
            </DarkCard>

            {/* Referral sources */}
            <DarkCard icon={<TrendingUp />} title="Referral / Acquisition Source">
              {demographics.byReferral.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(241,245,249,0.3)" }}>
                  No referral data yet — add <code className="text-indigo-400">referralSource</code> to signup form.
                </p>
              ) : (
                <div className="space-y-2">
                  {demographics.byReferral.slice(0, 6).map((r) => (
                    <MiniStat key={r.source} label={r.source} value={r.count} />
                  ))}
                </div>
              )}
            </DarkCard>

            {/* Signup trend by month */}
            <DarkCard icon={<BarChart3 />} title="Signups by Month">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={demographics.signupsByMonth}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fill: "rgba(241,245,249,0.3)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "rgba(241,245,249,0.3)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </DarkCard>
          </div>
        </div>
      )}

      {/* DB Row Counts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-full"
            style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }}
          />
          <SectionTitle>Database</SectionTitle>
        </div>
        <DarkCard icon={<Database />} title="Row Counts by Table">
          <DataTable
            columns={tableColumns}
            data={(dbStats?.tables ?? []) as TableRow[]}
            getRowKey={(r) => r.table}
            isLoading={dbLoading}
          />
        </DarkCard>
      </div>
    </div>
  );
}
