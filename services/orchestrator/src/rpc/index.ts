/**
 * @packageDocumentation
 * Top-level barrel for the RPC protocol module.
 *
 * Re-exports the server, event bus, command handler, stream handler,
 * state snapshot, and all transport and type primitives. Consumers
 * should import from this barrel rather than reaching into individual
 * sub-modules:
 *
 * ```ts
 * import { RpcServer, RpcEventBus, NdjsonTransport } from './rpc/index.js';
 * import type { RpcEvent, RpcCommand } from './rpc/index.js';
 * ```
 */

// Server
export { RpcServer } from './rpc-server.js';

export type { RpcServerOptions } from './rpc-server.js';

// Event bus
export { RpcEventBus } from './event-bus.js';

export type { EventConsumer } from './event-bus.js';

// Command handler
export { RpcCommandHandler } from './command-handler.js';

export type {
  CommandHooks,
  RpcCommandHandlerOptions,
} from './command-handler.js';

// Stream handler
export { RpcStreamHandler } from './rpc-stream-handler.js';

export type { RpcStreamHandlerOptions } from './rpc-stream-handler.js';

// State snapshot
export { captureStateSnapshot, stateSnapshotSchema } from './state-snapshot.js';

export type {
  OrchestratorContext,
  StateSnapshot,
} from './state-snapshot.js';

// Transport primitives
export {
  NdjsonEmitter,
  NdjsonTransport,
  parseNdjsonStream,
  WebSocketRpcAdapter,
} from './transport/index.js';

export type {
  NdjsonParseError,
  ParseNdjsonOptions,
  RpcTransport,
  TransportParseOptions,
  WebSocketLike,
} from './transport/index.js';

// Types — re-export entire barrel
export * from './types/index.js';
