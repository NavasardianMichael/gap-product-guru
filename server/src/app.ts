import express, { type Request } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { isProd } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import { apiRoutes } from '@/routes/index.js';
import { serveClient } from '@/web/serveClient.js';

/** Gap brand fonts (kit.css + font files) are loaded from here by client/index.html. */
const GAP_FONTS_ORIGIN = 'https://www.gapinternational.com';

export function createApp(): express.Application {
  const app = express();

  // Only trust X-Forwarded-For from a proxy on this machine, so clients can't spoof
  // their IP past chatLimiter.
  app.set('trust proxy', 'loopback');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:', GAP_FONTS_ORIGIN],
              formAction: ["'self'"],
              frameAncestors: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              scriptSrc: ["'self'"],
              scriptSrcAttr: ["'none'"],
              // antd injects its CSS-in-JS as inline <style> tags
              styleSrc: ["'self'", "'unsafe-inline'", GAP_FONTS_ORIGIN],
              // Off so plain-http LAN access keeps working (it would rewrite requests to https)
              upgradeInsecureRequests: null,
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '100kb' }));

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: Request) => req.url === '/api/health',
      },
    }),
  );

  // NOTE: never add compression() without excluding text/event-stream — it buffers SSE frames.
  app.use('/api', apiRoutes);

  // Production: the same server hosts the built client
  if (isProd) {
    serveClient(app);
  }

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
