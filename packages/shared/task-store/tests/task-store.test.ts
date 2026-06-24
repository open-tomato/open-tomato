import type { CreateTaskInput } from '../src/types';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InvalidTransitionError, TaskNotFoundError } from '../src/errors';
import { TaskStore } from '../src/task-store';
import { TaskStatus } from '../src/types';

const LOOP_ID = 'loop-001';

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

describe('TaskStore.ensure()', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-ensure-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('first call — task creation', () => {
    it('creates a new task when the key does not exist', async () => {
      const task = await store.ensure(makeInput('new-task'));

      expect(task.key).toBe('new-task');
      expect(task.title).toBe('Task new-task');
      expect(task.description).toBe('Description for new-task');
      expect(task.priority).toBe(1);
      expect(task.blocked_by).toEqual([]);
      expect(task.loop_id).toBe(LOOP_ID);
    });

    it('assigns a generated id in the expected format', async () => {
      const task = await store.ensure(makeInput('id-check'));

      expect(task.id).toMatch(/^task-\d+-[0-9a-f]{4}$/);
    });

    it('sets status to Open', async () => {
      const task = await store.ensure(makeInput('status-check'));

      expect(task.status).toBe(TaskStatus.Open);
    });

    it('sets created_at to an ISO timestamp', async () => {
      const before = new Date().toISOString();
      const task = await store.ensure(makeInput('timestamp-check'));
      const after = new Date().toISOString();

      expect(task.created_at >= before).toBe(true);
      expect(task.created_at <= after).toBe(true);
    });

    it('does not set started_at or closed_at on creation', async () => {
      const task = await store.ensure(makeInput('no-dates'));

      expect(task.started_at).toBeUndefined();
      expect(task.closed_at).toBeUndefined();
    });

    it('persists the task so readAll returns it', async () => {
      const created = await store.ensure(makeInput('persist-check'));
      const all = await store.readAll();

      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(created);
    });
  });

  describe('second call — idempotency with same key', () => {
    it('returns the existing task without creating a duplicate', async () => {
      await store.ensure(makeInput('idempotent-key'));
      await store.ensure(makeInput('idempotent-key'));

      const all = await store.readAll();
      expect(all).toHaveLength(1);
    });

    it('returns an object with the same id as the first call', async () => {
      const first = await store.ensure(makeInput('same-id-check'));
      const second = await store.ensure(makeInput('same-id-check'));

      expect(second.id).toBe(first.id);
    });

    it('preserves created_at from the original task', async () => {
      const first = await store.ensure(makeInput('preserve-created'));
      const second = await store.ensure(makeInput('preserve-created'));

      expect(second.created_at).toBe(first.created_at);
    });

    it('preserves the current status (does not reset to Open)', async () => {
      const first = await store.ensure(makeInput('preserve-status'));
      await store.transition(first.id, 'InProgress');

      const second = await store.ensure(makeInput('preserve-status'));

      expect(second.status).toBe(TaskStatus.InProgress);
    });

    it('updates mutable fields (title, description, priority, blocked_by, loop_id)', async () => {
      await store.ensure(makeInput('mutable-fields'));

      const updated = await store.ensure(
        makeInput('mutable-fields', {
          title: 'Updated Title',
          description: 'Updated description',
          priority: 3,
          blocked_by: ['task-1718000000000-0001'],
          loop_id: 'loop-002',
        }),
      );

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe(3);
      expect(updated.blocked_by).toEqual(['task-1718000000000-0001']);
      expect(updated.loop_id).toBe('loop-002');
    });

    it('persists updated mutable fields so readAll reflects them', async () => {
      await store.ensure(makeInput('persisted-update'));
      await store.ensure(makeInput('persisted-update', { title: 'New Title', description: 'New desc' }));

      const all = await store.readAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.title).toBe('New Title');
      expect(all[0]!.description).toBe('New desc');
    });
  });

  describe('multiple distinct keys', () => {
    it('creates separate tasks for different keys', async () => {
      await store.ensure(makeInput('key-a'));
      await store.ensure(makeInput('key-b'));
      await store.ensure(makeInput('key-c'));

      const all = await store.readAll();
      expect(all).toHaveLength(3);
      expect(all.map((t) => t.key)).toEqual(['key-a', 'key-b', 'key-c']);
    });

    it('ensures on key-a does not affect task created for key-b', async () => {
      const taskA = await store.ensure(makeInput('key-a'));
      await store.ensure(makeInput('key-b'));
      const taskAAgain = await store.ensure(makeInput('key-a', { title: 'Updated A' }));

      const all = await store.readAll();
      const taskB = all.find((t) => t.key === 'key-b')!;

      expect(taskAAgain.id).toBe(taskA.id);
      expect(taskB.title).toBe('Task key-b');
    });
  });
});

