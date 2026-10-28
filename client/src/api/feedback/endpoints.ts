// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const FEEDBACK_ENDPOINTS = {
  forMessage: (messageId: string) => `/api/messages/${encodeURIComponent(messageId)}/feedback`,
} as const;
