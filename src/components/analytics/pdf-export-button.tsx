"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/providers/branding-provider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PDFExportButtonProps {
  startDate: Date;
  endDate: Date;
  days: number;
}

export function PDFExportButton({
  startDate,
  endDate,
  days,
}: PDFExportButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { brandName, brandLogoUrl, brandPrimaryColor } = useBranding();

  // Use cached data from the page queries
  const { data: overview } = trpc.analytics.getOverview.useQuery({
    startDate,
    endDate,
  });
  const { data: callsByDay } = trpc.analytics.getCallsByDay.useQuery({ days });
  const { data: agentPerformance } =
    trpc.analytics.getAgentPerformance.useQuery();
  const { data: sentiment } = trpc.analytics.getSentimentBreakdown.useQuery({
    startDate,
    endDate,
  });

  const handleExport = async () => {
    setGenerating(true);
    try {
      // Dynamic import to keep bundle small — @react-pdf/renderer is heavy
      const [{ pdf }, { AnalyticsReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf-report"),
      ]);

      const dateRange = `${startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const blob = await pdf(
        <AnalyticsReport
          brandName={brandName}
          brandLogoUrl={brandLogoUrl}
          primaryColor={brandPrimaryColor || "#1e293b"}
          dateRange={dateRange}
          overview={overview ?? null}
          callsByDay={callsByDay ?? null}
          agentPerformance={agentPerformance ?? null}
          sentimentBreakdown={sentiment ?? null}
        />
      ).toBlob();

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `${brandName.replace(/\s+/g, "-")}-analytics-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF report downloaded");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={generating}>
      {generating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
}
