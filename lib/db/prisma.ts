import { PrismaClient } from "@prisma/client";

// Vercel database integrations set varying env var names; resolve whichever
// exists so runtime works regardless of provider (locally this is the SQLite
// file URL from .env).
function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_POSTGRES_URL
  );
}

// Standard Next.js singleton — avoids exhausting connections on hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
