import { createApp } from '@/app.js';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

const app = createApp();

const onListening = () => {
  logger.info(
    { host: env.HOST, port: env.PORT, env: env.NODE_ENV, chatModel: env.GEMINI_CHAT_MODEL },
    '🚀 Server started',
  );
  if (!env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not set — chat and ingestion will fail until it is');
  }
};

const server = env.HOST
  ? app.listen(env.PORT, env.HOST, onListening)
  : app.listen(env.PORT, onListening);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server shutdown');
      process.exit(1);
    }

    logger.info('Server closed gracefully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds (open SSE streams would otherwise keep the server alive)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});
