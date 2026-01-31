"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Globe, PenLine, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewKnowledgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "manual";

  const [activeTab, setActiveTab] = useState(initialType);

  // Manual Q&A state
  const [manualName, setManualName] = useState("");
  const [manualContent, setManualContent] = useState("");

  // URL state
  const [urlName, setUrlName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Upload state (placeholder - full implementation requires file storage)
  const [uploadName, setUploadName] = useState("");

  const createMutation = trpc.knowledge.create.useMutation({
    onSuccess: () => {
      toast.success("Knowledge document created successfully");
      router.push("/dashboard/knowledge");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      toast.error("Please enter a name for this knowledge entry");
      return;
    }
    if (!manualContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    createMutation.mutate({
      name: manualName,
      type: "manual",
      content: manualContent,
    });
  };

  const handleUrlSubmit = () => {
    if (!urlName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!sourceUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(sourceUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    createMutation.mutate({
      name: urlName,
      type: "url",
      sourceUrl: sourceUrl,
      content: `Content from: ${sourceUrl}\n\n(URL scraping will be implemented in a future update. For now, please add the content manually after creating this entry.)`,
    });
  };

  const handleUploadSubmit = () => {
    toast.info("File upload requires cloud storage integration (R2/S3). For now, please use URL or Manual entry.");
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Knowledge</h1>
          <p className="text-gray-500">Train your AI agents with your business information</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Manual Q&A
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            From URL
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload File
          </TabsTrigger>
        </TabsList>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Add Q&A Manually</CardTitle>
              <CardDescription>
                Create custom question and answer pairs or add text content for your agents to learn from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualName">Name</Label>
                <Input
                  id="manualName"
                  placeholder="e.g., Business Hours FAQ"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualContent">Content</Label>
                <Textarea
                  id="manualContent"
                  placeholder="Enter your Q&A pairs or information here...

Example format:
Q: What are your business hours?
A: We are open Monday through Friday, 9 AM to 5 PM EST.

Q: How do I contact support?
A: You can reach our support team at support@example.com or call 1-800-EXAMPLE."
                  rows={12}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Tip: Use Q: and A: format for clear question/answer pairs, or just add plain text.
                </p>
              </div>
              <Button
                onClick={handleManualSubmit}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  "Add Knowledge"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL Tab */}
        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle>Import from URL</CardTitle>
              <CardDescription>
                Add a URL to your website, FAQ page, or any public webpage to use as knowledge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urlName">Name</Label>
                <Input
                  id="urlName"
                  placeholder="e.g., Company FAQ Page"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">URL</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://example.com/faq"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Enter the full URL including https://
                </p>
              </div>
              <Button
                onClick={handleUrlSubmit}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                ) : (
                  "Add URL"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload PDF, Word documents, or text files for your agents to learn from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="uploadName">Document Name</Label>
                <Input
                  id="uploadName"
                  placeholder="e.g., Product Manual"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
              </div>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop a file, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supported: PDF, DOCX, TXT (max 10MB)
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleUploadSubmit}
                >
                  Select File
                </Button>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Coming Soon:</strong> File upload requires cloud storage integration.
                  For now, please use the Manual or URL options, or paste your document content manually.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
