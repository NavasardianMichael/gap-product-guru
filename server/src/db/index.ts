import { PrismaPg } from '@prisma/adapter-pg';

import { env, isDev } from '@/config/env.js';
import { PrismaClient } from '@/generated/prisma/client.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 talks to Postgres through a driver adapter (node-postgres) instead of a Rust engine.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: isDev ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export type { PrismaClient };
