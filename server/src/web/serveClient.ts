import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';

import { SERVER_ROOT } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

const CLIENT_DIST = path.resolve(SERVER_ROOT, '../client/dist');
const INDEX_HTML = path.join(CLIENT_DIST, 'index.html');

/**
 * Production only: serve the built client from the same origin as the API, so the browser
 * needs no CORS and the client's relative `/api/...` URLs work unchanged.
 * In dev, Vite serves the client and proxies `/api` to this server instead.
 */
export function serveClient(app: express.Application): void {
  if (!existsSync(INDEX_HTML)) {
    logger.warn({ clientDist: CLIENT_DIST }, 'client build not found — run `pnpm build`');
    return;
  }

  app.use(express.static(CLIENT_DIST));

  // SPA fallback: deep links like /c/<id> load index.html and the client router takes over.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(INDEX_HTML);
  });
}
