"use client";

import { Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PipelineOverview } from "@/components/leads/pipeline-overview";
import { LeadList } from "@/components/leads/lead-list";

export default function LeadsPage() {
  const { data: pipelineData, isLoading: pipelineLoading } =
    trpc.contacts.getLeadPipeline.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
        </div>
        <p className="mt-1 text-gray-500">
          AI-powered lead scoring and pipeline management
        </p>
      </div>

      {/* Pipeline Overview */}
      <PipelineOverview data={pipelineData} isLoading={pipelineLoading} />

      {/* Lead List */}
      <LeadList />
    </div>
  );
}
