import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { uploadKnowledgeDocument } from "@/lib/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "manual",
  "text/csv": "manual",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId || !clerkOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up DB org from Clerk org ID
    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = user.organizationId;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type] && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, DOCX, TXT, CSV" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const docName = name || file.name.replace(/\.[^.]+$/, "");
    const docType = ALLOWED_TYPES[file.type] || "manual";

    // For text-based files, extract content directly
    let content: string | undefined;
    if (
      file.type === "text/plain" ||
      file.type === "text/csv" ||
      file.name.endsWith(".txt")
    ) {
      content = new TextDecoder().decode(buffer);
    }

    // Upload file to R2 storage
    const uploadResult = await uploadKnowledgeDocument(
      orgId,
      file.name,
      buffer,
      file.type
    );

    // Create knowledge document record in database
    const document = await prisma.knowledgeDocument.create({
      data: {
        organizationId: orgId,
        name: docName,
        type: docType,
        sourceUrl: uploadResult.url,
        content: content || `[File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n\nThis document has been uploaded to storage. For PDF and DOCX files, please add a text summary in the content field to make it searchable by your AI agent.`,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        sourceUrl: uploadResult.url,
      },
    });
  } catch (error) {
    console.error("[Knowledge Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
