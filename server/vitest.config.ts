import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Just enough for config/env.ts to validate; tests never touch the database or Gemini.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5435/test',
      LOG_LEVEL: 'fatal',
    },
  },
});
