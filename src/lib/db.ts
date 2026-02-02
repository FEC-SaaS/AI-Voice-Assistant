import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Use singleton pattern for both dev and production to prevent connection exhaustion
// In serverless environments (Vercel), each function invocation reuses the cached client
export const db = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client globally to reuse across requests
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}

export { db as prisma };
