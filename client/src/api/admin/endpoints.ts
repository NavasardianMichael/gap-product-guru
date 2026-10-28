import { type AdminFeedbackView } from '@gap-product-guru/shared';

// Relative on purpose: Vite proxies /api in dev, Express serves the client in production.
export const ADMIN_ENDPOINTS = {
  feedback: (view: AdminFeedbackView) => `/api/admin/feedback?view=${encodeURIComponent(view)}`,
  feedbackById: (id: string) => `/api/admin/feedback/${encodeURIComponent(id)}`,
} as const;
