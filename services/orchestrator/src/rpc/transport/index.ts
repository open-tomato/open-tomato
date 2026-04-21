/**
 * @packageDocumentation
 * Barrel re-export for all RPC transport primitives.
 *
 * This module re-exports the NDJSON emitter/parser (stdio transport), the
 * {@link WebSocketRpcAdapter} (network transport), and the shared
 * {@link RpcTransport} interface that both satisfy.
 *
 * ```ts
 * import { NdjsonEmitter, parseNdjsonStream, WebSocketRpcAdapter } from './rpc/transport/index.js';
 * import type { RpcTransport } from './rpc/transport/index.js';
 * ```
 */

export { NdjsonEmitter } from './ndjson-emitter.js';

export { parseNdjsonStream } from './ndjson-parser.js';

export { NdjsonTransport } from './ndjson-transport.js';

export type {
  NdjsonParseError,
  ParseNdjsonOptions,
} from './ndjson-parser.js';

export type {
  RpcTransport,
  TransportParseOptions,
} from './rpc-transport.js';

export { WebSocketRpcAdapter } from './websocket-adapter.js';

export type { WebSocketLike } from './websocket-adapter.js';
