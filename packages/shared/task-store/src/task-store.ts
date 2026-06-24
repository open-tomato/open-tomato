/**
 * @module task-store
 *
 * Provides the {@link TaskStore} class — a persistent, JSONL-backed store for
 * tracking work items across agent iterations and loops.
 */

import type { CreateTaskInput, Task, TaskStoreOptions } from './types';

import { InvalidTransitionError, TaskNotFoundError } from './errors';
import { readLines, writeLines } from './jsonl';
import { withExclusiveLock } from './lock';
import { generateTaskId } from './task-id';
import { TaskStatus } from './types';

/** Legal state-machine transitions keyed by current status. */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Open]: [TaskStatus.InProgress, TaskStatus.Failed],
  [TaskStatus.InProgress]: [TaskStatus.Closed, TaskStatus.Failed],
  [TaskStatus.Closed]: [],
  [TaskStatus.Failed]: [],
};

/**
 * A persistent, JSONL-backed task store for tracking work items with
 * dependency-aware readiness and loop-termination guards.
 *
 * All mutating operations acquire an exclusive file lock before reading and
 * writing, so concurrent instances (or processes) pointing at the same file
 * are safe to use simultaneously.
 */
export class TaskStore {
  private readonly filePath: string;
  private readonly lockTimeout: number;

  /**
   * @param options - Configuration for the store.
   * @param options.filePath - Path to the `.jsonl` file that persists tasks.
   * @param options.lockTimeout - Maximum milliseconds to wait for an exclusive
   *   lock. Defaults to `5000`.
   */
  constructor(options: TaskStoreOptions) {
    this.filePath = options.filePath;
    this.lockTimeout = options.lockTimeout ?? 5000;
  }

  /**
   * Returns all tasks currently persisted in the store.
   *
   * This is a shared read — no lock is acquired. Malformed JSONL lines are
   * skipped silently. Returns an empty array when the file does not exist yet.
   *
   * @returns All tasks in insertion order.
   */
  async readAll(): Promise<Task[]> {
    return readLines(this.filePath);
  }

  /**
   * Idempotently creates or updates a task identified by its stable `key`.
   *
   * - If no task with the given `key` exists, a new one is created with a
   *   generated `id`, `status: Open`, and `created_at` set to now.
   * - If a task with the `key` already exists, the mutable fields (`title`,
   *   `description`, `priority`, `blocked_by`, `loop_id`) are updated from
   *   `input` while `id`, `created_at`, and the current `status` are preserved.
   *
   * The operation is atomic: an exclusive lock is held for the full
   * read-modify-write cycle.
   *
   * @param input - Fields for the task to create or locate.
   * @returns The existing or newly created task.
   */
  async ensure(input: CreateTaskInput): Promise<Task> {
    return withExclusiveLock(
      this.filePath,
      async () => {
        const tasks = await readLines(this.filePath);
        const existingIndex = tasks.findIndex((t) => t.key === input.key);
        if (existingIndex !== -1) {
          // existingIndex is valid; the findIndex guard above rules out -1.
          const existing = tasks[existingIndex]!;
          const updated: Task = {
            ...existing,
            title: input.title,
            description: input.description,
            priority: input.priority,
            blocked_by: input.blocked_by,
            loop_id: input.loop_id,
          };
          const updatedTasks = [...tasks];
          updatedTasks[existingIndex] = updated;
          await writeLines(this.filePath, updatedTasks);
          return updated;
        }

        const created: Task = {
          id: generateTaskId(),
          key: input.key,
          title: input.title,
          description: input.description,
          status: TaskStatus.Open,
          priority: input.priority,
          blocked_by: input.blocked_by,
          loop_id: input.loop_id,
          created_at: new Date().toISOString(),
        };
        await writeLines(this.filePath, [...tasks, created]);
        return created;
      },
      this.lockTimeout,
    );
  }

