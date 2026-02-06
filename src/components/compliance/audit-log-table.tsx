"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 10;

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "DNC_CHECK", label: "DNC Check" },
  { value: "DNC_ADD", label: "DNC Add" },
  { value: "DNC_REMOVE", label: "DNC Remove" },
  { value: "CONSENT_UPDATE", label: "Consent Update" },
  { value: "CAMPAIGN_START", label: "Campaign Start" },
  { value: "CAMPAIGN_PAUSE", label: "Campaign Pause" },
  { value: "CALL_INITIATED", label: "Call Initiated" },
];

const ENTITY_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "CONTACT", label: "Contact" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "AGENT", label: "Agent" },
  { value: "CALL", label: "Call" },
  { value: "DNC_ENTRY", label: "DNC Entry" },
  { value: "CONSENT", label: "Consent" },
];

function getActionBadgeVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("DELETE") || action.includes("REMOVE")) return "destructive";
  if (action.includes("CREATE") || action.includes("ADD")) return "default";
  if (action.includes("UPDATE") || action.includes("CONSENT")) return "secondary";
  return "outline";
}

function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateDetails(details: unknown, maxLen: number = 60): string {
  if (!details) return "-";
  const str = typeof details === "string" ? details : JSON.stringify(details);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

interface AuditLogTableProps {
  headerExtra?: React.ReactNode;
}

export function AuditLogTable({ headerExtra }: AuditLogTableProps) {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data, isLoading } = trpc.compliance.getAuditLogs.useQuery({
    action: actionFilter === "all" ? undefined : actionFilter,
    entityType: entityFilter === "all" ? undefined : entityFilter,
    page,
    limit: PAGE_SIZE,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(1);
  }

  function handleEntityChange(value: string) {
    setEntityFilter(value);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Audit Logs
            </CardTitle>
            <CardDescription className="mt-1">
              Complete audit trail of all compliance-related activities
            </CardDescription>
          </div>
          {headerExtra && <div>{headerExtra}</div>}
        </div>
        {/* Filters */}
        <div className="flex items-center gap-3 pt-2">
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={handleEntityChange}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !logs.length ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm">No audit logs found</p>
              <p className="text-xs">Try adjusting the filters</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any, index: number) => (
                    <TableRow key={log.id ?? index}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getActionBadgeVariant(log.action)}
                          className="text-xs"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.entityType || "-"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-xs font-mono text-muted-foreground">
                        {log.entityId || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.userId || "-"}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] text-xs text-muted-foreground"
                        title={
                          typeof log.details === "string"
                            ? log.details
                            : JSON.stringify(log.details)
                        }
                      >
                        {truncateDetails(log.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
                {data?.total != null && (
                  <span className="ml-1">
                    ({data.total} total entries)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
