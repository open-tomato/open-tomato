import { describe, expect, it } from 'bun:test';

import { BUILD_BLOCKED_TOPIC, synthesizeBlockedEvent } from './build-evidence';

describe('synthesizeBlockedEvent', () => {
  it('sets the correct topic', () => {
    const event = synthesizeBlockedEvent('task-1', { tests: 'fail' });
    expect(event.topic).toBe(BUILD_BLOCKED_TOPIC);
  });

  it('includes the provided task ID', () => {
    const event = synthesizeBlockedEvent('task-abc', { lint: 'fail' });
    expect(event.taskId).toBe('task-abc');
  });

  it('includes a timestamp in ISO-8601 format', () => {
    const event = synthesizeBlockedEvent('task-1', { tests: 'fail' });
    expect(() => new Date(event.timestamp)).not.toThrow();
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps a single failing tests field into failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', { tests: 'fail' });
    expect(event.failingFields).toEqual(['tests']);
  });

  it('maps a single failing lint field into failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', { lint: 'fail' });
    expect(event.failingFields).toEqual(['lint']);
  });

  it('maps a single failing typecheck field into failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', { typecheck: 'fail' });
    expect(event.failingFields).toEqual(['typecheck']);
  });

  it('maps multiple failing fields into failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', {
      tests: 'fail',
      lint: 'fail',
      typecheck: 'fail',
    });
    expect(event.failingFields).toEqual(['tests', 'lint', 'typecheck']);
  });

  it('does not include passing fields in failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', {
      tests: 'pass',
      lint: 'fail',
      typecheck: 'pass',
    });
    expect(event.failingFields).toEqual(['lint']);
    expect(event.failingFields).not.toContain('tests');
    expect(event.failingFields).not.toContain('typecheck');
  });

  it('does not include skipped fields in failingFields', () => {
    const event = synthesizeBlockedEvent('task-1', {
      tests: 'skip',
      lint: 'fail',
      typecheck: 'skip',
    });
    expect(event.failingFields).toEqual(['lint']);
    expect(event.failingFields).not.toContain('tests');
    expect(event.failingFields).not.toContain('typecheck');
  });

  it('returns empty failingFields when no fields are failing', () => {
    const event = synthesizeBlockedEvent('task-1', {
      tests: 'pass',
      lint: 'pass',
      typecheck: 'pass',
    });
    expect(event.failingFields).toEqual([]);
  });

  it('returns empty failingFields for empty evidence', () => {
    const event = synthesizeBlockedEvent('task-1', {});
    expect(event.failingFields).toEqual([]);
  });
});
