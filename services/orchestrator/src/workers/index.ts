export type { ExecOptions, WorkerClient, WorkerProcess } from './client.js';
export { classifyExitError } from './error-classifier.js';
export type { ErrorClass } from './error-classifier.js';
export { withExponentialBackoff } from './backoff.js';
export type { BackoffOptions } from './backoff.js';
export type {
  BackendDescriptor,
  OutputFormat,
  PromptMode,
} from './backend-descriptor.js';
export { BackendFactory } from './backend-factory.js';
export { BackendDetector } from './backend-detector.js';
export type { SubprocessRunner } from './backend-detector.js';
export type { StreamHandler, CompletionMeta } from './stream-handler.js';
export { parseClaudeStream } from './parsers/claude-stream-parser.js';
export type {
  ClaudeEvent,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  SystemEvent,
  AssistantEvent,
  UserEvent,
  ResultEvent,
} from './parsers/claude-stream-parser.js';
export { parseTextStream } from './parsers/text-stream-parser.js';
export type { TextStreamParserOptions } from './parsers/text-stream-parser.js';
export { selectStreamParser } from './parsers/index.js';
export type { StreamParserFn } from './parsers/index.js';
export { CircuitBreaker } from './circuit-breaker.js';
export type {
  BackendCircuitState,
  CircuitBreakerOptions,
} from './circuit-breaker.js';
export {
  FallbackChainWorkerClient,
  ClassifiedError,
} from './fallback-chain-worker-client.js';
export type { ProcessSpawner } from './fallback-chain-worker-client.js';
export { GeminiSpawnWorkerClient } from './gemini-spawn-worker-client.js';
export { resolveBackendOverride } from './resolve-backend-override.js';
export { ConsoleFallbackEventSink } from './fallback-event-sink.js';
export type {
  FallbackEventSink,
  FallbackEvent,
  BackendSelectedEvent,
  BackendFailedEvent,
  BackendFallbackEvent,
  ChainExhaustedEvent,
  ChainSuccessEvent,
} from './fallback-event-sink.js';