describe('TaskStore.transition()', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-transition-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function createTask(key = 'task-a'): Promise<string> {
    const task = await store.ensure(makeInput(key));
    return task.id;
  }

  describe('valid transitions — succeed', () => {
    it('Open → InProgress', async () => {
      const id = await createTask('open-to-inprogress');
      const result = await store.transition(id, 'InProgress');
      expect(result.status).toBe(TaskStatus.InProgress);
    });

    it('Open → Failed', async () => {
      const id = await createTask('open-to-failed');
      const result = await store.transition(id, 'Failed');
      expect(result.status).toBe(TaskStatus.Failed);
    });

    it('InProgress → Closed', async () => {
      const id = await createTask('inprogress-to-closed');
      await store.transition(id, 'InProgress');
      const result = await store.transition(id, 'Closed');
      expect(result.status).toBe(TaskStatus.Closed);
    });

    it('InProgress → Failed', async () => {
      const id = await createTask('inprogress-to-failed');
      await store.transition(id, 'InProgress');
      const result = await store.transition(id, 'Failed');
      expect(result.status).toBe(TaskStatus.Failed);
    });

    it('persists the new status so readAll reflects it', async () => {
      const id = await createTask('persist-status');
      await store.transition(id, 'InProgress');

      const all = await store.readAll();
      expect(all.find((t) => t.id === id)?.status).toBe(TaskStatus.InProgress);
    });

    it('returns the updated task object', async () => {
      const id = await createTask('returns-updated');
      const result = await store.transition(id, 'InProgress');

      expect(result.id).toBe(id);
      expect(result.status).toBe(TaskStatus.InProgress);
    });
  });

  describe('invalid transitions — throw InvalidTransitionError', () => {
    it('Open → Closed throws', async () => {
      const id = await createTask('open-to-closed');
      await expect(store.transition(id, 'Closed')).rejects.toThrow(InvalidTransitionError);
    });

    it('Closed → InProgress throws', async () => {
      const id = await createTask('closed-to-inprogress');
      await store.transition(id, 'InProgress');
      await store.transition(id, 'Closed');
      await expect(store.transition(id, 'InProgress')).rejects.toThrow(InvalidTransitionError);
    });

    it('Closed → Failed throws', async () => {
      const id = await createTask('closed-to-failed');
      await store.transition(id, 'InProgress');
      await store.transition(id, 'Closed');
      await expect(store.transition(id, 'Failed')).rejects.toThrow(InvalidTransitionError);
    });

    it('Failed → InProgress throws', async () => {
      const id = await createTask('failed-to-inprogress');
      await store.transition(id, 'Failed');
      await expect(store.transition(id, 'InProgress')).rejects.toThrow(InvalidTransitionError);
    });

    it('Failed → Closed throws', async () => {
      const id = await createTask('failed-to-closed');
      await store.transition(id, 'Failed');
      await expect(store.transition(id, 'Closed')).rejects.toThrow(InvalidTransitionError);
    });

    it('error carries taskId, fromStatus, toStatus', async () => {
      const id = await createTask('error-fields');
      let caught: InvalidTransitionError | undefined;
      try {
        await store.transition(id, 'Closed');
      } catch (e) {
        caught = e as InvalidTransitionError;
      }
      expect(caught).toBeInstanceOf(InvalidTransitionError);
      expect(caught?.taskId).toBe(id);
      expect(caught?.fromStatus).toBe(TaskStatus.Open);
      expect(caught?.toStatus).toBe(TaskStatus.Closed);
    });
  });

  describe('unknown task id — throws TaskNotFoundError', () => {
    it('throws when the id does not exist', async () => {
      await expect(store.transition('task-0000000000000-ffff', 'InProgress')).rejects.toThrow(
        TaskNotFoundError,
      );
    });
  });

  describe('timestamps', () => {
    it('sets started_at when transitioning to InProgress', async () => {
      const before = new Date().toISOString();
      const id = await createTask('started-at');
      const result = await store.transition(id, 'InProgress');
      const after = new Date().toISOString();

      expect(result.started_at).toBeDefined();
      expect(result.started_at! >= before).toBe(true);
      expect(result.started_at! <= after).toBe(true);
    });

    it('does not set closed_at when transitioning to InProgress', async () => {
      const id = await createTask('no-closed-at-inprogress');
      const result = await store.transition(id, 'InProgress');
      expect(result.closed_at).toBeUndefined();
    });

    it('sets closed_at when transitioning to Closed', async () => {
      const before = new Date().toISOString();
      const id = await createTask('closed-at');
      await store.transition(id, 'InProgress');
      const result = await store.transition(id, 'Closed');
      const after = new Date().toISOString();

      expect(result.closed_at).toBeDefined();
      expect(result.closed_at! >= before).toBe(true);
      expect(result.closed_at! <= after).toBe(true);
    });

    it('sets closed_at when transitioning to Failed', async () => {
      const before = new Date().toISOString();
      const id = await createTask('failed-at');
      const result = await store.transition(id, 'Failed');
      const after = new Date().toISOString();

      expect(result.closed_at).toBeDefined();
      expect(result.closed_at! >= before).toBe(true);
      expect(result.closed_at! <= after).toBe(true);
    });

    it('does not set started_at when transitioning to Failed from Open', async () => {
      const id = await createTask('no-started-at-failed');
      const result = await store.transition(id, 'Failed');
      expect(result.started_at).toBeUndefined();
    });

    it('preserves started_at when transitioning from InProgress to Closed', async () => {
      const id = await createTask('preserve-started-at');
      const inProgress = await store.transition(id, 'InProgress');
      const closed = await store.transition(id, 'Closed');

      expect(closed.started_at).toBe(inProgress.started_at);
    });

    it('persists timestamps so readAll reflects them', async () => {
      const id = await createTask('persist-timestamps');
      const result = await store.transition(id, 'InProgress');

      const all = await store.readAll();
      const persisted = all.find((t) => t.id === id);
      expect(persisted?.started_at).toBe(result.started_at);
    });
  });
});

