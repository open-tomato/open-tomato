/**
 * @packageDocumentation
 * Zod schemas and inferred TypeScript types for all RPC events.
 *
 * Events flow from the orchestrator to external consumers (TUI, web dashboard,
 * IDE) over the NDJSON transport. Each event is a discriminated union member
 * keyed by the `event` field.
 *
 * Events are grouped into five categories:
 * - **Lifecycle** — loop and iteration boundaries
 * - **Streaming** — incremental LLM output and tool calls
 * - **Orchestration** — hat, task, and state transitions
 * - **Guidance** — acknowledgments for injected guidance/steer commands
 * - **Wave** — parallel worker orchestration progress
 */

import { z } from 'zod';

import {
  guidanceCommandTypeSchema,
  hatIdSchema,
  iterationIndexSchema,
  loopTerminationReasonSchema,
  taskCountsSchema,
  timestampSchema,
} from './shared.js';

// ---------------------------------------------------------------------------
// Per-event data schemas — Lifecycle
// ---------------------------------------------------------------------------

/** Data emitted when the orchestration loop starts. */
export const loopStartedDataSchema = z.object({
  /** ISO-8601 timestamp when the loop began. */
  timestamp: timestampSchema,
  /** The prompt that initiated this run. */
  prompt: z.string(),
  /** The hat active at loop start, if any. */
  hatId: hatIdSchema.optional(),
  /** Maximum iterations configured for this run, if any. */
  maxIterations: z.number().int()
    .positive()
    .optional(),
});

/** Data emitted at the start of each orchestration iteration. */
export const iterationStartDataSchema = z.object({
  /** Zero-based iteration index. */
  index: iterationIndexSchema,
  /** ISO-8601 timestamp when the iteration began. */
  timestamp: timestampSchema,
  /** The hat active for this iteration. */
  hatId: hatIdSchema.optional(),
});

/** Data emitted at the end of each orchestration iteration. */
export const iterationEndDataSchema = z.object({
  /** Zero-based iteration index. */
  index: iterationIndexSchema,
  /** ISO-8601 timestamp when the iteration ended. */
  timestamp: timestampSchema,
  /** Duration of the iteration in milliseconds. */
  durationMs: z.number().nonnegative(),
  /** Number of tokens consumed during this iteration. */
  tokensUsed: z.number().int()
    .nonnegative()
    .optional(),
});

