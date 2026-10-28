import { z } from 'zod';

import {
  CHAT_MESSAGE_MAX_LENGTH,
  FEEDBACK_NOTE_MAX_LENGTH,
  REPLY_QUOTE_MAX_LENGTH,
} from '../constants/chat.js';
import { ADMIN_FEEDBACK_VIEWS, FEEDBACK_RATINGS } from '../types/chat.js';

export const chatRequestSchema = z.object({
  /** Omit to start a new conversation; the server creates it once the first answer completes. */
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  /** Only search this docs area (DocAreaDto.key); omit to search everything. */
  area: z.string().trim().min(1).max(200).optional(),
  /** The part of an earlier answer this question replies to. */
  replyTo: z.string().trim().min(1).max(REPLY_QUOTE_MAX_LENGTH).optional(),
  /** Id of the answer `replyTo` was quoted from — lets the UI jump back to it. */
  replyToId: z.uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const conversationParamsSchema = z.object({
  id: z.uuid(),
});

/** `:id` route params that must be a uuid (messages, shares, feedback). */
export const idParamsSchema = z.object({
  id: z.uuid(),
});

export const clientIdSchema = z.uuid();

export const feedbackRequestSchema = z.object({
  rating: z.enum(FEEDBACK_RATINGS),
  /** Only kept for reports. */
  note: z.string().trim().max(FEEDBACK_NOTE_MAX_LENGTH).optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

export const adminFeedbackQuerySchema = z.object({
  view: z.enum(ADMIN_FEEDBACK_VIEWS).default(ADMIN_FEEDBACK_VIEWS.open),
});

export const adminFeedbackUpdateSchema = z.object({
  resolved: z.boolean(),
});

export type AdminFeedbackUpdate = z.infer<typeof adminFeedbackUpdateSchema>;
