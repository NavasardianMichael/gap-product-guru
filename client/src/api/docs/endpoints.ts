// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const DOCS_ENDPOINTS = {
  areas: '/api/docs/areas',
} as const;
