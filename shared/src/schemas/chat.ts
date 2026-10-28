import { z } from 'zod';

import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat.js';

export const chatRequestSchema = z.object({
  /** Omit to start a new conversation; the server creates it once the first answer completes. */
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const conversationParamsSchema = z.object({
  id: z.uuid(),
});

export const clientIdSchema = z.uuid();
