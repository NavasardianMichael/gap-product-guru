import { ErrorCode, type ErrorCodeType, HttpStatus } from '@gap-product-guru/shared';
import { type NextFunction, type Request, type Response } from 'express';

import { isDev } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

function isPayloadTooLargeError(err: Error): boolean {
  const withType = err as Error & { type?: string; status?: number; statusCode?: number };
  return (
    withType.type === 'entity.too.large' ||
    withType.status === HttpStatus.PAYLOAD_TOO_LARGE ||
    withType.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
  );
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCodeType,
    message: string,
    public readonly details?: Record<string, string[]>,
    /** Rate limits only: sent as the `Retry-After` header and `error.retryAfterSeconds`. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

type DevErrorContext = {
  name: string;
  /** Real message even when the client-facing one is masked (unexpected errors). */
  originalMessage: string;
  method: string;
  path: string;
  stack?: string;
};

/** Request context attached to error responses in dev only. */
function buildDevContext(err: Error, req: Request): DevErrorContext {
  return {
    name: err.name,
    originalMessage: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: err.stack,
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  logger.error({ err }, 'Request error');

  const dev = isDev ? { dev: buildDevContext(err, req) } : {};

  // Handle known AppError
  if (err instanceof AppError) {
    if (err.retryAfterSeconds) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        ...(err.retryAfterSeconds && { retryAfterSeconds: err.retryAfterSeconds }),
        ...dev,
      },
    });
    return;
  }

  if (isPayloadTooLargeError(err)) {
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      success: false,
      error: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: 'Request body is too large',
        ...dev,
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      ...dev,
    },
  });
}
