/**
 * Base interface extended by all diagnostic event records.
 * Every record written to a collector includes these fields.
 */
export interface DiagnosticRecord {
  /** ISO 8601 timestamp injected at write time. */
  ts: string;
  /** Unique identifier for the diagnostics session (directory name). */
  sessionId: string;
}

/**
 * String-literal union of all collector names.
 * Maps to the JSONL file written for each collector.
 */
export type CollectorName =
  | 'agent-output'
  | 'orchestration'
  | 'performance'
  | 'errors'
  | 'hook-runs';

// ---------------------------------------------------------------------------
// Agent Output Events — written to agent-output.jsonl
// ---------------------------------------------------------------------------

/**
 * A plain-text fragment streamed from the agent.
 * Collector: agent-output
 */
export interface AgentOutputTextEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a text fragment event. */
  event: 'Text';
  /** The text content produced by the agent. */
  content: string;
}

/**
 * A tool invocation requested by the agent.
 * Collector: agent-output
 */
export interface AgentOutputToolCallEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a tool invocation event. */
  event: 'ToolCall';
  /** Name of the tool being invoked. */
  toolName: string;
  /** Raw input arguments passed to the tool. */
  input: unknown;
  /** Unique tool-call identifier within the turn. */
  toolUseId: string;
}

/**
 * The result returned after a tool call completes.
 * Collector: agent-output
 */
export interface AgentOutputToolResultEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a tool result event. */
  event: 'ToolResult';
  /** Unique tool-call identifier matching the originating ToolCall event. */
  toolUseId: string;
  /** Raw output returned by the tool. */
  output: unknown;
}

/**
 * An error produced during agent output processing.
 * Collector: agent-output
 */
export interface AgentOutputErrorEvent extends DiagnosticRecord {
  /** Discriminant identifying this as an agent-output error event. */
  event: 'Error';
  /** Human-readable error message. */
  message: string;
  /** Optional raw error payload for debugging. */
  raw?: unknown;
}

/**
 * Signals that the agent turn is complete, including token usage.
 * Collector: agent-output
 */
export interface AgentOutputCompleteEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a turn-complete event. */
  event: 'Complete';
  /** Number of input tokens consumed in this turn. */
  inputTokens: number;
  /** Number of output tokens produced in this turn. */
  outputTokens: number;
}

/**
 * Discriminated union of all events written to agent-output.jsonl.
 */
export type AgentOutputEvent =
  | AgentOutputTextEvent
  | AgentOutputToolCallEvent
  | AgentOutputToolResultEvent
  | AgentOutputErrorEvent
  | AgentOutputCompleteEvent;

// ---------------------------------------------------------------------------
// Orchestration Events — written to orchestration.jsonl
// ---------------------------------------------------------------------------

/**
 * Emitted when a new orchestration iteration begins.
 * Collector: orchestration
 */
export interface OrchestrationIterationStartedEvent extends DiagnosticRecord {
  /** Discriminant identifying this as an iteration-started event. */
  event: 'IterationStarted';
  /** Monotonically increasing iteration counter. */
  iterationId: string;
}

/**
 * Emitted when the hat selector chooses a hat for the current iteration.
 * Collector: orchestration
 */
export interface OrchestrationHatSelectedEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a hat-selected event. */
  event: 'HatSelected';
  /** The hat identifier chosen for this iteration. */
  hat: string;
  /** Iteration in which the hat was selected. */
  iterationId: string;
}

/**
 * Emitted when an event is published onto the event bus.
 * Collector: orchestration
 */
export interface OrchestrationEventPublishedEvent extends DiagnosticRecord {
  /** Discriminant identifying this as an event-published record. */
  event: 'EventPublished';
  /** Topic the event was published to. */
  topic: string;
  /** Payload of the published event. */
  payload: unknown;
  /** Iteration during which the publish occurred. */
  iterationId: string;
}

/**
 * Emitted when the orchestrator detects backpressure and pauses dispatch.
 * Collector: orchestration
 */
export interface OrchestrationBackpressureTriggeredEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a backpressure-triggered event. */
  event: 'BackpressureTriggered';
  /** Iteration in which backpressure was triggered. */
  iterationId: string;
  /** Human-readable reason backpressure was applied. */
  reason: string;
}

/**
 * Emitted when the orchestration loop terminates.
 * Collector: orchestration
 */
export interface OrchestrationLoopTerminatedEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a loop-terminated event. */
  event: 'LoopTerminated';
  /** Reason the loop was terminated. */
  reason: string;
  /** Process exit code associated with the termination reason. */
  exitCode: number;
}

/**
 * Emitted when a task is abandoned after exhausting retry attempts.
 * Collector: orchestration
 */
export interface OrchestrationTaskAbandonedEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a task-abandoned event. */
  event: 'TaskAbandoned';
  /** Identifier of the abandoned task. */
  taskId: string;
  /** Human-readable reason the task was abandoned. */
  reason: string;
}

/**
 * Generic wave lifecycle event emitted by wave-based orchestration strategies.
 * Collector: orchestration
 */
