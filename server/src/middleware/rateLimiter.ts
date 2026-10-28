import { ErrorCode, HttpStatus } from '@gap-product-guru/shared';
import { type Request, type Response } from 'express';
import rateLimit, { type AugmentedRequest } from 'express-rate-limit';

import { env } from '@/config/env.js';

const WINDOW_MS = 60_000;

/**
 * Per-IP limit on POST /api/chat. Every question costs one embedding call and one generation
 * call against a single shared free Gemini quota, so one busy tab must not drain it for everyone.
 * Behind localhost or one office NAT all users share an IP — which is fine: the quota is shared too.
 */
export const chatLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: env.CHAT_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : WINDOW_MS / 1000;

    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many questions in a short time. Please wait a moment.',
        retryAfterSeconds,
      },
    });
  },
});
