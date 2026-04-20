import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateLoopComplete } from '../src/loop-termination';
import { TaskStore } from '../src/task-store';

const LOOP_ID = 'loop-test';

function makeInput(key: string) {
  return { key, title: key, description: key, priority: 1 as const, blocked_by: [], loop_id: LOOP_ID };
}

describe('validateLoopComplete', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loop-term-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns accepted: true when there are no tasks at all', async () => {
    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns accepted: true when all tasks are Closed', async () => {
    const t1 = await store.ensure(makeInput('k1'));
    const t2 = await store.ensure(makeInput('k2'));
    await store.transition(t1.id, 'InProgress');
    await store.transition(t1.id, 'Closed');
    await store.transition(t2.id, 'InProgress');
    await store.transition(t2.id, 'Closed');

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(true);
  });

  it('returns accepted: true when all tasks are Failed', async () => {
    const t1 = await store.ensure(makeInput('k1'));
    const t2 = await store.ensure(makeInput('k2'));
    await store.transition(t1.id, 'Failed');
    await store.transition(t2.id, 'Failed');

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(true);
  });

  it('returns accepted: true when mix of Closed and Failed', async () => {
    const t1 = await store.ensure(makeInput('k1'));
    const t2 = await store.ensure(makeInput('k2'));
    await store.transition(t1.id, 'InProgress');
    await store.transition(t1.id, 'Closed');
    await store.transition(t2.id, 'Failed');

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(true);
  });

  it('returns accepted: false with reason when one task is Open', async () => {
    await store.ensure(makeInput('k1'));

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain(LOOP_ID);
  });

  it('returns accepted: false with reason when one task is InProgress', async () => {
    const t1 = await store.ensure(makeInput('k1'));
    await store.transition(t1.id, 'InProgress');

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain(LOOP_ID);
  });

  it('ignores tasks from other loops', async () => {
    // Task in a different loop still Open — must not affect LOOP_ID result
    await store.ensure({ key: 'other', title: 'Other', description: 'other', priority: 1, blocked_by: [], loop_id: 'other-loop' });
    const t1 = await store.ensure(makeInput('k1'));
    await store.transition(t1.id, 'InProgress');
    await store.transition(t1.id, 'Closed');

    const result = await validateLoopComplete(LOOP_ID, store);
    expect(result.accepted).toBe(true);
  });
});
