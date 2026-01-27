import Link from "next/link";
import { Plus, BookOpen, FileText, Globe, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KnowledgePage() {
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

      {/* Empty State */}
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
    </div>
  );
}
