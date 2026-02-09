"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadProps {
  onFileContent: (content: string, fileName: string, fileType: string) => void;
  isUploading?: boolean;
}

export function DocumentUpload({
  onFileContent,
  isUploading,
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (
      !Object.keys(ACCEPTED_TYPES).includes(file.type) &&
      !file.name.endsWith(".txt")
    ) {
      return "Unsupported file type. Please upload a PDF, DOCX, TXT, or CSV file.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`;
    }
    return null;
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      try {
        if (
          file.type === "text/plain" ||
          file.type === "text/csv" ||
          file.name.endsWith(".txt")
        ) {
          const text = await file.text();
          onFileContent(text, file.name, file.type || "text/plain");
        } else {
          // For PDF and DOCX, read as base64 for server-side processing
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          onFileContent(base64, file.name, file.type);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to read file";
        setError(message);
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileContent]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }
      setSelectedFile(file);
      setError(null);
      processFile(file);
    },
    [validateFile, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const busy = isProcessing || isUploading;

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : error
              ? "border-red-300 bg-red-500/10"
              : selectedFile
                ? "border-green-300 bg-green-500/10"
                : "border-border hover:border-muted-foreground/70"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center">
            <FileText className="h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            {busy ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploading ? "Uploading..." : "Processing..."}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={clearFile}
              >
                <X className="mr-1 h-3 w-3" /> Remove
              </Button>
            )}
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground/70" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop a file, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported: PDF, DOCX, TXT, CSV (max 10MB)
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Select File
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.csv"
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
