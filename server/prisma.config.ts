import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env files itself — read the same file the dev server uses.
// Prisma commands run with server/ as the working directory (pnpm --filter).
dotenv.config({ path: '.env.development.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `?? ''` keeps `prisma generate` (postinstall) working on a fresh clone with no env file yet.
    url: process.env.DATABASE_URL ?? '',
  },
});
