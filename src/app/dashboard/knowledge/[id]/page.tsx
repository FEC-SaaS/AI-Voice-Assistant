"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Globe, Loader2, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function EditKnowledgePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [initialized, setInitialized] = useState(false);

  const {
    data: document,
    isLoading,
    error,
  } = trpc.knowledge.get.useQuery({ id }, { enabled: !!id });

  const updateMutation = trpc.knowledge.update.useMutation({
    onSuccess: () => {
      toast.success("Document updated successfully");
      router.push("/dashboard/knowledge");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const scrapeMutation = trpc.knowledge.scrapeUrl.useMutation({
    onSuccess: (data) => {
      setContent(data.content || "");
      toast.success("URL re-scraped successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Initialize form fields when document loads
  useEffect(() => {
    if (document && !initialized) {
      setName(document.name);
      setContent(document.content || "");
      setInitialized(true);
    }
  }, [document, initialized]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    updateMutation.mutate({
      id,
      data: { name, content },
    });
  };

  const handleRescrape = () => {
    scrapeMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/knowledge">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {error?.message || "Document not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/knowledge">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            Edit Knowledge Document
          </h1>
          <p className="text-muted-foreground">
            Last updated{" "}
            {new Date(document.updatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge variant="outline">{document.type.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
          <CardDescription>
            Edit the name and content of this knowledge document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Document name"
            />
          </div>

          {/* Source URL (read-only for URL type) */}
          {document.type === "url" && document.sourceUrl && (
            <div className="space-y-2">
              <Label>Source URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={document.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {document.sourceUrl}
                  </a>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRescrape}
                  disabled={scrapeMutation.isPending}
                >
                  {scrapeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Re-scrape
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click Re-scrape to fetch the latest content from this URL.
              </p>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <span className="text-xs text-muted-foreground">
                {content.length.toLocaleString()} characters
              </span>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Document content..."
              rows={16}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Link href="/dashboard/knowledge">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
