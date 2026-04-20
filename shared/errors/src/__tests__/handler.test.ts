import type { Logger } from '../handler.js';

import { describe, expect, it, vi } from 'vitest';
import { ZodError, ZodIssueCode } from 'zod';

import { NotFoundError, ValidationError } from '../errors.js';
import { errorHandler, zodToValidationError } from '../handler.js';

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function makeLogger(): Logger {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Minimal Express req and next stubs
const req = {} as Parameters<ReturnType<typeof errorHandler>>[1];
const next = vi.fn() as Parameters<ReturnType<typeof errorHandler>>[3];

describe('zodToValidationError', () => {
  it('maps a nested path to dot-notation field', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['user', 'email'],
        message: 'Required',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(result).toBeInstanceOf(ValidationError);
    expect(result.details).toEqual([
      { field: 'user.email', message: 'Required', code: ZodIssueCode.invalid_type },
    ]);
  });

  it('maps a top-level field (single-element path) without a dot', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['name'],
        message: 'Required',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(result.details?.[0].field).toBe('name');
    expect(result.details?.[0].field).not.toContain('.');
  });

  it('maps multiple issues to multiple FieldErrors', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['a'],
        message: 'Required',
      },
      {
        code: ZodIssueCode.too_small,
        type: 'string',
        minimum: 1,
        inclusive: true,
        path: ['b', 'c'],
        message: 'Too short',
      },
    ]);

    const result = zodToValidationError(zodErr);
    expect(result.details).toHaveLength(2);
    expect(result.details?.[0].field).toBe('a');
    expect(result.details?.[1].field).toBe('b.c');
  });
});

describe('errorHandler', () => {
  it('responds 500 with INTERNAL_ERROR for unknown errors; calls logger.error', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();
    const err = new Error('something broke');

    handler(err, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('responds with AppError statusCode and code; calls logger.warn', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();
    const err = new NotFoundError('Agent not found');

    handler(err, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Agent not found' }),
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('responds 422 VALIDATION_ERROR for ZodError with nested path', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();

    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['user', 'email'],
        message: 'Required',
      },
    ]);

    handler(zodErr, req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(422);

    const body = (res.json.mock.calls[0] as [{ code: string; details: Array<{ field: string }> }])[0];
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details[0].field).toBe('user.email');
  });

  it('calls logger.warn (not error) for ZodError', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);
    const res = makeRes();

    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['x'],
        message: 'Required',
      },
    ]);

    handler(zodErr, req, res as never, next);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('always responds via res.json (Content-Type: application/json implied)', () => {
    const logger = makeLogger();
    const handler = errorHandler(logger);

    for (const err of [
      new Error('unknown'),
      new NotFoundError(),
      new ZodError([
        {
          code: ZodIssueCode.invalid_type,
          expected: 'string',
          received: 'undefined',
          path: ['f'],
          message: 'Required',
        },
      ]),
    ]) {
      const res = makeRes();
      handler(err, req, res as never, next);
      expect(res.json).toHaveBeenCalledTimes(1);
    }
  });
});
