/**
 * Typed event catalogue for the executor entity.
 * Mirrors the discriminated union defined in services/notifications/src/entity/plugins/executor.ts.
 * Kept in sync manually — a future shared-types package could own this.
 */
export type ExecutorEvent =
  | { type: 'loop.started'; branch: string; planChecksum?: string }
  | { type: 'loop.done'; tasksCompleted: number; tasksFailed: number }
  | { type: 'loop.cancelled'; reason: string }
  | { type: 'task.started'; taskIndex: number; taskText: string }
  | { type: 'task.done'; taskIndex: number; durationMs: number }
  | { type: 'task.failed'; taskIndex: number; exitCode: number }
  | { type: 'task.blocked'; taskIndex: number }
  | { type: 'log'; stream: 'stdout' | 'stderr'; line: string }
  | {
    type: 'prerequisite.check';
    item: string;
    tag: 'auto' | 'human';
    result: 'pass' | 'fail' | 'pending';
  };

export interface ApprovalRequest {
  requestId: string;
  type: 'prerequisite' | 'human-loop';
  description: string;
  options?: string[];
}

export interface ApprovalDecision {
  decision: 'granted' | 'denied';
  note?: string;
}
