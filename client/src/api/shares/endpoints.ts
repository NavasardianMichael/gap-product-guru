// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const SHARE_ENDPOINTS = {
  create: (conversationId: string) =>
    `/api/conversations/${encodeURIComponent(conversationId)}/share`,
  byId: (shareId: string) => `/api/shares/${encodeURIComponent(shareId)}`,
  continue: (shareId: string) => `/api/shares/${encodeURIComponent(shareId)}/continue`,
} as const;
