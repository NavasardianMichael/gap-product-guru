// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const CONVERSATION_ENDPOINTS = {
  list: '/api/conversations',
  byId: (id: string) => `/api/conversations/${encodeURIComponent(id)}`,
} as const;
