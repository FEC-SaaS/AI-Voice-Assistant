"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus, BookOpen, FileText, Globe, PenLine, Loader2,
  MoreVertical, Trash2, Edit, ToggleLeft, ToggleRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  url: Globe,
  manual: PenLine,
};

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF Document",
  docx: "Word Document",
  url: "Web URL",
  manual: "Manual Entry",
};

export default function KnowledgePage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: documents, isLoading } = trpc.knowledge.list.useQuery({});
  const utils = trpc.useUtils();

  const deleteMutation = trpc.knowledge.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.knowledge.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.knowledge.update.useMutation({
    onSuccess: () => {
      toast.success("Document updated");
      utils.knowledge.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateMutation.mutate({
      id,
      data: { isActive: !currentActive },
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-500">
            Train your agents with your business information
          </p>
        </div>
        <Link href="/dashboard/knowledge/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Knowledge
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!documents || documents.length === 0) && (
        <>
          <div className="rounded-lg border bg-white">
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No knowledge documents yet
              </h3>
              <p className="mt-2 text-gray-500">
                Add documents, URLs, or Q&A pairs to train your agents.
              </p>
            </div>
          </div>

          {/* Add Options */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/knowledge/new?type=upload" className="group">
              <div className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md">
                <FileText className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">Upload Documents</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload PDFs, Word docs, or text files
                </p>
              </div>
            </Link>

            <Link href="/dashboard/knowledge/new?type=url" className="group">
              <div className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md">
                <Globe className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">Import from URL</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Scrape content from your website or FAQ pages
                </p>
              </div>
            </Link>

            <Link href="/dashboard/knowledge/new?type=manual" className="group">
              <div className="rounded-lg border bg-white p-6 transition-shadow hover:shadow-md">
                <PenLine className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">Add Q&A Manually</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create custom question and answer pairs
                </p>
              </div>
            </Link>
          </div>
        </>
      )}

      {/* Documents List */}
      {!isLoading && documents && documents.length > 0 && (
        <div className="space-y-4">
          {/* Quick Add Options */}
          <div className="flex gap-2">
            <Link href="/dashboard/knowledge/new?type=upload">
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </Link>
            <Link href="/dashboard/knowledge/new?type=url">
              <Button variant="outline" size="sm">
                <Globe className="mr-2 h-4 w-4" />
                URL
              </Button>
            </Link>
            <Link href="/dashboard/knowledge/new?type=manual">
              <Button variant="outline" size="sm">
                <PenLine className="mr-2 h-4 w-4" />
                Manual
              </Button>
            </Link>
          </div>

          {/* Documents Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const Icon = TYPE_ICONS[doc.type] || FileText;

              return (
                <Card key={doc.id} className={!doc.isActive ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {TYPE_LABELS[doc.type] || doc.type}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant={doc.isActive ? "default" : "secondary"}>
                              {doc.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {doc.sourceUrl && (
                              <a
                                href={doc.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate max-w-[150px]"
                              >
                                {doc.sourceUrl}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/knowledge/${doc.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(doc.id, doc.isActive)}
                          >
                            {doc.isActive ? (
                              <>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(doc.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {doc.content && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                        {doc.content.substring(0, 150)}
                        {doc.content.length > 150 ? "..." : ""}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Added {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this knowledge document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
