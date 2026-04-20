import type { PendingEvent } from '@open-tomato/types';

import { describe, expect, it } from 'vitest';

import { PendingEventFormatter } from './pending-event-formatter.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides?: Partial<PendingEvent>): PendingEvent {
  return {
    id: 'evt-1',
    topic: 'user-input',
    payload: { message: 'Hello' },
    forHatId: 'planner',
    ...overrides,
  };
}

// ─── PendingEventFormatter ────────────────────────────────────────────────────

describe('PendingEventFormatter', () => {
  const formatter = new PendingEventFormatter();

  describe('formatItem', () => {
    it('renders topic, forHatId, and JSON payload', () => {
      const event = makeEvent({ topic: 'user-input', forHatId: 'planner', payload: { message: 'Hi' } });
      expect(formatter.formatItem(event, 1)).toBe('1. [user-input] → hat:planner | {"message":"Hi"}');
    });

    it('uses the supplied index in the output', () => {
      const event = makeEvent();
      expect(formatter.formatItem(event, 5)).toMatch(/^5\./);
    });

    it('serialises a primitive payload', () => {
      const event = makeEvent({ payload: 42 });
      expect(formatter.formatItem(event, 1)).toContain('| 42');
    });

    it('serialises a null payload', () => {
      const event = makeEvent({ payload: null });
      expect(formatter.formatItem(event, 1)).toContain('| null');
    });

    it('serialises a complex nested payload', () => {
      const payload = { nested: { key: 'val' }, arr: [1, 2] };
      const event = makeEvent({ payload });
      expect(formatter.formatItem(event, 1)).toContain(JSON.stringify(payload));
    });

    it('does not throw and returns [unserializable] for a circular-reference payload', () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;
      const event = makeEvent({ payload: circular });
      expect(() => formatter.formatItem(event, 1)).not.toThrow();
      expect(formatter.formatItem(event, 1)).toContain('[unserializable]');
    });
  });

  describe('format', () => {
    it('returns an empty string when events is empty', () => {
      expect(formatter.format([])).toBe('');
    });

    it('includes the section header for a non-empty list', () => {
      const result = formatter.format([makeEvent()]);
      expect(result).toContain('## PENDING EVENTS');
    });

    it('includes the mandatory preamble for a non-empty list', () => {
      const result = formatter.format([makeEvent()]);
      expect(result).toContain('You MUST handle the following events:');
    });

    it('renders a single event as item 1', () => {
      const event = makeEvent({ topic: 'ping', forHatId: 'runner', payload: null });
      const result = formatter.format([event]);
      expect(result).toContain('1. [ping] → hat:runner | null');
    });

    it('renders multiple events as a numbered list', () => {
      const events = [
        makeEvent({ id: 'e1', topic: 'topic-a', forHatId: 'hat-a', payload: 1 }),
        makeEvent({ id: 'e2', topic: 'topic-b', forHatId: 'hat-b', payload: 2 }),
        makeEvent({ id: 'e3', topic: 'topic-c', forHatId: 'hat-c', payload: 3 }),
      ];
      const result = formatter.format(events);
      expect(result).toContain('1. [topic-a] → hat:hat-a | 1');
      expect(result).toContain('2. [topic-b] → hat:hat-b | 2');
      expect(result).toContain('3. [topic-c] → hat:hat-c | 3');
    });

    it('separates header, preamble, and list with blank lines', () => {
      const event = makeEvent({ topic: 'ping', forHatId: 'runner', payload: null });
      expect(formatter.format([event])).toBe(
        '## PENDING EVENTS\n\nYou MUST handle the following events:\n\n1. [ping] → hat:runner | null',
      );
    });

    it('separates list items with single newlines (not blank lines)', () => {
      const events = [
        makeEvent({ id: 'e1', topic: 'a', forHatId: 'h1', payload: 0 }),
        makeEvent({ id: 'e2', topic: 'b', forHatId: 'h2', payload: 0 }),
      ];
      const result = formatter.format(events);
      expect(result).toContain('1. [a] → hat:h1 | 0\n2. [b] → hat:h2 | 0');
    });

    it('produces identical output on successive calls with the same input', () => {
      const events = [makeEvent()];
      expect(formatter.format(events)).toBe(formatter.format(events));
    });
  });
});
