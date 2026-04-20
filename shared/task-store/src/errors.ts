import type { TaskStatus } from './types';

/**
 * Thrown when a state transition that violates the task state machine is
 * attempted.
 *
 * Valid transitions:
 * - `Open` → `InProgress`
 * - `Open` → `Failed`
 * - `InProgress` → `Closed`
 * - `InProgress` → `Failed`
 */
export class InvalidTransitionError extends Error {
  readonly taskId: string;
  readonly fromStatus: TaskStatus;
  readonly toStatus: TaskStatus;

  constructor(taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) {
    super(
      `Invalid transition for task "${taskId}": ${fromStatus} → ${toStatus}`,
    );
    this.name = 'InvalidTransitionError';
    this.taskId = taskId;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Thrown when an operation references a task ID that does not exist in the
 * store.
 */
export class TaskNotFoundError extends Error {
  readonly taskId: string;

  constructor(taskId: string) {
    super(`Task not found: "${taskId}"`);
    this.name = 'TaskNotFoundError';
    this.taskId = taskId;
  }
}
