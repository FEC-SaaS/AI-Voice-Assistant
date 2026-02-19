"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{content}</TooltipContent>
    </Tooltip>
  );
}
