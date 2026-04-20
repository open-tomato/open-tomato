import { describe, expect, it } from 'vitest';

import {
  HumanEventSchema,
  HumanGuidanceEventSchema,
  HumanInteractEventSchema,
  HumanResponseEventSchema,
} from './human-events.js';

const NOW = '2026-03-31T12:00:00Z';

describe('HumanInteractEventSchema', () => {
  it('accepts a valid interact event', () => {
    const input = { type: 'human.interact', sessionId: 'sess-1', question: 'Continue?', timestamp: NOW };
    expect(HumanInteractEventSchema.parse(input)).toEqual(input);
  });

  it('rejects wrong type discriminator', () => {
    const input = { type: 'human.response', sessionId: 's', question: 'q', timestamp: NOW };
    expect(() => HumanInteractEventSchema.parse(input)).toThrow();
  });

  it('rejects empty sessionId', () => {
    const input = { type: 'human.interact', sessionId: '', question: 'q', timestamp: NOW };
    expect(() => HumanInteractEventSchema.parse(input)).toThrow();
  });

  it('rejects empty question', () => {
    const input = { type: 'human.interact', sessionId: 's', question: '', timestamp: NOW };
    expect(() => HumanInteractEventSchema.parse(input)).toThrow();
  });

  it('rejects invalid timestamp', () => {
    const input = { type: 'human.interact', sessionId: 's', question: 'q', timestamp: 'not-a-date' };
    expect(() => HumanInteractEventSchema.parse(input)).toThrow();
  });
});

describe('HumanResponseEventSchema', () => {
  it('accepts a valid response event', () => {
    const input = { type: 'human.response', sessionId: 'sess-1', response: 'Yes', timestamp: NOW };
    expect(HumanResponseEventSchema.parse(input)).toEqual(input);
  });

  it('rejects empty response', () => {
    const input = { type: 'human.response', sessionId: 's', response: '', timestamp: NOW };
    expect(() => HumanResponseEventSchema.parse(input)).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => HumanResponseEventSchema.parse({ type: 'human.response' })).toThrow();
  });
});

describe('HumanGuidanceEventSchema', () => {
  it('accepts a valid guidance event', () => {
    const input = { type: 'human.guidance', sessionId: 'sess-1', guidance: 'Focus on auth', timestamp: NOW };
    expect(HumanGuidanceEventSchema.parse(input)).toEqual(input);
  });

  it('rejects empty guidance', () => {
    const input = { type: 'human.guidance', sessionId: 's', guidance: '', timestamp: NOW };
    expect(() => HumanGuidanceEventSchema.parse(input)).toThrow();
  });
});

describe('HumanEventSchema (discriminated union)', () => {
  it('parses interact events', () => {
    const input = { type: 'human.interact', sessionId: 's', question: 'q', timestamp: NOW };
    expect(HumanEventSchema.parse(input).type).toBe('human.interact');
  });

  it('parses response events', () => {
    const input = { type: 'human.response', sessionId: 's', response: 'r', timestamp: NOW };
    expect(HumanEventSchema.parse(input).type).toBe('human.response');
  });

  it('parses guidance events', () => {
    const input = { type: 'human.guidance', sessionId: 's', guidance: 'g', timestamp: NOW };
    expect(HumanEventSchema.parse(input).type).toBe('human.guidance');
  });

  it('rejects unknown event types', () => {
    const input = { type: 'human.unknown', sessionId: 's', timestamp: NOW };
    expect(() => HumanEventSchema.parse(input)).toThrow();
  });
});
