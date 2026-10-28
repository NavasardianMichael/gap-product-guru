// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const CHAT_ENDPOINTS = {
  chat: '/api/chat',
} as const;
