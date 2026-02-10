"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Phone,
  Building,
  Users,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatPhoneNumber } from "@/lib/utils";
import { LeadScoreBadge } from "./lead-score-badge";
import { NextActionCard } from "./next-action-card";

type SortField = "leadScore" | "name" | "company";
type SortDirection = "asc" | "desc";

const statusColors: Record<string, string> = {
  pending: "bg-secondary text-foreground",
  called: "bg-blue-500/10 text-blue-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  dnc: "bg-yellow-500/10 text-yellow-400",
};

const sentimentColors: Record<string, string> = {
  positive: "text-green-400",
  neutral: "text-muted-foreground",
  negative: "text-red-400",
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function LeadList() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("leadScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data, isLoading } = trpc.contacts.list.useQuery({
    status: status as
      | "pending"
      | "called"
      | "completed"
      | "failed"
      | "dnc"
      | undefined,
    search: search || undefined,
    page,
    limit: 20,
  });

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value === "all" ? undefined : value);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="ml-1 h-3 w-3 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  // Client-side sorting of the returned contacts
  const sortedContacts = data?.contacts
    ? [...data.contacts].sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;

        if (sortField === "leadScore") {
          const scoreA = a.leadScore ?? -1;
          const scoreB = b.leadScore ?? -1;
          return (scoreA - scoreB) * dir;
        }
        if (sortField === "name") {
          const nameA =
            `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          const nameB =
            `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB) * dir;
        }
        if (sortField === "company") {
          const compA = (a.company || "").toLowerCase();
          const compB = (b.company || "").toLowerCase();
          return compA.localeCompare(compB) * dir;
        }
        return 0;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="called">Called</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="dnc">DNC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-secondary" />
                  <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-36 animate-pulse rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 text-muted-foreground/70" />
              <p className="mt-2">No leads found</p>
              <p className="text-sm">
                {search || status
                  ? "Try adjusting your filters"
                  : "Import contacts and run campaigns to generate lead scores"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center font-medium"
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("company")}
                      className="flex items-center font-medium"
                    >
                      Company
                      <SortIcon field="company" />
                    </button>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("leadScore")}
                      className="flex items-center font-medium"
                    >
                      Lead Score
                      <SortIcon field="leadScore" />
                    </button>
                  </TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContacts.map((contact) => {
                  const contactName =
                    contact.firstName || contact.lastName
                      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                      : "Unknown";

                  return (
                    <TableRow key={contact.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="font-medium hover:underline"
                        >
                          {contactName}
                        </Link>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground">
                            {contact.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-muted-foreground/70" />
                            <span className="text-sm">{contact.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span className="text-sm">
                            {formatPhoneNumber(contact.phoneNumber)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LeadScoreBadge score={contact.leadScore} />
                      </TableCell>
                      <TableCell>
                        {contact.sentiment ? (
                          <span
                            className={`text-sm font-medium capitalize ${
                              sentimentColors[contact.sentiment] ||
                              "text-muted-foreground"
                            }`}
                          >
                            {contact.sentiment}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/70">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {contact.nextBestAction ? (
                          <NextActionCard
                            action={contact.nextBestAction}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground/70">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[contact.status] || statusColors.pending
                          }`}
                        >
                          {contact.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * data.pagination.limit + 1} to{" "}
            {Math.min(page * data.pagination.limit, data.pagination.total)} of{" "}
            {data.pagination.total} leads
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
