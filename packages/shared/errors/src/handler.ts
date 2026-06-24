/**
 * Express error-handling middleware and Zod-to-ValidationError conversion utility
 * for `@open-tomato/errors`. Node.js only — do not import in browser contexts.
 */

import type { FieldError } from './types.js';
import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import { AppError, ValidationError } from './errors.js';

/**
 * Minimal logger interface accepted by `errorHandler`.
 * Compatible with `@open-tomato/logger` and any pino-shaped logger,
 * without requiring a direct dependency on either.
 */
export interface Logger {
  warn(obj: object, msg: string): void
  error(obj: object, msg: string): void
}

/**
 * Converts a `ZodError` into a `ValidationError` with structured `FieldError[]` details.
 * Each Zod issue's `path` is joined with `.` to produce dot-notation field names
 * (e.g. `"user.email"`). Top-level fields produce a name without a dot.
 *
 * @param err - The `ZodError` to convert.
 * @returns A `ValidationError` ready to be thrown or returned.
 */
export function zodToValidationError(err: ZodError): ValidationError {
  const fields: FieldError[] = err.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
  return new ValidationError('Validation failed', fields);
}

/**
 * Factory that returns an Express 4-argument error-handling middleware.
 *
 * Behaviour:
 * - `ZodError` → delegates to `zodToValidationError`, responds 422 with `VALIDATION_ERROR`.
 * - `AppError` subclass → logs with `warn`, responds with the error's own `statusCode` and `toJSON()` body.
 * - Unknown `Error` or thrown value → logs with `error`, responds 500 with `{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }`.
 *
 * **Note:** This handler is registered automatically by `createService` in
 * `@open-tomato/service-core`. Do **not** add it manually inside a service's
 * `register()` function, or it will be mounted twice.
 *
 * @param logger - A logger instance with `warn` and `error` methods.
 * @returns An Express `ErrorRequestHandler` to be passed to `app.use()`.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      const validationError = zodToValidationError(err);
      logger.warn({ code: validationError.code }, validationError.message);
      res.status(422).json(validationError.toJSON());
      return;
    }
    if (err instanceof AppError) {
      logger.warn({ code: err.code, cause: err.cause }, err.message);
      res.status(err.statusCode).json(err.toJSON());
      return;
    }
    const unknown = err as { message?: string; stack?: string };
    logger.error({ stack: unknown.stack }, unknown.message ?? 'Unknown error');
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  };
}
