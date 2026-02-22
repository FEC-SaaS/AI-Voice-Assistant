"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContactUploadProps {
  campaignId?: string;
  onSuccess?: () => void;
}

interface ParsedContact {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
}

export function ContactUpload({ campaignId, onSuccess }: ContactUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "upload" | "processing" | "preview" | "result"
  >("upload");
  const [extractedContacts, setExtractedContacts] = useState<ParsedContact[]>(
    []
  );
  const [result, setResult] = useState<{
    created: number;
    skippedDuplicate: number;
    skippedDNC: number;
    skippedInvalid: number;
    errors: string[];
  } | null>(null);

  const bulkCreate = trpc.contacts.bulkCreate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      if (data.created > 0) {
        toast.success(`Successfully imported ${data.created} contacts`);
        onSuccess?.();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const extractFromFile = trpc.contacts.extractFromFile.useMutation({
    onSuccess: (data) => {
      if (data.contacts.length === 0) {
        toast.error(
          "No contacts with phone numbers found. Please check the file content."
        );
        setStep("upload");
        return;
      }
      setExtractedContacts(data.contacts);
      setStep("preview");
    },
    onError: (error) => {
      toast.error(`AI extraction failed: ${error.message}`);
      setStep("upload");
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setParseError(null);
      const uploadedFile = acceptedFiles[0];
      if (!uploadedFile) return;

      setFileName(uploadedFile.name);
      const reader = new FileReader();

      reader.onerror = () => {
        setParseError("Failed to read file. Please try again.");
        toast.error("Failed to read file. Please try again.");
      };

      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text?.trim()) {
          toast.error("File appears to be empty");
          return;
        }
        setStep("processing");
        // Cap at 200k chars to stay within OpenAI token limits (~50k tokens)
        extractFromFile.mutate({
          fileContent: text.slice(0, 200000),
          fileName: uploadedFile.name,
        });
      };

      reader.readAsText(uploadedFile);
    },
    [extractFromFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const handleImport = () => {
    bulkCreate.mutate({
      contacts: extractedContacts,
      campaignId,
      skipDuplicates: true,
      skipDNC: true,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFileName("");
    setExtractedContacts([]);
    setStep("upload");
    setResult(null);
    setParseError(null);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Import Contacts
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Contact Import
            </DialogTitle>
            <DialogDescription>
              Upload a file in any format — CSV, TSV, JSON, vCard, plain text,
              or XLS. AI automatically extracts your contacts regardless of
              column names or layout.
            </DialogDescription>
          </DialogHeader>

          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : parseError
                    ? "border-red-300 bg-red-500/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload
                  className={`mx-auto h-12 w-12 ${
                    parseError ? "text-red-400" : "text-muted-foreground/70"
                  }`}
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {isDragActive
                    ? "Drop the file here..."
                    : "Drag and drop a file, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any file format — CSV, Excel, PDF, JSON, vCard, plain text, and more
                </p>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-200 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-14 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">AI is extracting your contacts…</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {fileName}
                </div>
                <p className="text-xs text-muted-foreground">
                  This usually takes a few seconds
                </p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                AI extracted{" "}
                <span className="font-medium text-foreground">
                  {extractedContacts.length} contacts
                </span>{" "}
                from {fileName}
              </div>

              <p className="text-sm text-muted-foreground">
                Preview of first 5 contacts. All {extractedContacts.length}{" "}
                will be imported.
              </p>

              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedContacts.slice(0, 5).map((contact, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{contact.phoneNumber}</td>
                        <td className="px-3 py-2">
                          {[contact.firstName, contact.lastName]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </td>
                        <td className="px-3 py-2">{contact.email || "-"}</td>
                        <td className="px-3 py-2">{contact.company || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Before importing:</p>
                      <ul className="mt-1 list-inside list-disc text-muted-foreground">
                        <li>Duplicate phone numbers will be skipped</li>
                        <li>Numbers on your DNC list will be excluded</li>
                        <li>Invalid phone numbers will be skipped</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={bulkCreate.isPending}>
                  {bulkCreate.isPending
                    ? "Importing…"
                    : `Import ${extractedContacts.length} Contacts`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && result && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-400">
                      {result.created}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Contacts imported
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-muted-foreground/70">
                      {result.skippedDuplicate +
                        result.skippedDNC +
                        result.skippedInvalid}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </CardContent>
                </Card>
              </div>

              {(result.skippedDuplicate > 0 ||
                result.skippedDNC > 0 ||
                result.skippedInvalid > 0) && (
                <div className="text-sm text-muted-foreground">
                  <p>Skipped reasons:</p>
                  <ul className="list-inside list-disc">
                    {result.skippedDuplicate > 0 && (
                      <li>Duplicates: {result.skippedDuplicate}</li>
                    )}
                    {result.skippedDNC > 0 && (
                      <li>On DNC list: {result.skippedDNC}</li>
                    )}
                    {result.skippedInvalid > 0 && (
                      <li>Invalid phone: {result.skippedInvalid}</li>
                    )}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-auto rounded border border-red-200 bg-red-500/10 p-3 text-sm text-red-400">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="mt-1 font-medium">
                      …and {result.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
