/**
 * @packageDocumentation
 * Barrel re-export for all RPC type definitions.
 *
 * This module re-exports every public Zod schema and inferred TypeScript type
 * from the `shared`, `commands`, and `events` sub-modules. Consumers should
 * import from this barrel rather than reaching into individual files:
 *
 * ```ts
 * import { rpcCommandSchema, type RpcEvent } from './rpc/types/index.js';
 * ```
 */

export {
  hatIdSchema,
  guidanceAppliesToSchema,
  guidanceCommandTypeSchema,
  loopTerminationReasonSchema,
  taskStatusSchema,
  taskCountsSchema,
  iterationIndexSchema,
  iterationMetaSchema,
  costSnapshotSchema,
  timestampSchema,
} from './shared.js';

export type {
  HatId,
  GuidanceAppliesTo,
  GuidanceCommandType,
  LoopTerminationReason,
  TaskStatus,
  TaskCounts,
  IterationIndex,
  IterationMeta,
  CostSnapshot,
  Timestamp,
} from './shared.js';

export {
  promptParamsSchema,
  guidanceParamsSchema,
  steerParamsSchema,
  followUpParamsSchema,
  abortParamsSchema,
  getIterationsParamsSchema,
  setHatParamsSchema,
  promptCommandSchema,
  guidanceCommandSchema,
  steerCommandSchema,
  followUpCommandSchema,
  abortCommandSchema,
  getStateCommandSchema,
  getIterationsCommandSchema,
  setHatCommandSchema,
  rpcCommandSchema,
} from './commands.js';

export type {
  PromptParams,
  GuidanceParams,
  SteerParams,
  FollowUpParams,
  AbortParams,
  GetIterationsParams,
  SetHatParams,
  PromptCommand,
  GuidanceCommand,
  SteerCommand,
  FollowUpCommand,
  AbortCommand,
  GetStateCommand,
  GetIterationsCommand,
  SetHatCommand,
  RpcCommand,
  RpcCommandMethod,
} from './commands.js';

export {
  loopStartedDataSchema,
  iterationStartDataSchema,
  iterationEndDataSchema,
  loopTerminatedDataSchema,
  textDeltaDataSchema,
  toolCallStartDataSchema,
  toolCallEndDataSchema,
  errorDataSchema,
  hatChangedDataSchema,
  taskStatusChangedDataSchema,
  taskCountsUpdatedDataSchema,
  orchestrationEventDataSchema,
  guidanceAckDataSchema,
  waveStartedDataSchema,
  waveWorkerDoneDataSchema,
  waveCompletedDataSchema,
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
  rpcEventSchema,
} from './events.js';

export type {
  LoopStartedData,
  IterationStartData,
  IterationEndData,
  LoopTerminatedData,
  TextDeltaData,
  ToolCallStartData,
  ToolCallEndData,
  ErrorData,
  HatChangedData,
  TaskStatusChangedData,
  TaskCountsUpdatedData,
  OrchestrationEventData,
  GuidanceAckData,
  WaveStartedData,
  WaveWorkerDoneData,
  WaveCompletedData,
  LoopStartedEvent,
  IterationStartEvent,
  IterationEndEvent,
  LoopTerminatedEvent,
  TextDeltaEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  ErrorEvent,
  HatChangedEvent,
  TaskStatusChangedEvent,
  TaskCountsUpdatedEvent,
  OrchestrationEventEvent,
  GuidanceAckEvent,
  WaveStartedEvent,
  WaveWorkerDoneEvent,
  WaveCompletedEvent,
  RpcEvent,
  RpcEventName,
} from './events.js';
