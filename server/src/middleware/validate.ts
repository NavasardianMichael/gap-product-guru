import { ErrorCode, HttpStatus } from '@gap-product-guru/shared';
import { type NextFunction, type Request, type Response } from 'express';
import { ZodError, type ZodType } from 'zod';

import { AppError } from '@/middleware/errorHandler.js';

// No 'query': in Express 5 `req.query` is a getter and cannot be reassigned.
type ValidationTarget = 'body' | 'params';

export function validate<T>(schema: ZodType<T>, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data as Request[ValidationTarget];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        next(
          new AppError(
            HttpStatus.UNPROCESSABLE_ENTITY,
            ErrorCode.VALIDATION_ERROR,
            'Validation failed',
            details,
          ),
        );
        return;
      }
      next(error);
    }
  };
}