export interface OrchestrationWaveEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a wave lifecycle event. */
  event: 'WaveEvent';
  /** Name of the wave phase (e.g. "start", "end", "agent-complete"). */
  waveName: string;
  /** Iteration in which the wave event occurred. */
  iterationId: string;
  /** Optional additional context for the wave event. */
  detail?: unknown;
}

/**
 * Discriminated union of all events written to orchestration.jsonl.
 */
export type OrchestrationEvent =
  | OrchestrationIterationStartedEvent
  | OrchestrationHatSelectedEvent
  | OrchestrationEventPublishedEvent
  | OrchestrationBackpressureTriggeredEvent
  | OrchestrationLoopTerminatedEvent
  | OrchestrationTaskAbandonedEvent
  | OrchestrationWaveEvent;

// ---------------------------------------------------------------------------
// Performance Events — written to performance.jsonl
// ---------------------------------------------------------------------------

/**
 * Records the wall-clock duration of a full orchestration iteration.
 * Collector: performance
 */
export interface PerformanceIterationDurationEvent extends DiagnosticRecord {
  /** Discriminant identifying this as an iteration-duration measurement. */
  event: 'IterationDuration';
  /** Duration of the iteration in milliseconds. */
  ms: number;
  /** Iteration that was measured. */
  iterationId: string;
}

/**
 * Records the round-trip latency of a single agent invocation.
 * Collector: performance
 */
export interface PerformanceAgentLatencyEvent extends DiagnosticRecord {
  /** Discriminant identifying this as an agent-latency measurement. */
  event: 'AgentLatency';
  /** Latency of the agent call in milliseconds. */
  ms: number;
  /** The hat whose agent was invoked. */
  hat: string;
  /** Iteration in which the agent was invoked. */
  iterationId: string;
}

/**
 * Records token usage for a completed agent turn.
 * Collector: performance
 */
export interface PerformanceTokenCountEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a token-count record. */
  event: 'TokenCount';
  /** Number of input tokens consumed. */
  inputTokens: number;
  /** Number of output tokens produced. */
  outputTokens: number;
  /** The hat whose agent produced these tokens. */
  hat: string;
  /** Iteration in which the tokens were consumed. */
  iterationId: string;
}

/**
 * Discriminated union of all events written to performance.jsonl.
 */
export type PerformanceEvent =
  | PerformanceIterationDurationEvent
  | PerformanceAgentLatencyEvent
  | PerformanceTokenCountEvent;

// ---------------------------------------------------------------------------
// Error Events — written to errors.jsonl
// ---------------------------------------------------------------------------

/**
 * Base fields shared by all error events.
 * Collector: errors
 */
interface BaseErrorEvent extends DiagnosticRecord {
  /** Human-readable error message. */
  message: string;
  /** Optional raw payload that triggered the error. */
  raw?: unknown;
}

/** A JSONL line could not be parsed as valid JSON. Collector: errors */
export interface ErrorParseErrorEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a parse-error event. */
  event: 'ParseError';
}

/** An event or record failed schema validation. Collector: errors */
export interface ErrorValidationFailureEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a validation-failure event. */
  event: 'ValidationFailure';
}

/** The AI backend returned an unexpected error response. Collector: errors */
export interface ErrorBackendErrorEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a backend-error event. */
  event: 'BackendError';
}

/** An operation exceeded its allowed time budget. Collector: errors */
export interface ErrorTimeoutEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a timeout event. */
  event: 'Timeout';
}

/** An event payload does not conform to the expected structure. Collector: errors */
export interface ErrorMalformedEventEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a malformed-event error. */
  event: 'MalformedEvent';
}

/** A Telegram notification send failed. Collector: errors */
export interface ErrorTelegramSendErrorEvent extends BaseErrorEvent {
  /** Discriminant identifying this as a Telegram send-error event. */
  event: 'TelegramSendError';
}

/**
 * Discriminated union of all events written to errors.jsonl.
 */
export type ErrorEvent =
  | ErrorParseErrorEvent
  | ErrorValidationFailureEvent
  | ErrorBackendErrorEvent
  | ErrorTimeoutEvent
  | ErrorMalformedEventEvent
  | ErrorTelegramSendErrorEvent;

// ---------------------------------------------------------------------------
// Hook Run Events — written to hook-runs.jsonl
// ---------------------------------------------------------------------------

/**
 * Outcome of a single hook execution attempt.
 * Values: `success` — hook exited cleanly; `failure` — hook exited with error;
 * `skipped` — hook was not executed (e.g. disabled or condition unmet).
 */
export type HookDisposition = 'success' | 'failure' | 'skipped';

/**
 * Records the result of executing a hook, including retry metadata.
 * Collector: hook-runs
 */
export interface HookRunEvent extends DiagnosticRecord {
  /** Discriminant identifying this as a hook-run record. */
  event: 'HookRun';
  /** Identifier of the hook that was executed. */
  hookName: string;
  /** Wall-clock duration of the hook execution in milliseconds. */
  durationMs: number;
  /** Process exit code returned by the hook. */
  exitCode: number;
  /** Outcome classification of this execution attempt. */
  disposition: HookDisposition;
  /** Number of retry attempts made before this execution (0 on first try). */
  retryCount: number;
  /** Whether this was the final attempt (no further retries will be made). */
  finalAttempt: boolean;
}
