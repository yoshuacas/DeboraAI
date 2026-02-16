import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 *
 * Ensures only one instance of Prisma Client is created across the application.
 * This prevents connection pool exhaustion during development with hot reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
