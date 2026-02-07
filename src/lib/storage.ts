import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2-compatible S3 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || "",
    secretAccessKey: process.env.R2_SECRET_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "calltone";

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

/**
 * Upload a file to R2 storage
 */
export async function uploadFile(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: data,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  const size = typeof data === "string" ? Buffer.byteLength(data) : data.length;

  return {
    key,
    url: `${process.env.R2_PUBLIC_URL || ""}/${key}`,
    size,
  };
}

/**
 * Generate a presigned URL for upload
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for download
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List files in a directory
 */
export async function listFiles(
  prefix: string,
  maxKeys: number = 100
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (response.Contents || []).map((item) => ({
    key: item.Key || "",
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }));
}

/**
 * Get file content
 */
export async function getFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("Empty file body");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Generate a unique key for organization files
 */
export function generateFileKey(
  organizationId: string,
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${organizationId}/${folder}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Upload knowledge document
 */
export async function uploadKnowledgeDocument(
  organizationId: string,
  filename: string,
  data: Buffer,
  contentType: string
): Promise<UploadResult> {
  const key = generateFileKey(organizationId, "knowledge", filename);
  return uploadFile(key, data, contentType, {
    organizationId,
    type: "knowledge",
  });
}

/**
 * Upload call recording
 */
export async function uploadCallRecording(
  organizationId: string,
  callId: string,
  data: Buffer
): Promise<UploadResult> {
  const key = `${organizationId}/recordings/${callId}.mp3`;
  return uploadFile(key, data, "audio/mpeg", {
    organizationId,
    callId,
    type: "recording",
  });
}

/**
 * Get recording URL for a call
 */
export async function getRecordingUrl(
  organizationId: string,
  callId: string
): Promise<string | null> {
  const key = `${organizationId}/recordings/${callId}.mp3`;

  try {
    return await getDownloadUrl(key);
  } catch {
    return null;
  }
}

/**
 * Delete all files for an organization
 */
export async function deleteOrganizationFiles(organizationId: string): Promise<number> {
  const files = await listFiles(`${organizationId}/`, 1000);

  let deleted = 0;
  for (const file of files) {
    try {
      await deleteFile(file.key);
      deleted++;
    } catch (error) {
      console.error(`[Storage] Failed to delete ${file.key}:`, error);
    }
  }

  return deleted;
}