/** Data emitted when the orchestration loop terminates. */
export const loopTerminatedDataSchema = z.object({
  /** ISO-8601 timestamp when the loop ended. */
  timestamp: timestampSchema,
  /** Reason the loop terminated. */
  reason: loopTerminationReasonSchema,
  /** Total number of iterations executed. */
  totalIterations: z.number().int()
    .nonnegative(),
  /** Human-readable message providing additional context. */
  message: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Per-event data schemas — Streaming
// ---------------------------------------------------------------------------

/** Data emitted for incremental text output from the LLM. */
export const textDeltaDataSchema = z.object({
  /** The text fragment. */
  delta: z.string(),
  /** Zero-based iteration index this delta belongs to. */
  iterationIndex: iterationIndexSchema,
});

/** Data emitted when a tool call begins. */
export const toolCallStartDataSchema = z.object({
  /** Unique identifier for this tool call within the iteration. */
  callId: z.string(),
  /** Name of the tool being invoked. */
  toolName: z.string(),
  /** Zero-based iteration index this call belongs to. */
  iterationIndex: iterationIndexSchema,
  /** ISO-8601 timestamp when the tool call started. */
  timestamp: timestampSchema,
});

/** Data emitted when a tool call completes. */
export const toolCallEndDataSchema = z.object({
  /** Identifier matching the corresponding {@link ToolCallStartData.callId}. */
  callId: z.string(),
  /** Name of the tool that was invoked. */
  toolName: z.string(),
  /** Zero-based iteration index this call belongs to. */
  iterationIndex: iterationIndexSchema,
  /** Whether the tool call succeeded. */
  success: z.boolean(),
  /** Duration of the tool call in milliseconds. */
  durationMs: z.number().nonnegative(),
  /** ISO-8601 timestamp when the tool call ended. */
  timestamp: timestampSchema,
});

// ---------------------------------------------------------------------------
// Per-event data schemas — Error
// ---------------------------------------------------------------------------

/** Data emitted when an error occurs. */
export const errorDataSchema = z.object({
  /** Machine-readable error code. */
  code: z.string(),
  /** Human-readable error message. */
  message: z.string(),
  /** ISO-8601 timestamp when the error occurred. */
  timestamp: timestampSchema,
  /** Additional structured context for debugging. */
  details: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Per-event data schemas — Orchestration
// ---------------------------------------------------------------------------

/** Data emitted when the active hat changes. */
export const hatChangedDataSchema = z.object({
  /** The hat that was previously active, if any. */
  previousHatId: hatIdSchema.optional(),
  /** The hat that is now active. */
  newHatId: hatIdSchema,
  /** ISO-8601 timestamp of the transition. */
  timestamp: timestampSchema,
});

/** Data emitted when a task's status changes. */
export const taskStatusChangedDataSchema = z.object({
  /** Identifier of the task. */
  taskId: z.string(),
  /** Previous status of the task. */
  previousStatus: z.string(),
  /** New status of the task. */
  newStatus: z.string(),
  /** ISO-8601 timestamp of the status change. */
  timestamp: timestampSchema,
});

/** Data emitted when aggregate task counts are updated. */
export const taskCountsUpdatedDataSchema = taskCountsSchema.extend({
  /** ISO-8601 timestamp of the update. */
  timestamp: timestampSchema,
});

/** Data emitted for generic orchestration events not covered by specific event types. */
export const orchestrationEventDataSchema = z.object({
  /** Machine-readable event kind within orchestration. */
  kind: z.string(),
  /** Payload specific to this orchestration event kind. */
  payload: z.record(z.unknown()).optional(),
  /** ISO-8601 timestamp of the event. */
  timestamp: timestampSchema,
});

// ---------------------------------------------------------------------------
// Per-event data schemas — Guidance
// ---------------------------------------------------------------------------

/** Data emitted to acknowledge receipt of a guidance or steer command. */
export const guidanceAckDataSchema = z.object({
  /** The type of command being acknowledged. */
  commandType: guidanceCommandTypeSchema,
  /** Whether the guidance was accepted by the orchestrator. */
  accepted: z.boolean(),
  /** Human-readable reason if the guidance was rejected. */
  reason: z.string().optional(),
  /** ISO-8601 timestamp of the acknowledgment. */
  timestamp: timestampSchema,
});

// ---------------------------------------------------------------------------
// Per-event data schemas — Wave
// ---------------------------------------------------------------------------

/** Data emitted when a parallel wave of workers begins. */
export const waveStartedDataSchema = z.object({
  /** Unique identifier for this wave. */
  waveId: z.string(),
  /** Total number of workers in this wave. */
  workerCount: z.number().int()
    .positive(),
  /** ISO-8601 timestamp when the wave started. */
  timestamp: timestampSchema,
});

/** Data emitted when an individual worker in a wave completes. */
export const waveWorkerDoneDataSchema = z.object({
  /** Identifier of the parent wave. */
  waveId: z.string(),
  /** Identifier of the completed worker. */
  workerId: z.string(),
  /** Whether the worker succeeded. */
  success: z.boolean(),
  /** Duration of the worker's execution in milliseconds. */
  durationMs: z.number().nonnegative(),
  /** ISO-8601 timestamp when the worker finished. */
  timestamp: timestampSchema,
});

/** Data emitted when all workers in a wave have completed. */
export const waveCompletedDataSchema = z.object({
  /** Identifier of the completed wave. */
  waveId: z.string(),
  /** Number of workers that succeeded. */
  succeededCount: z.number().int()
    .nonnegative(),
  /** Number of workers that failed. */
  failedCount: z.number().int()
    .nonnegative(),
  /** Total duration of the wave in milliseconds. */
  durationMs: z.number().nonnegative(),
  /** ISO-8601 timestamp when the wave completed. */
  timestamp: timestampSchema,
});

// ---------------------------------------------------------------------------
// Individual event schemas (discriminated by `event`)
// ---------------------------------------------------------------------------

/** Schema for the `loop_started` event. */
export const loopStartedEventSchema = z.object({
  event: z.literal('loop_started'),
  data: loopStartedDataSchema,
});

/** Schema for the `iteration_start` event. */
export const iterationStartEventSchema = z.object({
  event: z.literal('iteration_start'),
  data: iterationStartDataSchema,
});

/** Schema for the `iteration_end` event. */
export const iterationEndEventSchema = z.object({
  event: z.literal('iteration_end'),
  data: iterationEndDataSchema,
});

/** Schema for the `loop_terminated` event. */
export const loopTerminatedEventSchema = z.object({
  event: z.literal('loop_terminated'),
  data: loopTerminatedDataSchema,
});

/** Schema for the `text_delta` event. */
export const textDeltaEventSchema = z.object({
  event: z.literal('text_delta'),
  data: textDeltaDataSchema,
});

/** Schema for the `tool_call_start` event. */
export const toolCallStartEventSchema = z.object({
  event: z.literal('tool_call_start'),
  data: toolCallStartDataSchema,
});

/** Schema for the `tool_call_end` event. */
export const toolCallEndEventSchema = z.object({
  event: z.literal('tool_call_end'),
  data: toolCallEndDataSchema,
});

/** Schema for the `error` event. */
export const errorEventSchema = z.object({
  event: z.literal('error'),
  data: errorDataSchema,
});

/** Schema for the `hat_changed` event. */
export const hatChangedEventSchema = z.object({
  event: z.literal('hat_changed'),
  data: hatChangedDataSchema,
});

/** Schema for the `task_status_changed` event. */
export const taskStatusChangedEventSchema = z.object({
  event: z.literal('task_status_changed'),
  data: taskStatusChangedDataSchema,
});

/** Schema for the `task_counts_updated` event. */
export const taskCountsUpdatedEventSchema = z.object({
  event: z.literal('task_counts_updated'),
  data: taskCountsUpdatedDataSchema,
});

/** Schema for the `orchestration_event` event. */
export const orchestrationEventEventSchema = z.object({
  event: z.literal('orchestration_event'),
  data: orchestrationEventDataSchema,
});

/** Schema for the `guidance_ack` event. */
export const guidanceAckEventSchema = z.object({
  event: z.literal('guidance_ack'),
  data: guidanceAckDataSchema,
});

/** Schema for the `wave_started` event. */
export const waveStartedEventSchema = z.object({
  event: z.literal('wave_started'),
  data: waveStartedDataSchema,
});

/** Schema for the `wave_worker_done` event. */
export const waveWorkerDoneEventSchema = z.object({
  event: z.literal('wave_worker_done'),
  data: waveWorkerDoneDataSchema,
});

/** Schema for the `wave_completed` event. */
export const waveCompletedEventSchema = z.object({
  event: z.literal('wave_completed'),
  data: waveCompletedDataSchema,
});

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/**
 * Discriminated union schema for all RPC events.
 *
 * The `event` field acts as the discriminant. Use `rpcEventSchema.parse()`
 * to validate and narrow outgoing NDJSON messages.
 */
export const rpcEventSchema = z.discriminatedUnion('event', [
  loopStartedEventSchema,
  iterationStartEventSchema,
  iterationEndEventSchema,
  loopTerminatedEventSchema,
  textDeltaEventSchema,
  toolCallStartEventSchema,
  toolCallEndEventSchema,
  errorEventSchema,
  hatChangedEventSchema,
  taskStatusChangedEventSchema,
  taskCountsUpdatedEventSchema,
  orchestrationEventEventSchema,
  guidanceAckEventSchema,
  waveStartedEventSchema,
  waveWorkerDoneEventSchema,
  waveCompletedEventSchema,
]);

// ---------------------------------------------------------------------------
// Inferred TypeScript types — Data payloads
// ---------------------------------------------------------------------------

/** Data payload for the `loop_started` event. */
export type LoopStartedData = z.infer<typeof loopStartedDataSchema>;
/** Data payload for the `iteration_start` event. */
export type IterationStartData = z.infer<typeof iterationStartDataSchema>;
/** Data payload for the `iteration_end` event. */
export type IterationEndData = z.infer<typeof iterationEndDataSchema>;
/** Data payload for the `loop_terminated` event. */
export type LoopTerminatedData = z.infer<typeof loopTerminatedDataSchema>;
/** Data payload for the `text_delta` event. */
export type TextDeltaData = z.infer<typeof textDeltaDataSchema>;
/** Data payload for the `tool_call_start` event. */
export type ToolCallStartData = z.infer<typeof toolCallStartDataSchema>;
/** Data payload for the `tool_call_end` event. */
export type ToolCallEndData = z.infer<typeof toolCallEndDataSchema>;
/** Data payload for the `error` event. */
export type ErrorData = z.infer<typeof errorDataSchema>;
/** Data payload for the `hat_changed` event. */
export type HatChangedData = z.infer<typeof hatChangedDataSchema>;
/** Data payload for the `task_status_changed` event. */
export type TaskStatusChangedData = z.infer<typeof taskStatusChangedDataSchema>;
/** Data payload for the `task_counts_updated` event. */
export type TaskCountsUpdatedData = z.infer<typeof taskCountsUpdatedDataSchema>;
/** Data payload for the `orchestration_event` event. */
export type OrchestrationEventData = z.infer<typeof orchestrationEventDataSchema>;
/** Data payload for the `guidance_ack` event. */
export type GuidanceAckData = z.infer<typeof guidanceAckDataSchema>;
/** Data payload for the `wave_started` event. */
export type WaveStartedData = z.infer<typeof waveStartedDataSchema>;
/** Data payload for the `wave_worker_done` event. */
export type WaveWorkerDoneData = z.infer<typeof waveWorkerDoneDataSchema>;
/** Data payload for the `wave_completed` event. */
export type WaveCompletedData = z.infer<typeof waveCompletedDataSchema>;

// ---------------------------------------------------------------------------
// Inferred TypeScript types — Full event objects
// ---------------------------------------------------------------------------

/**
 * A `loop_started` event — emitted once when the orchestration loop begins.
 *
 * Discriminant: `event: 'loop_started'`
 *
 * @see {@link LoopStartedData} for the data payload shape.
 */
export type LoopStartedEvent = z.infer<typeof loopStartedEventSchema>;

/**
 * An `iteration_start` event — emitted at the beginning of each iteration.
 *
 * Discriminant: `event: 'iteration_start'`
 *
 * @see {@link IterationStartData} for the data payload shape.
 */
export type IterationStartEvent = z.infer<typeof iterationStartEventSchema>;

/**
 * An `iteration_end` event — emitted when an iteration completes.
 *
 * Discriminant: `event: 'iteration_end'`
 *
 * @see {@link IterationEndData} for the data payload shape.
 */
export type IterationEndEvent = z.infer<typeof iterationEndEventSchema>;

/**
 * A `loop_terminated` event — emitted once when the orchestration loop ends.
 *
 * Discriminant: `event: 'loop_terminated'`
 *
 * @see {@link LoopTerminatedData} for the data payload shape.
 */
export type LoopTerminatedEvent = z.infer<typeof loopTerminatedEventSchema>;

/**
 * A `text_delta` event — emitted for each incremental text chunk from the LLM.
 *
 * Discriminant: `event: 'text_delta'`
 *
 * @see {@link TextDeltaData} for the data payload shape.
 */
export type TextDeltaEvent = z.infer<typeof textDeltaEventSchema>;

/**
 * A `tool_call_start` event — emitted when the LLM initiates a tool call.
 *
 * Discriminant: `event: 'tool_call_start'`
 *
 * @see {@link ToolCallStartData} for the data payload shape.
 */
export type ToolCallStartEvent = z.infer<typeof toolCallStartEventSchema>;

/**
 * A `tool_call_end` event — emitted when a tool call completes.
 *
 * Discriminant: `event: 'tool_call_end'`
 *
 * @see {@link ToolCallEndData} for the data payload shape.
 */
export type ToolCallEndEvent = z.infer<typeof toolCallEndEventSchema>;

/**
 * An `error` event — emitted when an error occurs during orchestration.
 *
 * Discriminant: `event: 'error'`
 *
 * @see {@link ErrorData} for the data payload shape.
 */
export type ErrorEvent = z.infer<typeof errorEventSchema>;

/**
 * A `hat_changed` event — emitted when the active hat transitions.
 *
 * Discriminant: `event: 'hat_changed'`
 *
 * @see {@link HatChangedData} for the data payload shape.
 */
export type HatChangedEvent = z.infer<typeof hatChangedEventSchema>;

/**
 * A `task_status_changed` event — emitted when an individual task changes status.
 *
 * Discriminant: `event: 'task_status_changed'`
 *
 * @see {@link TaskStatusChangedData} for the data payload shape.
 */
export type TaskStatusChangedEvent = z.infer<typeof taskStatusChangedEventSchema>;

/**
 * A `task_counts_updated` event — emitted when aggregate task counts change.
 *
 * Discriminant: `event: 'task_counts_updated'`
 *
 * @see {@link TaskCountsUpdatedData} for the data payload shape.
 */
export type TaskCountsUpdatedEvent = z.infer<typeof taskCountsUpdatedEventSchema>;

/**
 * An `orchestration_event` event — catch-all for orchestration state changes
 * not covered by a specific event type.
 *
 * Discriminant: `event: 'orchestration_event'`
 *
 * @see {@link OrchestrationEventData} for the data payload shape.
 */
export type OrchestrationEventEvent = z.infer<typeof orchestrationEventEventSchema>;

/**
 * A `guidance_ack` event — acknowledges receipt of a `guidance` or `steer` command.
 *
 * Discriminant: `event: 'guidance_ack'`
 *
 * @see {@link GuidanceAckData} for the data payload shape.
 */
export type GuidanceAckEvent = z.infer<typeof guidanceAckEventSchema>;

/**
 * A `wave_started` event — emitted when a parallel wave of workers begins.
 *
 * Discriminant: `event: 'wave_started'`
 *
 * @see {@link WaveStartedData} for the data payload shape.
 */
export type WaveStartedEvent = z.infer<typeof waveStartedEventSchema>;

/**
 * A `wave_worker_done` event — emitted when an individual worker in a wave finishes.
 *
 * Discriminant: `event: 'wave_worker_done'`
 *
 * @see {@link WaveWorkerDoneData} for the data payload shape.
 */
export type WaveWorkerDoneEvent = z.infer<typeof waveWorkerDoneEventSchema>;

/**
 * A `wave_completed` event — emitted when all workers in a wave have finished.
 *
 * Discriminant: `event: 'wave_completed'`
 *
 * @see {@link WaveCompletedData} for the data payload shape.
 */
export type WaveCompletedEvent = z.infer<typeof waveCompletedEventSchema>;

/**
 * Discriminated union type for all RPC events.
 *
 * The `event` field narrows the type:
 * ```ts
 * if (evt.event === 'text_delta') {
 *   evt.data.delta; // string
 * }
 * ```
 */
export type RpcEvent = z.infer<typeof rpcEventSchema>;

/** All valid event names. */
export type RpcEventName = RpcEvent['event'];
