import { createHash, randomBytes } from "crypto";
import { db } from "./db";

/**
 * Generate a new API key
 * Format: vxf_[32 random chars]
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(24).toString("base64url");
  return `vxf_${randomPart}`;
}

/**
 * Hash an API key for storage
 * We only store the hash, never the full key
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Get the prefix of an API key (for display)
 * Shows first 12 characters
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12) + "...";
}

/**
 * Validate an API key and return the organization if valid.
 * Optionally checks requestIp against the key's IP allowlist.
 */
export async function validateApiKey(
  apiKey: string,
  requestIp?: string
): Promise<{ valid: boolean; organizationId?: string; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  // Check format
  if (!apiKey.startsWith("vxf_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Hash the key to compare with stored hashes
  const keyHash = hashApiKey(apiKey);

  // Look up the key in the database
  const apiKeyRecord = await db.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
    },
    include: {
      organization: {
        select: {
          id: true,
          planId: true,
        },
      },
    },
  });

  if (!apiKeyRecord) {
    return { valid: false, error: "Invalid API key" };
  }

  // Check IP allowlist if configured
  if (apiKeyRecord.ipAllowlist.length > 0 && requestIp) {
    const allowed = apiKeyRecord.ipAllowlist.some((ip) => ip === requestIp);
    if (!allowed) {
      return { valid: false, error: "Request IP not in allowlist" };
    }
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    organizationId: apiKeyRecord.organizationId,
  };
}

/**
 * Create a new API key for an organization
 */
export async function createApiKey(
  organizationId: string,
  name: string,
  createdById: string
): Promise<{ key: string; keyPrefix: string; id: string }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = getKeyPrefix(key);

  const apiKeyRecord = await db.apiKey.create({
    data: {
      organizationId,
      name,
      keyHash,
      keyPrefix,
      createdById,
    },
  });

  return {
    key, // Only returned once, never stored!
    keyPrefix,
    id: apiKeyRecord.id,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  organizationId: string,
  keyId: string
): Promise<boolean> {
  const result = await db.apiKey.updateMany({
    where: {
      id: keyId,
      organizationId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * List API keys for an organization (without the actual key)
 */
export async function listApiKeys(organizationId: string) {
  return db.apiKey.findMany({
    where: {
      organizationId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      ipAllowlist: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
