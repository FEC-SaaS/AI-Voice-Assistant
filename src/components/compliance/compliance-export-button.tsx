"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ComplianceExportButton() {
  const exportMutation = trpc.compliance.exportAuditLogs.useMutation({
    onSuccess(data) {
      if (!data.csv) {
        toast.info("No audit logs to export for the selected period.");
        return;
      }

      // Create a Blob from the CSV string and trigger download
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully.");
    },
    onError(error) {
      toast.error(error.message || "Failed to export audit logs.");
    },
  });

  function handleExport() {
    exportMutation.mutate({});
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
