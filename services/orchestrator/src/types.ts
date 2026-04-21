/**
 * @packageDocumentation
 * Shared types for the executor service: job params, state, events, and approval contracts.
 */

import type { HookPhase, HookSpec } from './hooks/types.js';

/**
 * Pre-parsed plan payload — sent by schedulus or other dispatchers
 * that parse the plan externally before dispatching to the executor.
 */
export interface PlanPayload {
  name: string;
  description?: string;
  checksum?: string;
  tasks: ReadonlyArray<{ index: number; text: string }>;
}

/**
 * Parameters supplied when a job is dispatched to this executor node.
 *
 * Two dispatch modes:
 * - **Branch-based**: `branch` is required, PLAN.md is read from the checked-out workspace.
 * - **Plan-based**: `plan` is required, tasks are provided inline (no git checkout needed).
 */
export interface JobParams {
  jobId: string;
  /** Git branch to check out. Required for branch-based dispatch, optional otherwise. */
  branch: string;
  /** Anchors to the correct PLAN.md / PREREQUISITES.md files on disk. */
  planId: string;
  /** SHA of PLAN.md at dispatch time — used for integrity verification. */
  planChecksum?: string;
  /** When true, waits for an explicit human approval before the loop begins. */
  confirmBeforeStart?: boolean;
  /**
   * Optional pre-parsed plan payload. When provided, tasks are seeded from
   * this payload instead of reading PLAN.md from disk.
   */
  plan?: PlanPayload;
  /**
   * Optional hook specifications keyed by lifecycle phase.
   * Each phase maps to an ordered list of hook specs that run at that lifecycle point.
   * Validated with the `HookSpec` Zod schema at loop startup.
   */
  hooks?: Partial<Record<HookPhase, HookSpec[]>>;
}

/**
 * Live state of an executing (or completed) job.
 * Returned by GET /jobs/:jobId and surfaced via healthDetail().
 */
export interface JobState {
  jobId: string;
  branch: string;
  status: JobStatus;
  currentTask: string | null;
  taskIndex: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type JobStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

/**
 * Discriminated union of all events the executor emits to the notification service.
 * Matches the executor entity plugin event catalogue defined in the parent project.
 */
export type ExecutorEvent =
  | { type: 'loop.started'; branch: string; planChecksum?: string; planTasksCount: number; prereqTasksCount: number }
  | { type: 'loop.done'; tasksCompleted: number; tasksFailed: number }
  | { type: 'loop.cancelled'; reason: string }
  | { type: 'loop.paused' }
  | { type: 'loop.resumed' }
  | { type: 'task.started'; taskIndex: number; taskText: string }
  | { type: 'task.done'; taskIndex: number; durationMs: number; taskId: string }
  | { type: 'task.failed'; taskIndex: number; exitCode: number; taskId: string }
  | { type: 'task.blocked'; taskIndex: number; taskId: string }
  | { type: 'log'; stream: 'stdout' | 'stderr'; line: string }
  | {
    type: 'prerequisite.check';
    item: string;
    tag: 'auto' | 'human';
    result: 'pass' | 'fail' | 'pending';
  };

/**
 * A request for human approval — blocking the executor until a decision arrives.
 */
export interface ApprovalRequest {
  requestId: string;
  type: 'prerequisite' | 'human-loop';
  description: string;
  /** Optional list of choices to present to the approver. */
  options?: string[];
}

/**
 * The response from the notification service once a human has acted.
 */
export interface ApprovalDecision {
  decision: 'granted' | 'denied';
  note?: string;
}