  /**
   * Transitions a task to a new status following the state machine rules:
   *
   * - `Open` → `InProgress` | `Failed`
   * - `InProgress` → `Closed` | `Failed`
   *
   * `Closed` and `Failed` are terminal states — no further transitions are
   * allowed.
   *
   * Side effects on timestamp fields:
   * - `InProgress`: sets `started_at` to now.
   * - `Closed` | `Failed`: sets `closed_at` to now.
   *
   * The operation is atomic: an exclusive lock is held for the full
   * read-modify-write cycle.
   *
   * @param id - ID of the task to transition.
   * @param status - The target status.
   * @returns The updated task.
   * @throws {@link TaskNotFoundError} when no task with `id` exists.
   * @throws {@link InvalidTransitionError} when the transition is not permitted
   *   by the state machine.
   */
  async transition(
    id: string,
    status: 'InProgress' | 'Closed' | 'Failed',
  ): Promise<Task> {
    return withExclusiveLock(
      this.filePath,
      async () => {
        const tasks = await readLines(this.filePath);
        const index = tasks.findIndex((t) => t.id === id);

        if (index === -1) {
          throw new TaskNotFoundError(id);
        }

        // index is guaranteed valid; the findIndex guard above rules out -1.
         
        const current = tasks[index]!;
        const allowed = ALLOWED_TRANSITIONS[current.status];

        if (!allowed.includes(status as TaskStatus)) {
          throw new InvalidTransitionError(id, current.status, status as TaskStatus);
        }

        const now = new Date().toISOString();
        const updated: Task = {
          ...current,
          status: status as TaskStatus,
          ...(status === TaskStatus.InProgress
            ? { started_at: now }
            : {}),
          ...(status === TaskStatus.Closed || status === TaskStatus.Failed
            ? { closed_at: now }
            : {}),
        };

        const updatedTasks = [...tasks];
        updatedTasks[index] = updated;
        await writeLines(this.filePath, updatedTasks);
        return updated;
      },
      this.lockTimeout,
    );
  }

  /**
   * Returns `true` when the task is ready to be worked on.
   *
   * A task is ready when:
   * 1. Its `status` is `Open`.
   * 2. Every task ID listed in its `blocked_by` array has `status: Closed`.
   *
   * A `Failed` blocker does NOT satisfy the dependency — only `Closed` does.
   *
   * No lock is acquired; this is a read-only snapshot check.
   *
   * @param id - ID of the task to check.
   * @returns `false` when the task does not exist.
   */
  async ready(id: string): Promise<boolean> {
    const tasks = await readLines(this.filePath);
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status !== TaskStatus.Open) {
      return false;
    }

    const taskById = new Map(tasks.map((t) => [t.id, t]));
    return task.blocked_by.every(
      (blockerId) => taskById.get(blockerId)?.status === TaskStatus.Closed,
    );
  }

  /**
   * Returns `true` when any task in the given loop still requires work.
   *
   * A loop has pending tasks when at least one task scoped to `loopId` has
   * status `Open` or `InProgress`. `Closed` and `Failed` tasks are considered
   * terminal and do not count as pending.
   *
   * Use this as a loop-termination guard: only accept a `LOOP_COMPLETE` signal
   * when this method returns `false`.
   *
   * No lock is acquired; this is a read-only snapshot check.
   *
   * @param loopId - The loop identifier to check.
   * @returns `false` when no tasks for the loop are `Open` or `InProgress`.
   */
  async hasPendingTasks(loopId: string): Promise<boolean> {
    const tasks = await readLines(this.filePath);
    return tasks.some(
      (t) => t.loop_id === loopId &&
        (t.status === TaskStatus.Open || t.status === TaskStatus.InProgress),
    );
  }

  /**
   * Returns all tasks in the given loop that are currently ready to be worked
   * on.
   *
   * A task is ready when its `status` is `Open` and every task in its
   * `blocked_by` list has `status: Closed`. See {@link ready} for the full
   * definition.
   *
   * No lock is acquired; this is a read-only snapshot check.
   *
   * @param loopId - The loop identifier to filter by.
   * @returns Tasks that are ready, in the order they appear in the store.
   */
  async getReady(loopId: string): Promise<Task[]> {
    const tasks = await readLines(this.filePath);
    const loopTasks = tasks.filter((t) => t.loop_id === loopId);
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    return loopTasks.filter(
      (t) => t.status === TaskStatus.Open &&
        t.blocked_by.every(
          (blockerId) => taskById.get(blockerId)?.status === TaskStatus.Closed,
        ),
    );
  }
}
