"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";

export default function AdminFeedbackPage() {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const { data: nps } = trpc.admin.feedback.getNPSScore.useQuery();
  const { data: dist } = trpc.admin.feedback.getScoreDistribution.useQuery();
  const { data: list } = trpc.admin.feedback.list.useQuery({
    page,
    pageSize: 20,
    type: tab !== "all" ? tab : undefined,
  });

  type FeedbackRow = {
    id: string;
    type: string;
    score: number | null;
    message: string | null;
    status: string;
    organizationId: string | null;
    createdAt: Date;
  };

  const columns: Column<FeedbackRow>[] = [
    { key: "type", header: "Type", render: (r) => <Badge variant="outline">{r.type}</Badge> },
    { key: "score", header: "Score", render: (r) => r.score !== null ? r.score : "—" },
    { key: "message", header: "Message", render: (r) => <span className="text-sm line-clamp-2">{r.message || "—"}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant={r.status === "new" ? "secondary" : "outline"}>{r.status}</Badge> },
    { key: "createdAt", header: "Date", render: (r) => format(new Date(r.createdAt), "MMM d, yyyy") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support & Feedback</h1>
        <p className="text-muted-foreground text-sm">NPS scores and user feedback</p>
      </div>

      {/* NPS KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="NPS Score" value={nps?.score !== null && nps?.score !== undefined ? nps.score : "—"} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Promoters (9-10)" value={nps?.promoters ?? 0} icon={<ThumbsUp className="h-4 w-4" />} />
        <StatCard label="Passives (7-8)" value={nps?.passives ?? 0} />
        <StatCard label="Detractors (0-6)" value={nps?.detractors ?? 0} trend="down" />
      </div>

      {/* Score Distribution */}
      {dist && dist.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">NPS Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dist} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Feedback Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Feedback ({list?.total ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="nps">NPS</TabsTrigger>
              <TabsTrigger value="feature_request">Feature Requests</TabsTrigger>
              <TabsTrigger value="bug_report">Bug Reports</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              <DataTable
                columns={columns}
                data={(list?.items ?? []) as FeedbackRow[]}
                getRowKey={(r) => r.id}
                page={page}
                pages={list?.pages ?? 1}
                onPageChange={setPage}
                emptyMessage="No feedback items."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
