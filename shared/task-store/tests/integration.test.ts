import type { CreateTaskInput, Task } from '../src/types';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TaskStore } from '../src/task-store';
import { TaskStatus } from '../src/types';

const LOOP_ID = 'loop-integration';

function makeInput(key: string, overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    key,
    title: `Task ${key}`,
    description: `Description for ${key}`,
    priority: 1,
    blocked_by: [],
    loop_id: LOOP_ID,
    ...overrides,
  };
}

async function closeTask(store: TaskStore, task: Task): Promise<void> {
  await store.transition(task.id, 'InProgress');
  await store.transition(task.id, 'Closed');
}

describe('Integration — full dependency graph T1→T2→T3→T4, T1→T5', () => {
  let tmpDir: string;
  let store: TaskStore;

  let t1: Task;
  let t2: Task;
  let t3: Task;
  let t4: Task;
  let t5: Task;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-integration-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });

    // Create tasks in dependency order but without blockers initially so IDs
    // are available for cross-referencing.
    t1 = await store.ensure(makeInput('t1'));
    t2 = await store.ensure(makeInput('t2', { blocked_by: [t1.id] }));
    t3 = await store.ensure(makeInput('t3', { blocked_by: [t2.id] }));
    t4 = await store.ensure(makeInput('t4', { blocked_by: [t3.id] }));
    t5 = await store.ensure(makeInput('t5', { blocked_by: [t1.id] }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('stage 0 — initial state: only T1 is ready, all tasks pending', async () => {
    expect(await store.ready(t1.id)).toBe(true);
    expect(await store.ready(t2.id)).toBe(false);
    expect(await store.ready(t3.id)).toBe(false);
    expect(await store.ready(t4.id)).toBe(false);
    expect(await store.ready(t5.id)).toBe(false);

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks.map((t) => t.id)).toEqual([t1.id]);
  });

  it('stage 1 — T1 InProgress: T1 no longer ready, T2/T5 still blocked', async () => {
    await store.transition(t1.id, 'InProgress');

    expect(await store.ready(t1.id)).toBe(false); // InProgress, not Open
    expect(await store.ready(t2.id)).toBe(false); // T1 not Closed
    expect(await store.ready(t5.id)).toBe(false); // T1 not Closed

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks).toHaveLength(0);
  });

  it('stage 2 — T1 Closed: T2 and T5 become ready', async () => {
    await closeTask(store, t1);

    expect(await store.ready(t1.id)).toBe(false); // Closed terminal
    expect(await store.ready(t2.id)).toBe(true);  // T1 is Closed
    expect(await store.ready(t3.id)).toBe(false); // T2 not Closed
    expect(await store.ready(t4.id)).toBe(false); // T3 not Closed
    expect(await store.ready(t5.id)).toBe(true);  // T1 is Closed

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks.map((t) => t.id)).toEqual(expect.arrayContaining([t2.id, t5.id]));
    expect(readyTasks).toHaveLength(2);
  });

  it('stage 3 — T2 InProgress: T2 not ready, T5 still ready, T3 still blocked', async () => {
    await closeTask(store, t1);
    await store.transition(t2.id, 'InProgress');

    expect(await store.ready(t2.id)).toBe(false); // InProgress
    expect(await store.ready(t3.id)).toBe(false); // T2 not Closed
    expect(await store.ready(t5.id)).toBe(true);  // T1 is Closed

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks.map((t) => t.id)).toEqual([t5.id]);
  });

  it('stage 4 — T2 Closed: T3 becomes ready, T5 still ready', async () => {
    await closeTask(store, t1);
    await closeTask(store, t2);

    expect(await store.ready(t3.id)).toBe(true);  // T2 is Closed
    expect(await store.ready(t4.id)).toBe(false); // T3 not Closed
    expect(await store.ready(t5.id)).toBe(true);  // T1 is Closed

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks.map((t) => t.id)).toEqual(expect.arrayContaining([t3.id, t5.id]));
    expect(readyTasks).toHaveLength(2);
  });

  it('stage 5 — T3 Closed: T4 becomes ready', async () => {
    await closeTask(store, t1);
    await closeTask(store, t2);
    await closeTask(store, t3);

    expect(await store.ready(t4.id)).toBe(true);  // T3 is Closed
    expect(await store.ready(t5.id)).toBe(true);  // T1 is Closed

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks.map((t) => t.id)).toEqual(expect.arrayContaining([t4.id, t5.id]));
    expect(readyTasks).toHaveLength(2);
  });

  it('stage 6 — T4 and T5 Closed: no pending tasks remain', async () => {
    await closeTask(store, t1);
    await closeTask(store, t2);
    await closeTask(store, t3);
    await closeTask(store, t4);
    await closeTask(store, t5);

    expect(await store.ready(t1.id)).toBe(false);
    expect(await store.ready(t2.id)).toBe(false);
    expect(await store.ready(t3.id)).toBe(false);
    expect(await store.ready(t4.id)).toBe(false);
    expect(await store.ready(t5.id)).toBe(false);

    expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);

    const readyTasks = await store.getReady(LOOP_ID);
    expect(readyTasks).toHaveLength(0);
  });

  it('all task statuses are correct at final state', async () => {
    await closeTask(store, t1);
    await closeTask(store, t2);
    await closeTask(store, t3);
    await closeTask(store, t4);
    await closeTask(store, t5);

    const all = await store.readAll();
    const byId = new Map(all.map((t) => [t.id, t]));

    expect(byId.get(t1.id)?.status).toBe(TaskStatus.Closed);
    expect(byId.get(t2.id)?.status).toBe(TaskStatus.Closed);
    expect(byId.get(t3.id)?.status).toBe(TaskStatus.Closed);
    expect(byId.get(t4.id)?.status).toBe(TaskStatus.Closed);
    expect(byId.get(t5.id)?.status).toBe(TaskStatus.Closed);
  });
});

