import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConfigValidationError } from './errors.js';

function makeZodError(schema: z.ZodTypeAny, input: unknown): z.ZodError {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('Expected parse to fail but it succeeded');
  return result.error;
}

describe('ConfigValidationError', () => {
  describe('constructed from a plain string', () => {
    it('sets message to the provided string', () => {
      const err = new ConfigValidationError('something went wrong');
      expect(err.message).toBe('something went wrong');
    });

    it('sets name to ConfigValidationError', () => {
      const err = new ConfigValidationError('msg');
      expect(err.name).toBe('ConfigValidationError');
    });

    it('is an instance of Error', () => {
      const err = new ConfigValidationError('msg');
      expect(err).toBeInstanceOf(Error);
    });

    it('leaves zodError undefined', () => {
      const err = new ConfigValidationError('msg');
      expect(err.zodError).toBeUndefined();
    });
  });

  describe('constructed from a ZodError', () => {
    it('sets name to ConfigValidationError', () => {
      const schema = z.object({ name: z.string() });
      const zodErr = makeZodError(schema, { name: 42 });
      const err = new ConfigValidationError(zodErr);
      expect(err.name).toBe('ConfigValidationError');
    });

    it('is an instance of Error', () => {
      const schema = z.object({ name: z.string() });
      const zodErr = makeZodError(schema, { name: 42 });
      const err = new ConfigValidationError(zodErr);
      expect(err).toBeInstanceOf(Error);
    });

    it('stores the original ZodError on zodError property', () => {
      const schema = z.object({ name: z.string() });
      const zodErr = makeZodError(schema, { name: 42 });
      const err = new ConfigValidationError(zodErr);
      expect(err.zodError).toBe(zodErr);
    });

    it('message starts with "Config validation failed:"', () => {
      const schema = z.object({ count: z.number() });
      const zodErr = makeZodError(schema, { count: 'not-a-number' });
      const err = new ConfigValidationError(zodErr);
      expect(err.message).toMatch(/^Config validation failed:/);
    });

    it('message includes the field path for a nested error', () => {
      const schema = z.object({
        event_loop: z.object({ iterations: z.number().positive() }),
      });
      const zodErr = makeZodError(schema, { event_loop: { iterations: -1 } });
      const err = new ConfigValidationError(zodErr);
      expect(err.message).toContain('event_loop.iterations');
    });

    it('message includes the Zod issue message text', () => {
      const schema = z.object({ name: z.string() });
      const zodErr = makeZodError(schema, { name: 99 });
      const err = new ConfigValidationError(zodErr);
      expect(err.message).toMatch(/Expected string/i);
    });

    it('message lists each issue on its own line prefixed with "  - "', () => {
      const schema = z.object({ a: z.string(), b: z.number() });
      const zodErr = makeZodError(schema, { a: 1, b: 'x' });
      const err = new ConfigValidationError(zodErr);
      const lines = err.message.split('\n');
      const issueLines = lines.filter((l) => l.startsWith('  - '));
      expect(issueLines.length).toBeGreaterThanOrEqual(2);
    });

    it('each issue line contains both path and message separated by ": "', () => {
      const schema = z.object({ level: z.number() });
      const zodErr = makeZodError(schema, { level: 'high' });
      const err = new ConfigValidationError(zodErr);
      const lines = err.message.split('\n');
      const issueLine = lines.find((l) => l.startsWith('  - '))!;
      expect(issueLine).toMatch(/^ {2}- .+: .+/);
    });

    it('formats a top-level missing required field with its key in the path', () => {
      const schema = z.object({ required_field: z.string() });
      const zodErr = makeZodError(schema, {});
      const err = new ConfigValidationError(zodErr);
      expect(err.message).toContain('required_field');
    });

    it('formats multiple issues each on a separate line', () => {
      const schema = z.object({
        x: z.string(),
        y: z.number(),
        z: z.boolean(),
      });
      const zodErr = makeZodError(schema, { x: 1, y: 'two', z: 'three' });
      const err = new ConfigValidationError(zodErr);
      const issueLines = err.message.split('\n').filter((l) => l.startsWith('  - '));
      expect(issueLines).toHaveLength(3);
    });

    it('message is human-readable — no raw JSON or [object Object]', () => {
      const schema = z.object({ mode: z.enum(['a', 'b']) });
      const zodErr = makeZodError(schema, { mode: 'c' });
      const err = new ConfigValidationError(zodErr);
      expect(err.message).not.toContain('[object Object]');
      expect(err.message).not.toMatch(/^\{/);
    });

    it('handles a ZodError with no issues gracefully', () => {
      const schema = z.object({ val: z.string() });
      const zodErr = makeZodError(schema, { val: 1 });
      zodErr.issues = [];
      const err = new ConfigValidationError(zodErr);
      expect(err.message).toContain('Config validation failed:');
    });
  });
});
