import { describe, expect, it } from 'vitest';

import { EventLoopSchema } from './event-loop.schema.js';

describe('EventLoopSchema', () => {
  describe('valid input', () => {
    it('accepts a fully specified valid object', () => {
      const result = EventLoopSchema.safeParse({
        iterations: 5,
        runtime_ms: 30000,
        cost_limit_usd: 1.5,
        completion_promise: 'all tasks done',
        required_events: ['task.complete', 'review.done'],
        enforce_hat_scope: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.iterations).toBe(5);
        expect(result.data.runtime_ms).toBe(30000);
        expect(result.data.cost_limit_usd).toBe(1.5);
        expect(result.data.completion_promise).toBe('all tasks done');
        expect(result.data.required_events).toEqual(['task.complete', 'review.done']);
        expect(result.data.enforce_hat_scope).toBe(true);
      }
    });

    it('accepts an empty object and applies all defaults', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.iterations).toBe(10);
        expect(result.data.required_events).toEqual([]);
        expect(result.data.enforce_hat_scope).toBe(false);
      }
    });

    it('accepts iterations of 1 (minimum positive integer)', () => {
      const result = EventLoopSchema.safeParse({ iterations: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts a large iterations value', () => {
      const result = EventLoopSchema.safeParse({ iterations: 1000 });
      expect(result.success).toBe(true);
    });

    it('accepts fractional positive values for runtime_ms', () => {
      const result = EventLoopSchema.safeParse({ runtime_ms: 0.5 });
      expect(result.success).toBe(true);
    });

    it('accepts fractional positive values for cost_limit_usd', () => {
      const result = EventLoopSchema.safeParse({ cost_limit_usd: 0.01 });
      expect(result.success).toBe(true);
    });
  });

  describe('defaults for missing optional fields', () => {
    it('defaults iterations to 10 when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.iterations).toBe(10);
      }
    });

    it('defaults required_events to empty array when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required_events).toEqual([]);
      }
    });

    it('defaults enforce_hat_scope to false when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enforce_hat_scope).toBe(false);
      }
    });

    it('leaves runtime_ms undefined when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.runtime_ms).toBeUndefined();
      }
    });

    it('leaves cost_limit_usd undefined when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cost_limit_usd).toBeUndefined();
      }
    });

    it('leaves completion_promise undefined when omitted', () => {
      const result = EventLoopSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completion_promise).toBeUndefined();
      }
    });
  });

  describe('rejection of non-positive integers for iterations', () => {
    it('rejects iterations of 0', () => {
      const result = EventLoopSchema.safeParse({ iterations: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative iterations', () => {
      const result = EventLoopSchema.safeParse({ iterations: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects large negative iterations', () => {
      const result = EventLoopSchema.safeParse({ iterations: -100 });
      expect(result.success).toBe(false);
    });

    it('rejects fractional iterations', () => {
      const result = EventLoopSchema.safeParse({ iterations: 1.5 });
      expect(result.success).toBe(false);
    });

    it('rejects a string for iterations', () => {
      const result = EventLoopSchema.safeParse({ iterations: 'ten' });
      expect(result.success).toBe(false);
    });
  });

  describe('rejection of non-positive values for optional numeric fields', () => {
    it('rejects runtime_ms of 0', () => {
      const result = EventLoopSchema.safeParse({ runtime_ms: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative runtime_ms', () => {
      const result = EventLoopSchema.safeParse({ runtime_ms: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects cost_limit_usd of 0', () => {
      const result = EventLoopSchema.safeParse({ cost_limit_usd: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative cost_limit_usd', () => {
      const result = EventLoopSchema.safeParse({ cost_limit_usd: -0.01 });
      expect(result.success).toBe(false);
    });
  });
});
