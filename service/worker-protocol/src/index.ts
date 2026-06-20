/**
 * @packageDocumentation
 * Shared contract between the executor and task-worker services.
 *
 * This package defines the types, schemas, and conventions that both
 * services use to communicate — HTTP API contracts, CLI argument shapes,
 * SSE event formats, model presets, and run mode configuration.
 */

// ── Model presets ──────────────────────────────────────────────────────────
export type { ModelPreset, ModelCapabilities, ProviderType } from './model-preset.js';
export {
  APPROVED_PRESETS,
  getPreset,
  validatePreset,
  listPresetNames,
  ModelPresetSchema,
  ProviderTypeSchema,
} from './model-preset.js';

// ── HTTP API contract ──────────────────────────────────────────────────────
export type {
  ExecRequest,
  WorkspaceRequest,
  WorkspaceResponse,
  WorkspaceCleanResponse,
  HealthResponse,
} from './http-contract.js';
export {
  ExecRequestSchema,
  WorkspaceRequestSchema,
  WorkspaceResponseSchema,
  WorkspaceCleanResponseSchema,
  HealthResponseSchema,
} from './http-contract.js';

// ── CLI contract ───────────────────────────────────────────────────────────
export type {
  CliExecArgs,
  CliWorkspacePrepareArgs,
  CliWorkspaceCleanArgs,
  CliInstinctFlushArgs,
  CliExitCode,
} from './cli-contract.js';
export { CLI_EXIT_CODES, buildCliCommand } from './cli-contract.js';

// ── SSE events ─────────────────────────────────────────────────────────────
export type {
  SseEvent,
  SseStdoutEvent,
  SseStderrEvent,
  SseExitEvent,
  SseErrorEvent,
} from './sse-events.js';
export {
  SseEventSchema,
  SseStdoutEventSchema,
  SseStderrEventSchema,
  SseExitEventSchema,
  SseErrorEventSchema,
  isSseStdoutEvent,
  isSseStderrEvent,
  isSseExitEvent,
  isSseErrorEvent,
  toSseLine,
  toNdjsonLine,
} from './sse-events.js';

// ── Run mode ───────────────────────────────────────────────────────────────
export type { RunMode, RunModeConfig } from './run-mode.js';
export { RunModeSchema, RunModeConfigSchema } from './run-mode.js';