describe('TaskStore.ready()', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-ready-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('no blockers', () => {
    it('returns true for an Open task with an empty blocked_by list', async () => {
      const task = await store.ensure(makeInput('unblocked'));
      expect(await store.ready(task.id)).toBe(true);
    });

    it('returns false for a non-existent id', async () => {
      expect(await store.ready('task-0000000000000-ffff')).toBe(false);
    });

    it('returns false for an InProgress task with no blockers', async () => {
      const task = await store.ensure(makeInput('inprogress-no-blockers'));
      await store.transition(task.id, 'InProgress');
      expect(await store.ready(task.id)).toBe(false);
    });

    it('returns false for a Closed task with no blockers', async () => {
      const task = await store.ensure(makeInput('closed-no-blockers'));
      await store.transition(task.id, 'InProgress');
      await store.transition(task.id, 'Closed');
      expect(await store.ready(task.id)).toBe(false);
    });

    it('returns false for a Failed task with no blockers', async () => {
      const task = await store.ensure(makeInput('failed-no-blockers'));
      await store.transition(task.id, 'Failed');
      expect(await store.ready(task.id)).toBe(false);
    });
  });

  describe('blocked by a non-Closed task', () => {
    it('returns false when blocker is Open', async () => {
      const blocker = await store.ensure(makeInput('blocker-open'));
      const dependent = await store.ensure(
        makeInput('dependent-blocker-open', { blocked_by: [blocker.id] }),
      );
      expect(await store.ready(dependent.id)).toBe(false);
    });

    it('returns false when blocker is InProgress', async () => {
      const blocker = await store.ensure(makeInput('blocker-inprogress'));
      await store.transition(blocker.id, 'InProgress');
      const dependent = await store.ensure(
        makeInput('dependent-blocker-inprogress', { blocked_by: [blocker.id] }),
      );
      expect(await store.ready(dependent.id)).toBe(false);
    });

    it('returns true once the blocker transitions to Closed', async () => {
      const blocker = await store.ensure(makeInput('blocker-transitions'));
      const dependent = await store.ensure(
        makeInput('dependent-blocker-transitions', { blocked_by: [blocker.id] }),
      );

      expect(await store.ready(dependent.id)).toBe(false);

      await store.transition(blocker.id, 'InProgress');
      await store.transition(blocker.id, 'Closed');

      expect(await store.ready(dependent.id)).toBe(true);
    });

    it('returns false when one of several blockers is not Closed', async () => {
      const closed = await store.ensure(makeInput('blocker-closed-one'));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      const open = await store.ensure(makeInput('blocker-open-one'));

      const dependent = await store.ensure(
        makeInput('dependent-partial', { blocked_by: [closed.id, open.id] }),
      );

      expect(await store.ready(dependent.id)).toBe(false);
    });

    it('returns true when all blockers are Closed', async () => {
      const b1 = await store.ensure(makeInput('blocker-all-closed-1'));
      await store.transition(b1.id, 'InProgress');
      await store.transition(b1.id, 'Closed');

      const b2 = await store.ensure(makeInput('blocker-all-closed-2'));
      await store.transition(b2.id, 'InProgress');
      await store.transition(b2.id, 'Closed');

      const dependent = await store.ensure(
        makeInput('dependent-all-closed', { blocked_by: [b1.id, b2.id] }),
      );

      expect(await store.ready(dependent.id)).toBe(true);
    });
  });

  describe('blocked by a Failed task — only Closed unblocks', () => {
    it('returns false when blocker is Failed', async () => {
      const blocker = await store.ensure(makeInput('blocker-failed'));
      await store.transition(blocker.id, 'Failed');
      const dependent = await store.ensure(
        makeInput('dependent-blocker-failed', { blocked_by: [blocker.id] }),
      );
      expect(await store.ready(dependent.id)).toBe(false);
    });

    it('returns false when one blocker is Closed and another is Failed', async () => {
      const closed = await store.ensure(makeInput('blocker-closed-mix'));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      const failed = await store.ensure(makeInput('blocker-failed-mix'));
      await store.transition(failed.id, 'Failed');

      const dependent = await store.ensure(
        makeInput('dependent-mixed', { blocked_by: [closed.id, failed.id] }),
      );

      expect(await store.ready(dependent.id)).toBe(false);
    });
  });
});

