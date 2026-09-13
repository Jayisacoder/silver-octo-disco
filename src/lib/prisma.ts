import { PrismaClient } from '@prisma/client';

// Standard Next.js dev-hot-reload-safe Prisma singleton: in development, Next's
// module reloading would otherwise create a new PrismaClient (and a new DB
// connection pool) on every edit. We stash the instance on the Node global
// object so it survives hot reloads; in production a fresh module load per
// process is fine.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
