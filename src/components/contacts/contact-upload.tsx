"use client";

import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  customData?: Record<string, string>;
}

interface ColumnMapping {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

const defaultMapping: ColumnMapping = {
  phoneNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  company: "",
};

export function ContactUpload({ campaignId, onSuccess }: ContactUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
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

  // Handle scientific notation (e.g., 2.33558E+11 from Excel)
  const normalizeValue = useCallback((value: string): string => {
    const trimmed = value.trim();
    // Check if it's scientific notation
    if (/^[\d.]+[eE][+-]?\d+$/.test(trimmed)) {
      try {
        const num = parseFloat(trimmed);
        if (!isNaN(num) && isFinite(num)) {
          return Math.round(num).toString();
        }
      } catch {
        // If parsing fails, return original
      }
    }
    return trimmed;
  }, []);

  // Detect delimiter from first line: comma, semicolon, or tab
  const detectDelimiter = useCallback((firstLine: string): string => {
    // Count occurrences outside of quotes
    let commas = 0, semicolons = 0, tabs = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (char === ",") commas++;
        else if (char === ";") semicolons++;
        else if (char === "\t") tabs++;
      }
    }
    // Pick the delimiter with the most occurrences
    if (tabs > commas && tabs > semicolons) return "\t";
    if (semicolons > commas) return ";";
    return ",";
  }, []);

  const parseCSV = useCallback((text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return [];

    const firstLine = lines[0] || "";
    const delimiter = detectDelimiter(firstLine);
    console.log("[ContactUpload] Detected delimiter:", delimiter === "\t" ? "TAB" : delimiter);

    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(normalizeValue(current));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(normalizeValue(current));
      return result;
    });
  }, [normalizeValue, detectDelimiter]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setParseError(null);
      try {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) {
          setParseError("No file selected");
          toast.error("No file selected");
          return;
        }

        console.log("[ContactUpload] Processing file:", uploadedFile.name, "MIME:", uploadedFile.type, "Size:", uploadedFile.size);
        setFile(uploadedFile);

        const reader = new FileReader();

        reader.onerror = () => {
          console.error("[ContactUpload] FileReader error:", reader.error);
          setParseError("Failed to read file. Please try again.");
          toast.error("Failed to read file. Please try again.");
        };

        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            if (!text) {
              toast.error("File appears to be empty");
              return;
            }

            console.log("[ContactUpload] File content length:", text.length);
            const parsed = parseCSV(text);
            console.log("[ContactUpload] Parsed rows:", parsed.length);

            if (parsed.length < 2) {
              toast.error("File must have at least a header row and one data row");
              return;
            }

            const headerRow = parsed[0] || [];
            console.log("[ContactUpload] Headers found:", headerRow);
            setHeaders(headerRow);
            setCsvData(parsed.slice(1));

            // Auto-detect column mappings with flexible matching
            const autoMapping = { ...defaultMapping };
            const lowerHeaders = headerRow.map((h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

            // Phone number detection — very broad matching
            const phoneIndex = lowerHeaders.findIndex(
              (h) =>
                h.includes("phone") ||
                h.includes("mobile") ||
                h.includes("cell") ||
                h.includes("tel") ||
                h.includes("contact") ||
                h === "number" ||
                h === "no" ||
                h === "msisdn" ||
                h === "dial"
            );
            if (phoneIndex >= 0) autoMapping.phoneNumber = headerRow[phoneIndex] || "";

            // If no phone header found, check if any column's data looks like phone numbers
            if (!autoMapping.phoneNumber && parsed.length > 1) {
              const dataRow = parsed[1] || [];
              for (let ci = 0; ci < headerRow.length; ci++) {
                const val = (dataRow[ci] || "").replace(/[\s\-().+]/g, "");
                if (/^\d{7,15}$/.test(val)) {
                  autoMapping.phoneNumber = headerRow[ci] || "";
                  console.log("[ContactUpload] Auto-detected phone column by data pattern:", headerRow[ci]);
                  break;
                }
              }
            }

            // Name detection — handle both split and combined name columns
            const firstNameIndex = lowerHeaders.findIndex(
              (h) =>
                h === "firstname" ||
                h === "first" ||
                h === "fname" ||
                h === "givenname" ||
                h === "prenom"
            );
            if (firstNameIndex >= 0) autoMapping.firstName = headerRow[firstNameIndex] || "";

            const lastNameIndex = lowerHeaders.findIndex(
              (h) =>
                h === "lastname" ||
                h === "last" ||
                h === "lname" ||
                h === "surname" ||
                h === "familyname"
            );
            if (lastNameIndex >= 0) autoMapping.lastName = headerRow[lastNameIndex] || "";

            // If no first/last name found, try a combined "name" or "fullname" column as firstName
            if (!autoMapping.firstName && !autoMapping.lastName) {
              const nameIndex = lowerHeaders.findIndex(
                (h) => h === "name" || h === "fullname" || h === "contactname" || h === "customername"
              );
              if (nameIndex >= 0) autoMapping.firstName = headerRow[nameIndex] || "";
            }

            // Email detection
            const emailIndex = lowerHeaders.findIndex(
              (h) => h.includes("email") || h.includes("mail") || h === "emailaddress"
            );
            if (emailIndex >= 0) autoMapping.email = headerRow[emailIndex] || "";

            // Company detection
            const companyIndex = lowerHeaders.findIndex(
              (h) =>
                h.includes("company") ||
                h.includes("organization") ||
                h.includes("org") ||
                h.includes("business") ||
                h === "employer" ||
                h === "firm"
            );
            if (companyIndex >= 0) autoMapping.company = headerRow[companyIndex] || "";

            console.log("[ContactUpload] Auto-detected mapping:", autoMapping);
            setMapping(autoMapping);
            setStep("mapping");
          } catch (err) {
            console.error("[ContactUpload] Parse error:", err);
            const errorMsg = "Failed to parse CSV file. Please check the file format.";
            setParseError(errorMsg);
            toast.error(errorMsg);
          }
        };

        reader.readAsText(uploadedFile);
      } catch (error) {
        console.error("[ContactUpload] onDrop error:", error);
        const errorMsg = "An error occurred while processing the file";
        setParseError(errorMsg);
        toast.error(errorMsg);
      }
    },
    [parseCSV]
  );

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const rejection = fileRejections[0];
    if (rejection) {
      console.log("[ContactUpload] File rejected:", rejection.file.name, "MIME:", rejection.file.type, "Errors:", rejection.errors);
      const errorMessages = rejection.errors.map((e) => e.message).join(", ");
      const errorMsg = `File rejected: ${errorMessages}. File type: ${rejection.file.type || 'unknown'}`;
      setParseError(errorMsg);
      toast.error(errorMsg);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv", ".xls"],
      "text/plain": [".csv", ".txt", ".tsv"],
      "application/csv": [".csv"],
      "text/comma-separated-values": [".csv"],
      "text/tab-separated-values": [".tsv"],
      "application/octet-stream": [".csv", ".txt", ".tsv"],
    },
    maxFiles: 1,
    multiple: false,
    validator: (file) => {
      // Allow CSV and plain text files regardless of MIME type
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'csv' || extension === 'txt' || extension === 'tsv') {
        return null; // Valid
      }
      return {
        code: 'file-invalid-type',
        message: 'Please upload a .csv, .tsv, or .txt file with contact data',
      };
    },
  });

  const handleMappingConfirm = () => {
    if (!mapping.phoneNumber) {
      toast.error("Please select a column for phone number");
      return;
    }
    setStep("preview");
  };

  const getPreviewContacts = (): ParsedContact[] => {
    return csvData.slice(0, 5).map((row) => {
      const getColumnValue = (columnName: string) => {
        if (!columnName) return undefined;
        const index = headers.indexOf(columnName);
        return index >= 0 ? row[index] : undefined;
      };

      // Collect custom data from unmapped columns
      const customData: Record<string, string> = {};
      const mappedColumns = Object.values(mapping).filter(Boolean);
      headers.forEach((header, index) => {
        if (!mappedColumns.includes(header) && row[index]) {
          customData[header] = row[index];
        }
      });

      return {
        phoneNumber: getColumnValue(mapping.phoneNumber) || "",
        firstName: getColumnValue(mapping.firstName),
        lastName: getColumnValue(mapping.lastName),
        email: getColumnValue(mapping.email),
        company: getColumnValue(mapping.company),
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      };
    });
  };

  const handleImport = () => {
    const contacts = csvData.map((row) => {
      const getColumnValue = (columnName: string) => {
        if (!columnName) return undefined;
        const index = headers.indexOf(columnName);
        return index >= 0 ? row[index] : undefined;
      };

      const customData: Record<string, string> = {};
      const mappedColumns = Object.values(mapping).filter(Boolean);
      headers.forEach((header, index) => {
        if (!mappedColumns.includes(header) && row[index]) {
          customData[header] = row[index];
        }
      });

      return {
        phoneNumber: getColumnValue(mapping.phoneNumber) || "",
        firstName: getColumnValue(mapping.firstName),
        lastName: getColumnValue(mapping.lastName),
        email: getColumnValue(mapping.email),
        company: getColumnValue(mapping.company),
        customData: Object.keys(customData).length > 0 ? customData : undefined,
      };
    });

    bulkCreate.mutate({
      contacts,
      campaignId,
      skipDuplicates: true,
      skipDNC: true,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping(defaultMapping);
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
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your contacts. We&apos;ll help you map the columns.
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : parseError
                    ? "border-red-300 bg-red-500/10"
                    : "border-border hover:border-border"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className={`mx-auto h-12 w-12 ${parseError ? "text-red-400" : "text-muted-foreground/70"}`} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {isDragActive
                    ? "Drop the CSV file here..."
                    : "Drag and drop a CSV file, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supported: .csv, .tsv, .txt — comma, semicolon, or tab separated (max 10,000 rows)
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

          {step === "mapping" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file?.name} ({csvData.length} rows)
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneColumn">Phone Number *</Label>
                    <Select
                      value={mapping.phoneNumber}
                      onValueChange={(v) => setMapping({ ...mapping, phoneNumber: v })}
                    >
                      <SelectTrigger id="phoneColumn">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="firstNameColumn">First Name</Label>
                    <Select
                      value={mapping.firstName || "__none__"}
                      onValueChange={(v) => setMapping({ ...mapping, firstName: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger id="firstNameColumn">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lastNameColumn">Last Name</Label>
                    <Select
                      value={mapping.lastName || "__none__"}
                      onValueChange={(v) => setMapping({ ...mapping, lastName: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger id="lastNameColumn">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="emailColumn">Email</Label>
                    <Select
                      value={mapping.email || "__none__"}
                      onValueChange={(v) => setMapping({ ...mapping, email: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger id="emailColumn">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyColumn">Company</Label>
                  <Select
                    value={mapping.company || "__none__"}
                    onValueChange={(v) => setMapping({ ...mapping, company: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger id="companyColumn">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- None --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={handleMappingConfirm}>Continue</Button>
              </DialogFooter>
            </div>
          )}

          {step === "preview" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Preview of first 5 contacts. All {csvData.length} rows will be imported.
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
                    {getPreviewContacts().map((contact, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{contact.phoneNumber}</td>
                        <td className="px-3 py-2">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "-"}
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
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={bulkCreate.isPending}>
                  {bulkCreate.isPending ? "Importing..." : `Import ${csvData.length} Contacts`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "result" && result && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-400">{result.created}</div>
                    <div className="text-sm text-muted-foreground">Contacts imported</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-muted-foreground/70">
                      {result.skippedDuplicate + result.skippedDNC + result.skippedInvalid}
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
                    {result.skippedDNC > 0 && <li>On DNC list: {result.skippedDNC}</li>}
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
                      ...and {result.errors.length - 10} more errors
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
