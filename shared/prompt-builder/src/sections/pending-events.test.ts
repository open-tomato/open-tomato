import type { PendingEvent, PromptContext } from '../types/index.js';

import { describe, expect, it } from 'vitest';

import { PendingEventsSection } from './pending-events.js';

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

function makeContext(pendingEvents: PendingEvent[]): PromptContext {
  return { pendingEvents } as PromptContext;
}

// ─── PendingEventsSection ─────────────────────────────────────────────────────

describe('PendingEventsSection', () => {
  const section = new PendingEventsSection();

  it('has the correct section name', () => {
    expect(section.name).toBe('pending-events');
  });

  it('returns an empty string when pendingEvents is empty', () => {
    expect(section.render(makeContext([]))).toBe('');
  });

  it('renders the section header', () => {
    const result = section.render(makeContext([makeEvent()]));
    expect(result).toContain('## PENDING EVENTS');
  });

  it('includes the mandatory prefix', () => {
    const result = section.render(makeContext([makeEvent()]));
    expect(result).toContain('You MUST handle the following events:');
  });

  it('renders a single event as item 1', () => {
    const event = makeEvent({ topic: 'user-input', forHatId: 'planner', payload: { message: 'Hi' } });
    const result = section.render(makeContext([event]));
    expect(result).toContain('1. [user-input] → hat:planner');
  });

  it('includes the JSON-serialised payload', () => {
    const event = makeEvent({ payload: { key: 'value' } });
    const result = section.render(makeContext([event]));
    expect(result).toContain('{"key":"value"}');
  });

  it('renders multiple events as a numbered list', () => {
    const events = [
      makeEvent({ id: 'e1', topic: 'topic-a', forHatId: 'hat-a', payload: 1 }),
      makeEvent({ id: 'e2', topic: 'topic-b', forHatId: 'hat-b', payload: 2 }),
      makeEvent({ id: 'e3', topic: 'topic-c', forHatId: 'hat-c', payload: 3 }),
    ];
    const result = section.render(makeContext(events));
    expect(result).toContain('1. [topic-a] → hat:hat-a | 1');
    expect(result).toContain('2. [topic-b] → hat:hat-b | 2');
    expect(result).toContain('3. [topic-c] → hat:hat-c | 3');
  });

  it('separates header, prefix, and list with blank lines', () => {
    const event = makeEvent({ topic: 'ping', forHatId: 'runner', payload: null });
    const result = section.render(makeContext([event]));
    expect(result).toBe(
      '## PENDING EVENTS\n\nYou MUST handle the following events:\n\n1. [ping] → hat:runner | null',
    );
  });

  it('renders list items separated by newlines (not blank lines)', () => {
    const events = [
      makeEvent({ id: 'e1', topic: 'a', forHatId: 'h1', payload: 0 }),
      makeEvent({ id: 'e2', topic: 'b', forHatId: 'h2', payload: 0 }),
    ];
    const result = section.render(makeContext(events));
    expect(result).toContain('1. [a] → hat:h1 | 0\n2. [b] → hat:h2 | 0');
  });

  it('handles events with complex payloads', () => {
    const payload = { nested: { key: 'val' }, arr: [1, 2] };
    const event = makeEvent({ payload });
    const result = section.render(makeContext([event]));
    expect(result).toContain(JSON.stringify(payload));
  });

  it('does not throw and renders [unserializable] for a circular-reference payload', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const event = makeEvent({ payload: circular });
    expect(() => section.render(makeContext([event]))).not.toThrow();
    expect(section.render(makeContext([event]))).toContain('[unserializable]');
  });

  it('produces identical output on successive calls with the same context', () => {
    const context = makeContext([makeEvent()]);
    expect(section.render(context)).toBe(section.render(context));
  });
});
