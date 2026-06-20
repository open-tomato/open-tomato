import { describe, expect, it } from 'vitest';

import { RobotSchema } from './robot.schema.js';

describe('RobotSchema', () => {
  describe('valid input', () => {
    it('accepts an empty object and applies defaults', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
        expect(result.data.bot_token).toBeUndefined();
        expect(result.data.timeout_ms).toBeUndefined();
      }
    });

    it('accepts enabled: false without timeout_ms', () => {
      const result = RobotSchema.safeParse({ enabled: false });
      expect(result.success).toBe(true);
    });

    it('accepts enabled: false with timeout_ms present', () => {
      const result = RobotSchema.safeParse({ enabled: false, timeout_ms: 5000 });
      expect(result.success).toBe(true);
    });

    it('accepts enabled: true with timeout_ms present', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: 3000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.timeout_ms).toBe(3000);
      }
    });

    it('accepts a fully specified object', () => {
      const result = RobotSchema.safeParse({
        enabled: true,
        bot_token: 'xoxb-test-token',
        timeout_ms: 10000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.bot_token).toBe('xoxb-test-token');
        expect(result.data.timeout_ms).toBe(10000);
      }
    });

    it('accepts timeout_ms of 1 (minimum positive integer)', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe('timeout_ms required when enabled: true', () => {
    it('rejects enabled: true without timeout_ms', () => {
      const result = RobotSchema.safeParse({ enabled: true });
      expect(result.success).toBe(false);
    });

    it('rejects enabled: true with timeout_ms explicitly undefined', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: undefined });
      expect(result.success).toBe(false);
    });

    it('includes timeout_ms in the error path when enabled: true and timeout_ms missing', () => {
      const result = RobotSchema.safeParse({ enabled: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path);
        expect(paths).toContainEqual(['timeout_ms']);
      }
    });

    it('includes a descriptive error message when enabled: true and timeout_ms missing', () => {
      const result = RobotSchema.safeParse({ enabled: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        expect(messages).toContain('timeout_ms is required when enabled is true');
      }
    });
  });

  describe('timeout_ms field validation', () => {
    it('rejects timeout_ms of 0', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative timeout_ms', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: -1000 });
      expect(result.success).toBe(false);
    });

    it('rejects fractional timeout_ms', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: 1.5 });
      expect(result.success).toBe(false);
    });

    it('rejects a string for timeout_ms', () => {
      const result = RobotSchema.safeParse({ enabled: true, timeout_ms: '5000' });
      expect(result.success).toBe(false);
    });
  });

  describe('defaults', () => {
    it('defaults enabled to false when omitted', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });

    it('leaves bot_token undefined when omitted', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bot_token).toBeUndefined();
      }
    });

    it('leaves timeout_ms undefined when omitted and enabled is false', () => {
      const result = RobotSchema.safeParse({ enabled: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout_ms).toBeUndefined();
      }
    });

    it('defaults service_timeout_ms to 300000', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_timeout_ms).toBe(300_000);
      }
    });

    it('defaults service_poll_interval_ms to 250', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_poll_interval_ms).toBe(250);
      }
    });

    it('defaults service_max_retries to 3', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_max_retries).toBe(3);
      }
    });

    it('leaves service_webhook_url undefined when omitted', () => {
      const result = RobotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_webhook_url).toBeUndefined();
      }
    });
  });

  describe('service_* field validation', () => {
    it('accepts valid service_timeout_ms', () => {
      const result = RobotSchema.safeParse({ service_timeout_ms: 600_000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_timeout_ms).toBe(600_000);
      }
    });

    it('rejects non-positive service_timeout_ms', () => {
      expect(RobotSchema.safeParse({ service_timeout_ms: 0 }).success).toBe(false);
      expect(RobotSchema.safeParse({ service_timeout_ms: -1 }).success).toBe(false);
    });

    it('accepts valid service_poll_interval_ms', () => {
      const result = RobotSchema.safeParse({ service_poll_interval_ms: 500 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_poll_interval_ms).toBe(500);
      }
    });

    it('rejects non-positive service_poll_interval_ms', () => {
      expect(RobotSchema.safeParse({ service_poll_interval_ms: 0 }).success).toBe(false);
    });

    it('accepts zero service_max_retries', () => {
      const result = RobotSchema.safeParse({ service_max_retries: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_max_retries).toBe(0);
      }
    });

    it('rejects negative service_max_retries', () => {
      expect(RobotSchema.safeParse({ service_max_retries: -1 }).success).toBe(false);
    });

    it('accepts a valid URL for service_webhook_url', () => {
      const result = RobotSchema.safeParse({ service_webhook_url: 'https://hooks.example.com/robot' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.service_webhook_url).toBe('https://hooks.example.com/robot');
      }
    });

    it('rejects an invalid URL for service_webhook_url', () => {
      expect(RobotSchema.safeParse({ service_webhook_url: 'not-a-url' }).success).toBe(false);
    });
  });
});
