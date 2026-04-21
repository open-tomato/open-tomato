/**
 * @packageDocumentation
 * Shared transport interface for the RPC protocol layer.
 *
 * Both the stdio-based {@link NdjsonEmitter}/{@link parseNdjsonStream} pair and
 * the {@link WebSocketRpcAdapter} satisfy this interface, allowing
 * {@link RpcServer} to accept either transport without modification.
 *
 * @example
 * ```ts
 * import type { RpcTransport } from './rpc-transport.js';
 *
 * function createServer(transport: RpcTransport, bus: RpcEventBus) {
 *   bus.subscribe((event) => transport.emit(event));
 *   for await (const command of transport.commands()) {
 *     handler.dispatch(command);
 *   }
 * }
 * ```
 */

import type { NdjsonParseError } from './ndjson-parser.js';
import type { RpcCommand , RpcEvent } from '../types/index.js';

/**
 * Options for the command stream produced by a transport.
 */
export interface TransportParseOptions {
  /**
   * Called when a message cannot be parsed or fails Zod validation.
   *
   * If omitted, malformed messages are silently discarded.
   */
  onError?: (error: NdjsonParseError) => void;
}

/**
 * Unified transport interface for the RPC protocol.
 *
 * A transport is responsible for:
 * 1. **Emitting** serialized {@link RpcEvent} objects to an external consumer.
 * 2. **Producing** an async iterable of validated {@link RpcCommand} objects
 *    from an external source.
 * 3. **Closing** the transport when the server shuts down.
 *
 * Both the NDJSON (stdin/stdout) transport and the WebSocket adapter satisfy
 * this interface.
 */
export interface RpcTransport {
  /**
   * Serialize and send an {@link RpcEvent} to the connected consumer.
   *
   * @param event - The RPC event to emit.
   * @returns `true` if the data was sent immediately, `false` if buffered.
   * @throws If the transport has been {@link RpcTransport.close | closed}.
   */
  emit(event: RpcEvent): boolean;

  /**
   * Return an async iterable that yields validated {@link RpcCommand} objects.
   *
   * The iterable should complete when the underlying connection closes or
   * when {@link close} is called.
   *
   * @param options - Optional parse configuration (e.g. error callback).
   */
  commands(options?: TransportParseOptions): AsyncIterable<RpcCommand>;

  /**
   * Close the transport, preventing further {@link emit} calls and ending
   * the command iterable.
   *
   * The transport does **not** own the underlying resource (stream, socket) —
   * it only marks itself as closed. The caller retains responsibility for
   * destroying the underlying resource if immediate cleanup is required.
   */
  close(): void;
}