describe('Integration — store restart restores full state', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-restart-'));
    filePath = join(tmpDir, 'tasks.jsonl');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('restores task count, IDs, statuses, and timestamps after re-instantiation', async () => {
    // --- Phase 1: populate state with the first store instance ---
    const store1 = new TaskStore({ filePath });

    const ta = await store1.ensure(makeInput('restart-a', { loop_id: 'loop-restart' }));
    const tb = await store1.ensure(makeInput('restart-b', { loop_id: 'loop-restart', blocked_by: [ta.id] }));
    await store1.ensure(makeInput('restart-c', { loop_id: 'loop-restart', blocked_by: [ta.id] }));

    // Advance ta through InProgress → Closed; leave tb InProgress, tc Open.
    await store1.transition(ta.id, 'InProgress');
    await store1.transition(ta.id, 'Closed');
    await store1.transition(tb.id, 'InProgress');

    const originalAll = await store1.readAll();
    const originalById = new Map(originalAll.map((t) => [t.id, t]));

    // --- Phase 2: restart — new store instance, same file ---
    const store2 = new TaskStore({ filePath });
    const restoredAll = await store2.readAll();

    expect(restoredAll).toHaveLength(originalAll.length);

    const restoredById = new Map(restoredAll.map((t) => [t.id, t]));

    // Every task present in the original snapshot must be identical after reload.
    for (const [id, original] of originalById) {
      const restored = restoredById.get(id);
      expect(restored, `task ${id} must be present after restart`).toBeDefined();
      expect(restored).toStrictEqual(original);
    }
  });

  it('ready() and hasPendingTasks() return correct values after restart', async () => {
    const store1 = new TaskStore({ filePath });

    const loopId = 'loop-restart-2';
    const ta = await store1.ensure(makeInput('ra', { loop_id: loopId }));
    const tb = await store1.ensure(makeInput('rb', { loop_id: loopId, blocked_by: [ta.id] }));

    await store1.transition(ta.id, 'InProgress');
    await store1.transition(ta.id, 'Closed');

    // --- Restart ---
    const store2 = new TaskStore({ filePath });

    expect(await store2.ready(ta.id)).toBe(false);  // Closed — not Open
    expect(await store2.ready(tb.id)).toBe(true);   // Open with all blockers Closed
    expect(await store2.hasPendingTasks(loopId)).toBe(true); // tb still Open
  });

  it('ensure() with existing key after restart updates without duplicating', async () => {
    const store1 = new TaskStore({ filePath });
    const loopId = 'loop-restart-3';

    const original = await store1.ensure(makeInput('rkey', { loop_id: loopId }));

    // --- Restart ---
    const store2 = new TaskStore({ filePath });

    // Re-ensure with same key but updated title.
    const updated = await store2.ensure({
      key: 'rkey',
      title: 'Updated Title',
      description: 'Updated description',
      priority: 2,
      loop_id: loopId,
      blocked_by: [],
    });

    expect(updated.id).toBe(original.id);           // same ID preserved
    expect(updated.created_at).toBe(original.created_at); // created_at unchanged
    expect(updated.status).toBe(TaskStatus.Open);   // status unchanged
    expect(updated.title).toBe('Updated Title');

    const all = await store2.readAll();
    const keyed = all.filter((t) => t.key === 'rkey');
    expect(keyed).toHaveLength(1);                   // no duplicate created
  });
});

describe('Integration — concurrent ensure() calls with the same key', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-concurrent-'));
    filePath = join(tmpDir, 'tasks.jsonl');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('two concurrent ensure() calls with the same key produce exactly one task', async () => {
    const store = new TaskStore({ filePath });
    const input = makeInput('concurrent-key', { loop_id: 'loop-concurrent' });

    // Fire both calls simultaneously — the exclusive lock serialises them.
    const [result1, result2] = await Promise.all([
      store.ensure(input),
      store.ensure(input),
    ]);

    // Both calls must return the same task ID.
    expect(result1.id).toBe(result2.id);

    // Only one task must be present in the store.
    const all = await store.readAll();
    const matching = all.filter((t) => t.key === 'concurrent-key');
    expect(matching).toHaveLength(1);
  });

  it('concurrent ensure() calls from separate store instances produce exactly one task', async () => {
    const storeA = new TaskStore({ filePath });
    const storeB = new TaskStore({ filePath });
    const input = makeInput('shared-key', { loop_id: 'loop-concurrent-2' });

    const [resultA, resultB] = await Promise.all([
      storeA.ensure(input),
      storeB.ensure(input),
    ]);

    // Both instances must resolve to the same task ID.
    expect(resultA.id).toBe(resultB.id);

    // The file must contain exactly one task with this key.
    const verifyStore = new TaskStore({ filePath });
    const all = await verifyStore.readAll();
    const matching = all.filter((t) => t.key === 'shared-key');
    expect(matching).toHaveLength(1);
  });
});
