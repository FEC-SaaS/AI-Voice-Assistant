"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExportButtonProps {
  startDate?: Date;
  endDate?: Date;
}

export function ExportButton({ startDate, endDate }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportMutation = trpc.analytics.exportData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
      setExporting(false);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
      setExporting(false);
    },
  });

  const handleExport = (type: "calls" | "agents" | "campaigns") => {
    setExporting(true);
    exportMutation.mutate({ type, startDate, endDate });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("calls")}>
          Export Calls
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("agents")}>
          Export Agents
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("campaigns")}>
          Export Campaigns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
