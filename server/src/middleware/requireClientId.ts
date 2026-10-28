import { CLIENT_ID_HEADER, clientIdSchema, ErrorCode, HttpStatus } from '@gap-product-guru/shared';
import { type NextFunction, type Request, type Response } from 'express';

import { AppError } from '@/middleware/errorHandler.js';

/**
 * Reads the anonymous per-browser id that scopes conversation history.
 * This is scoping, not authentication — anyone who knows an id can read its history.
 */
export function requireClientId(req: Request, _res: Response, next: NextFunction): void {
  const parsed = clientIdSchema.safeParse(req.get(CLIENT_ID_HEADER));
  if (!parsed.success) {
    next(
      new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        `Missing or invalid ${CLIENT_ID_HEADER} header`,
      ),
    );
    return;
  }
  req.clientId = parsed.data;
  next();
}
