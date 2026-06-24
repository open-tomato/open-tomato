/**
 * Shared types for the tech-tree notification plugin.
 *
 * The tech-tree app is the primary approval inbox and activity stream
 * consumer. It reads events from the notification service and submits
 * human decisions back.
 */

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Raw SSE event envelope as stored and streamed by the notification service.
 * `payload` is the entity-specific event body (e.g. ExecutorEvent fields).
 */
export interface StoredEvent {
  id: string;
  jobId: string;
  entityKind: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'granted' | 'denied' | 'expired';
export type ApprovalType = 'prerequisite' | 'human-loop';

export interface PendingApproval {
  id: string;           // requestId
  jobId: string;
  entityKind: string;
  approvalType: ApprovalType;
  status: ApprovalStatus;
  description: string;
  options: string[] | null;
  decisionNote: string | null;
  createdAt: string;    // ISO 8601
  expiresAt: string | null;
}

export interface ApprovalDecision {
  decision: 'granted' | 'denied';
  note?: string;
}

// ---------------------------------------------------------------------------
// Nodes / Jobs
// ---------------------------------------------------------------------------

export type NodeStatus = 'online' | 'offline' | 'busy';

/**
 * @deprecated Use {@link WorkerRecord} instead. Will be removed in a future release.
 */
export interface NodeRecord {
  id: string;
  status: NodeStatus;
  address: string | null;
  lastSeenAt: string | null;
  metadata: Record<string, unknown>;
}

export type WorkerStatus = 'idle' | 'busy' | 'offline' | 'error';

/** A registered worker in the executor's pool. */
export interface WorkerRecord {
  id: string;
  status: WorkerStatus;
  address: string;
  last_seen_at: string;
  metadata: Record<string, unknown> | null;
}

/** Summary returned by GET /workers on the executor. */
export interface WorkerListResponse {
  total: number;
  idle: number;
  workers: WorkerRecord[];
}

export type JobStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export interface JobRecord {
  id: string;
  nodeId: string;
  /** Worker assigned to this job (from executor DB). */
  workerId: string | null;
  entityKind: string;
  sourceId: string | null;
  branch: string | null;
  planChecksum: string | null;
  status: JobStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Number of tasks in PLAN.md — populated once loop.started is received. */
  planTasksCount: number | null;
  /** Number of tasks in PREREQUISITES.md — populated once loop.started is received. */
  prereqTasksCount: number | null;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskStatus = 'running' | 'done' | 'failed' | 'blocked';

/** A single task row, created when the executor emits task.started. */
export interface TaskRecord {
  id: string;
  jobId: string;
  taskIndex: number;
  taskText: string;
  status: TaskStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
}

/** Response body from GET /jobs/:jobId/current-task. */
export interface CurrentTaskResponse {
  task: (TaskRecord & { lastEvent: StoredEvent | null }) | null;
}

// ---------------------------------------------------------------------------
// SSE callback types
// ---------------------------------------------------------------------------

/** Called for each parsed SSE event from subscribeToFeed(). */
export type EventCallback = (event: StoredEvent) => void;

/** Called when the SSE connection closes or errors. */
export type CloseCallback = (reason: string) => void;

/** Handle returned by subscribeToFeed() — call close() to stop streaming. */
export interface EventSubscription {
  close(): void;
}

// ---------------------------------------------------------------------------
// Job dispatch
// ---------------------------------------------------------------------------

export interface DispatchRequest {
  branch: string;
  planId: string;
  planChecksum?: string;
  confirmBeforeStart?: boolean;
  /** Optional node hint — if omitted the service auto-selects an idle node. */
  nodeId?: string;
}

export interface DispatchResult {
  jobId: string;
  nodeId: string;
  job: JobRecord;
}
