/**
 * @packageDocumentation
 * Public API for the hook lifecycle system.
 *
 * Re-exports all types from `types.ts` and all Zod schemas (plus their
 * inferred types) from `schema.ts` so consumers can import from a single
 * entry point.
 */

export type {
  HookPhase,
  HookOnError,
  HookSuspendMode,
  HookSpec,
  HookPayload,
  HookResult,
  SuspendState,
} from './types.js';

export {
  hookPhaseSchema,
  hookOnErrorSchema,
  hookSuspendModeSchema,
  hookSpecSchema,
  hookPayloadSchema,
  hookDispositionSchema,
  hookResultSchema,
  hookMutationOutputSchema,
  suspendStateSchema,
} from './schema.js';

export type {
  HookPhaseSchema,
  HookOnErrorSchema,
  HookSuspendModeSchema,
  HookSpecSchema,
  HookPayloadSchema,
  HookResultSchema,
  HookMutationOutputSchema,
  SuspendStateSchema,
} from './schema.js';

export { HookExecutor } from './executor.js';
export type { Logger } from './executor.js';

export { handleWarn, handleBlock, handleSuspend } from './failure-modes.js';
export type {
  FailureContinueResponse,
  FailureBlockResponse,
  FailureSuspendResponse,
  FailureResponse,
  SuspendStatePersister,
  SuspendStrategyFn,
  SuspendStrategyMap,
} from './failure-modes.js';

export { waitForResume, retryBackoff, waitThenRetry } from './suspend-strategies.js';

export { SuspendStateStore } from './suspend-state-store.js';

export { HookTelemetry } from './telemetry.js';

export { HookEngine } from './engine.js';
export type { HookFireResult } from './engine.js';

export { startResumeServer } from './resume-server.js';
