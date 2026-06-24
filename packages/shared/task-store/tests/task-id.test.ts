import { describe, expect, it } from 'vitest';

import { generateTaskId } from '../src/task-id';

describe('generateTaskId', () => {
  it('matches the expected format task-{timestamp}-{4-char hex}', () => {
    const id = generateTaskId();
    expect(id).toMatch(/^task-\d+-[0-9a-f]{4}$/);
  });

  it('has a timestamp component that is a recent unix millisecond timestamp', () => {
    const before = Date.now();
    const id = generateTaskId();
    const after = Date.now();
     
    const timestamp = parseInt(id.split('-')[1]!, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('produces no collisions across 1000 rapid sequential calls', () => {
    const ids = Array.from({ length: 1000 }, () => generateTaskId());
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('resets counter when the millisecond changes', async () => {
    // Force a timestamp boundary by waiting for at least 1ms
    await new Promise((resolve) => setTimeout(resolve, 2));
    const id1 = generateTaskId();
    await new Promise((resolve) => setTimeout(resolve, 2));
    const id2 = generateTaskId();
    const suffix1 = id1.split('-')[2];
    const suffix2 = id2.split('-')[2];
    expect(suffix1).toBe('0000');
    expect(suffix2).toBe('0000');
  });
});