describe('TaskStore.hasPendingTasks()', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-pending-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns false when no tasks exist for the loop', async () => {
    expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
  });

  describe('returns true with any Open task', () => {
    it('returns true when there is a single Open task', async () => {
      await store.ensure(makeInput('open-task'));
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });

    it('returns true when there are multiple Open tasks', async () => {
      await store.ensure(makeInput('open-a'));
      await store.ensure(makeInput('open-b'));
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });

    it('returns true when Open tasks are mixed with Closed tasks', async () => {
      const closed = await store.ensure(makeInput('closed-one'));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      await store.ensure(makeInput('open-one'));

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });

    it('returns true when Open tasks are mixed with Failed tasks', async () => {
      const failed = await store.ensure(makeInput('failed-one'));
      await store.transition(failed.id, 'Failed');

      await store.ensure(makeInput('open-alongside-failed'));

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });
  });

  describe('returns true with any InProgress task', () => {
    it('returns true when there is a single InProgress task', async () => {
      const task = await store.ensure(makeInput('inprogress-task'));
      await store.transition(task.id, 'InProgress');
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });

    it('returns true when InProgress tasks are mixed with Closed tasks', async () => {
      const closed = await store.ensure(makeInput('closed-mix'));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      const inProgress = await store.ensure(makeInput('inprogress-mix'));
      await store.transition(inProgress.id, 'InProgress');

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });

    it('returns true when InProgress tasks are mixed with Failed tasks', async () => {
      const failed = await store.ensure(makeInput('failed-mix'));
      await store.transition(failed.id, 'Failed');

      const inProgress = await store.ensure(makeInput('inprogress-alongside-failed'));
      await store.transition(inProgress.id, 'InProgress');

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(true);
    });
  });

  describe('returns false when all tasks are Closed or Failed', () => {
    it('returns false when the only task is Closed', async () => {
      const task = await store.ensure(makeInput('only-closed'));
      await store.transition(task.id, 'InProgress');
      await store.transition(task.id, 'Closed');
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('returns false when the only task is Failed', async () => {
      const task = await store.ensure(makeInput('only-failed'));
      await store.transition(task.id, 'Failed');
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('returns false when all tasks are Closed', async () => {
      const t1 = await store.ensure(makeInput('all-closed-1'));
      await store.transition(t1.id, 'InProgress');
      await store.transition(t1.id, 'Closed');

      const t2 = await store.ensure(makeInput('all-closed-2'));
      await store.transition(t2.id, 'InProgress');
      await store.transition(t2.id, 'Closed');

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('returns false when all tasks are Failed', async () => {
      const t1 = await store.ensure(makeInput('all-failed-1'));
      await store.transition(t1.id, 'Failed');

      const t2 = await store.ensure(makeInput('all-failed-2'));
      await store.transition(t2.id, 'Failed');

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('returns false when tasks are a mix of Closed and Failed', async () => {
      const closed = await store.ensure(makeInput('mix-closed'));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      const failed = await store.ensure(makeInput('mix-failed'));
      await store.transition(failed.id, 'Failed');

      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });
  });

  describe('scoped correctly to loop_id', () => {
    it('does not count Open tasks from a different loop', async () => {
      await store.ensure(makeInput('other-loop-open', { loop_id: 'loop-other' }));
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('does not count InProgress tasks from a different loop', async () => {
      const task = await store.ensure(makeInput('other-loop-inprogress', { loop_id: 'loop-other' }));
      await store.transition(task.id, 'InProgress');
      expect(await store.hasPendingTasks(LOOP_ID)).toBe(false);
    });

    it('returns true only for the queried loop when both loops have pending tasks', async () => {
      await store.ensure(makeInput('loop-a-open', { loop_id: 'loop-a' }));
      await store.ensure(makeInput('loop-b-open', { loop_id: 'loop-b' }));

      expect(await store.hasPendingTasks('loop-a')).toBe(true);
      expect(await store.hasPendingTasks('loop-b')).toBe(true);
    });

    it('returns false for a loop with only Closed tasks even when another loop has pending tasks', async () => {
      const closed = await store.ensure(makeInput('loop-a-closed', { loop_id: 'loop-a' }));
      await store.transition(closed.id, 'InProgress');
      await store.transition(closed.id, 'Closed');

      await store.ensure(makeInput('loop-b-open', { loop_id: 'loop-b' }));

      expect(await store.hasPendingTasks('loop-a')).toBe(false);
      expect(await store.hasPendingTasks('loop-b')).toBe(true);
    });

    it('returns false for an unknown loop_id', async () => {
      await store.ensure(makeInput('known-loop-task'));
      expect(await store.hasPendingTasks('loop-nonexistent')).toBe(false);
    });
  });
});

describe('TaskStore.getReady()', () => {
  let tmpDir: string;
  let store: TaskStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'task-store-getready-'));
    store = new TaskStore({ filePath: join(tmpDir, 'tasks.jsonl') });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns an empty array when no tasks exist for the loop', async () => {
    const result = await store.getReady(LOOP_ID);
    expect(result).toEqual([]);
  });

  it('returns an empty array for a loop with no tasks even when other loops have ready tasks', async () => {
    await store.ensure(makeInput('other-loop-ready', { loop_id: 'loop-other' }));
    const result = await store.getReady(LOOP_ID);
    expect(result).toEqual([]);
  });

  describe('Open tasks with no blockers', () => {
    it('returns a single Open task with an empty blocked_by list', async () => {
      const task = await store.ensure(makeInput('unblocked-open'));
      const result = await store.getReady(LOOP_ID);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(task.id);
    });

    it('returns all Open tasks with empty blocked_by lists', async () => {
      const t1 = await store.ensure(makeInput('unblocked-a'));
      const t2 = await store.ensure(makeInput('unblocked-b'));
      const result = await store.getReady(LOOP_ID);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(expect.arrayContaining([t1.id, t2.id]));
    });
  });

  describe('does not return non-Open tasks', () => {
    it('does not return an InProgress task even with no blockers', async () => {
      const task = await store.ensure(makeInput('inprogress-no-blockers'));
      await store.transition(task.id, 'InProgress');
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });

    it('does not return a Closed task', async () => {
      const task = await store.ensure(makeInput('closed-task'));
      await store.transition(task.id, 'InProgress');
      await store.transition(task.id, 'Closed');
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });

    it('does not return a Failed task', async () => {
      const task = await store.ensure(makeInput('failed-task'));
      await store.transition(task.id, 'Failed');
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });
  });

  describe('Open tasks with blockers — only Closed unblocks', () => {
    it('does not return an Open task whose blocker is Open', async () => {
      const blocker = await store.ensure(makeInput('blocker-open'));
      await store.ensure(makeInput('dependent-open-blocker', { blocked_by: [blocker.id] }));
      const result = await store.getReady(LOOP_ID);
      // blocker itself is ready (Open, no blockers); dependent is not
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(blocker.id);
    });

    it('does not return an Open task whose blocker is InProgress', async () => {
      const blocker = await store.ensure(makeInput('blocker-inprogress'));
      await store.transition(blocker.id, 'InProgress');
      await store.ensure(makeInput('dependent-inprogress-blocker', { blocked_by: [blocker.id] }));
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });

    it('does not return an Open task whose blocker is Failed', async () => {
      const blocker = await store.ensure(makeInput('blocker-failed'));
      await store.transition(blocker.id, 'Failed');
      await store.ensure(makeInput('dependent-failed-blocker', { blocked_by: [blocker.id] }));
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });

    it('returns an Open task once all its blockers are Closed', async () => {
      const blocker = await store.ensure(makeInput('blocker-becomes-closed'));
      const dependent = await store.ensure(
        makeInput('dependent-becomes-ready', { blocked_by: [blocker.id] }),
      );

      expect(await store.getReady(LOOP_ID)).not.toContainEqual(expect.objectContaining({ id: dependent.id }));

      await store.transition(blocker.id, 'InProgress');
      await store.transition(blocker.id, 'Closed');

      const result = await store.getReady(LOOP_ID);
      expect(result.map((t) => t.id)).toContain(dependent.id);
    });

    it('does not return an Open task when only some of its blockers are Closed', async () => {
      const b1 = await store.ensure(makeInput('partial-blocker-closed'));
      await store.transition(b1.id, 'InProgress');
      await store.transition(b1.id, 'Closed');

      const b2 = await store.ensure(makeInput('partial-blocker-open'));

      await store.ensure(
        makeInput('dependent-partial', { blocked_by: [b1.id, b2.id] }),
      );

      const result = await store.getReady(LOOP_ID);
      // b2 is ready (Open, no blockers); dependent is not
      expect(result.map((t) => t.key)).toContain('partial-blocker-open');
      expect(result.map((t) => t.key)).not.toContain('dependent-partial');
    });
  });

  describe('excludes tasks from other loops', () => {
    it('does not include Open tasks from a different loop', async () => {
      await store.ensure(makeInput('other-loop-task', { loop_id: 'loop-other' }));
      const result = await store.getReady(LOOP_ID);
      expect(result).toEqual([]);
    });

    it('returns only ready tasks belonging to the queried loop', async () => {
      const mine = await store.ensure(makeInput('my-loop-ready'));
      await store.ensure(makeInput('other-loop-ready-2', { loop_id: 'loop-other' }));

      const result = await store.getReady(LOOP_ID);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(mine.id);
    });

    it('independently returns ready tasks for each loop', async () => {
      const taskA = await store.ensure(makeInput('loop-a-task', { loop_id: 'loop-a' }));
      const taskB = await store.ensure(makeInput('loop-b-task', { loop_id: 'loop-b' }));

      const readyA = await store.getReady('loop-a');
      const readyB = await store.getReady('loop-b');

      expect(readyA).toHaveLength(1);
      expect(readyA[0]!.id).toBe(taskA.id);
      expect(readyB).toHaveLength(1);
      expect(readyB[0]!.id).toBe(taskB.id);
    });
  });

  describe('mixed ready and not-ready tasks in the same loop', () => {
    it('returns only the ready subset', async () => {
      const ready1 = await store.ensure(makeInput('ready-1'));
      const ready2 = await store.ensure(makeInput('ready-2'));

      const blocker = await store.ensure(makeInput('blocker'));
      await store.ensure(makeInput('blocked', { blocked_by: [blocker.id] }));

      const inProgress = await store.ensure(makeInput('in-progress-task'));
      await store.transition(inProgress.id, 'InProgress');

      const result = await store.getReady(LOOP_ID);
      const ids = result.map((t) => t.id);

      expect(ids).toContain(ready1.id);
      expect(ids).toContain(ready2.id);
      expect(ids).toContain(blocker.id);
      expect(ids).not.toContain(inProgress.id);
      // 'blocked' is not ready because blocker is Open (not Closed)
      const blockedTask = (await store.readAll()).find((t) => t.key === 'blocked')!;
      expect(ids).not.toContain(blockedTask.id);
    });
  });
});
