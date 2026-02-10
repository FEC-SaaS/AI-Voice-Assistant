"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  Building,
  MoreVertical,
  Search,
  Trash2,
  UserX,
  Users,
  Target,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContactListProps {
  campaignId?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-secondary text-foreground",
  called: "bg-blue-500/10 text-blue-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  dnc: "bg-yellow-500/10 text-yellow-400",
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ContactList({ campaignId }: ContactListProps) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.contacts.list.useQuery({
    campaignId,
    status: status as "pending" | "called" | "completed" | "failed" | "dnc" | undefined,
    search: search || undefined,
    page,
    limit: 25,
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.contacts.list.invalidate();
      setContactToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = trpc.contacts.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted} contacts`);
      utils.contacts.list.invalidate();
      setSelectedContacts(new Set());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = trpc.contacts.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Contact status updated");
      utils.contacts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value === "all" ? undefined : value);
    setPage(1);
  };

  const handleSelectAll = () => {
    if (!data?.contacts) return;
    if (selectedContacts.size === data.contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(data.contacts.map((c) => c.id)));
    }
  };

  const handleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContacts(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedContacts.size === 0) return;
    bulkDeleteMutation.mutate({ ids: Array.from(selectedContacts) });
  };

  const handleMarkAsDNC = (id: string) => {
    updateStatusMutation.mutate({ id, status: "dnc" });
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Search contacts..."
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
        {selectedContacts.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedContacts.size})
          </Button>
        )}
      </div>

      {/* Contact Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : data?.contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 text-muted-foreground/70" />
              <p className="mt-2">No contacts found</p>
              <p className="text-sm">Import contacts to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        data?.contacts &&
                        data.contacts.length > 0 &&
                        selectedContacts.size === data.contacts.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Lead Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                            : "Unknown"}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-muted-foreground/70" />
                        {formatPhoneNumber(contact.phoneNumber)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.company ? (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-muted-foreground/70" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contact as Record<string, unknown>).leadScore != null ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          (contact as Record<string, unknown>).leadScore as number >= 70
                            ? "bg-green-500/10 text-green-400"
                            : (contact as Record<string, unknown>).leadScore as number >= 40
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                        }`}>
                          <Target className="h-3 w-3" />
                          {(contact as Record<string, unknown>).leadScore as number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70 text-xs">—</span>
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
                    <TableCell>
                      <span className="text-muted-foreground">{contact._count.calls}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleMarkAsDNC(contact.id)}
                            disabled={contact.status === "dnc"}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Mark as DNC
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setContactToDelete(contact.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
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
            {data.pagination.total} contacts
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => contactToDelete && deleteMutation.mutate({ id: contactToDelete })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
