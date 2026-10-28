import { createRequire } from 'module';
import pino from 'pino';

import { env, isDev } from '@/config/env.js';

function canUsePrettyTransport(): boolean {
  if (!isDev) return false;

  try {
    const require = createRequire(import.meta.url);
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(canUsePrettyTransport() && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export type Logger = typeof logger;
