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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 10;

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSourceBadgeVariant(
  source: string
): "default" | "secondary" | "destructive" | "outline" {
  const lower = source.toLowerCase();
  if (lower.includes("manual")) return "secondary";
  if (lower.includes("federal") || lower.includes("national")) return "default";
  if (lower.includes("complaint") || lower.includes("opt-out")) return "destructive";
  return "outline";
}

export function DNCList() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.compliance.getDNCList.useQuery({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PhoneOff className="h-4 w-4 text-muted-foreground" />
          Do Not Call List
        </CardTitle>
        <CardDescription>
          Manage phone numbers on the Do Not Call registry
        </CardDescription>
        {/* Search bar */}
        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone numbers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Search
          </Button>
          {search && (
            <Button variant="ghost" size="sm" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !entries.length ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PhoneOff className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm">
                {search
                  ? "No entries match your search"
                  : "No DNC entries found"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: any, index: number) => (
                    <TableRow key={entry.id ?? index}>
                      <TableCell className="font-mono text-sm">
                        {entry.phoneNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getSourceBadgeVariant(entry.source || "")}
                          className="text-xs"
                        >
                          {entry.source || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {entry.reason || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(entry.addedAt)}
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
