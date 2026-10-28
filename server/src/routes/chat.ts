import {
  type ChatRequest,
  chatRequestSchema,
  type ChatStreamError,
  type ChatStreamFrame,
  ErrorCode,
  SSE_DONE,
} from '@gap-product-guru/shared';
import { type Response, type Router as ExpressRouter, Router } from 'express';

import { isDev } from '@/config/env.js';
import { toAiError } from '@/lib/gemini.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/middleware/errorHandler.js';
import { chatLimiter } from '@/middleware/rateLimiter.js';
import { validate } from '@/middleware/validate.js';
import { streamChat, type StreamChatInput } from '@/services/chatService.js';
import { conversationService } from '@/services/conversationService.js';

const router: ExpressRouter = Router();

function writeFrame(res: Response, frame: ChatStreamFrame | typeof SSE_DONE): void {
  const data = typeof frame === 'string' ? frame : JSON.stringify(frame);
  res.write(`data: ${data}\n\n`);
}

function toStreamError(error: unknown): ChatStreamError {
  const appError = toAiError(error);
  if (appError instanceof AppError) {
    return {
      code: appError.code,
      message: appError.message,
      ...(appError.retryAfterSeconds && { retryAfterSeconds: appError.retryAfterSeconds }),
    };
  }
  const detail = error instanceof Error ? error.message : String(error);
  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: isDev
      ? `Chat failed: ${detail}`
      : 'Something went wrong while answering. Please retry.',
  };
}

/**
 * Streams `streamChat` frames as Server-Sent Events. Once headers are flushed the status is
 * 200, so failures from here on travel as an `error` frame (docs/STREAMING_PROTOCOL.md).
 */
async function pumpChatStream(
  res: Response,
  input: Omit<StreamChatInput, 'signal'>,
): Promise<void> {
  const controller = new AbortController();
  // `res` 'close' before the response finished = the client went away (tab closed, Stop pressed).
  // Not `req.on('close')`: that fires as soon as the request body has been read.
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // stop a reverse proxy (nginx) from buffering
  res.flushHeaders();

  try {
    for await (const frame of streamChat({ ...input, signal: controller.signal })) {
      writeFrame(res, frame);
    }
    writeFrame(res, SSE_DONE);
  } catch (error) {
    if (controller.signal.aborted) {
      logger.info({ action: 'chat_aborted' }, 'chat stream aborted by client');
      return;
    }
    logger.error({ err: error }, 'chat stream failed');
    writeFrame(res, { error: toStreamError(error) });
  } finally {
    if (!res.writableEnded) res.end();
  }
}

// POST /api/chat — answer a question over SSE
router.post('/', chatLimiter, validate(chatRequestSchema), async (req, res, next) => {
  try {
    const { conversationId, message, area, replyTo, replyToId } = req.body as ChatRequest;
    const clientId = req.clientId!;

    // Checked before any SSE header, so a bad id is a normal JSON 404 rather than a stream error.
    if (conversationId) {
      await conversationService.assertOwned(conversationId, clientId);
    }

    await pumpChatStream(res, {
      clientId,
      conversationId,
      message,
      area,
      replyTo,
      replyToId,
    });
  } catch (error) {
    next(error);
  }
});

export const chatRoutes: ExpressRouter = router;
