/**
 * @packageDocumentation
 * RPC server that wires together a transport, command handler, and event bus
 * into a single cohesive unit.
 *
 * The server implements a **two-process architecture**: the orchestrator runs in
 * one process and communicates with external consumers (TUI clients, web
 * dashboards, IDE integrations) via a pluggable {@link RpcTransport}.
 *
 * **Inbound flow:** The server reads validated commands from the transport's
 * {@link RpcTransport.commands} async iterable and dispatches each one to the
 * {@link RpcCommandHandler}, which invokes the appropriate orchestrator hook.
 *
 * **Outbound flow:** The server subscribes the transport's
 * {@link RpcTransport.emit} method to the {@link RpcEventBus}. Any event
 * published to the bus — whether from the command handler, the orchestration
 * loop, or any other producer — is serialized and sent through the transport.
 *
 * **Transport ownership:** The server does not create or own the underlying
 * transport resource (stream, socket). The caller provides a pre-configured
 * {@link RpcTransport} and retains responsibility for the resource lifecycle.
 * {@link RpcServer.stop} calls {@link RpcTransport.close} to prevent further
 * writes, but does not destroy the underlying resource.
 *
 * @example
 * ```ts
 * import { RpcServer } from './rpc-server.js';
 * import { RpcEventBus } from './event-bus.js';
 * import { RpcCommandHandler } from './command-handler.js';
 * import { NdjsonTransport } from './transport/ndjson-transport.js';
 *
 * const bus = new RpcEventBus();
 * const handler = new RpcCommandHandler({ bus, hooks: { ... } });
 * const transport = new NdjsonTransport(process.stdin, process.stdout);
 *
 * const server = new RpcServer({ transport, bus, handler });
 *
 * await server.start();
 * ```
 */

import type { RpcCommandHandler } from './command-handler.js';
import type { RpcEventBus } from './event-bus.js';
import type { RpcTransport } from './transport/rpc-transport.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Configuration for constructing an {@link RpcServer}.
 *
 * The caller provides a pre-configured transport and pre-configured bus and
 * handler instances. This keeps the server itself thin — it only orchestrates
 * the data flow between the components.
 */
export interface RpcServerOptions {
  /**
   * The transport to use for reading commands and writing events.
   *
   * Pass an {@link NdjsonTransport} for stdio-based IPC or a
   * {@link WebSocketRpcAdapter} for network-based consumers.
   */
  readonly transport: RpcTransport;

  /** The event bus that distributes events to all subscribers. */
  readonly bus: RpcEventBus;

  /** The command handler that dispatches parsed commands to orchestrator hooks. */
  readonly handler: RpcCommandHandler;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

/**
 * Wires together an {@link RpcTransport}, command handler, and event bus.
 *
 * The server has two lifecycle methods:
 *
 * - {@link start} — begins consuming commands from the transport. The returned
 *   promise resolves when the transport's command iterable completes (e.g. the
 *   remote process closes stdin or the WebSocket disconnects) or when
 *   {@link stop} is called.
 *
 * - {@link stop} — unsubscribes the transport from the bus and closes it so
 *   no further events are emitted. If the command iterable is still active,
 *   it will finish on its next iteration.
 */
export class RpcServer {
  private readonly transport: RpcTransport;
  private readonly bus: RpcEventBus;
  private readonly handler: RpcCommandHandler;

  private unsubscribeEmitter: (() => void) | undefined;
  private running = false;

  constructor(options: RpcServerOptions) {
    this.transport = options.transport;
    this.bus = options.bus;
    this.handler = options.handler;
  }

  /**
   * Subscribe the transport to the event bus and begin consuming commands.
   *
   * Each parsed command is dispatched to the {@link RpcCommandHandler}.
   * Parse and validation errors are published as `error` events on the
   * bus (and therefore emitted through the transport automatically).
   *
   * The returned promise resolves when the transport's command iterable
   * completes or the server is stopped. If the transport stream errors,
   * the error is caught, published as an `error` event, and the server
   * is stopped automatically via {@link stop}.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.unsubscribeEmitter = this.bus.subscribe((event) => {
      try {
        this.transport.emit(event);
      } catch {
        // Transport emit failed (e.g. closed or stream errored).
        // Silently discard — the bus error-isolation will re-publish a
        // CONSUMER_ERROR to other subscribers, which would loop back
        // through this same broken emitter. Catching here breaks that cycle.
      }
    });

    const commandStream = this.transport.commands({
      onError: (parseError) => {
        this.bus.publish({
          event: 'error',
          data: {
            code: parseError.code,
            message: parseError.message,
            timestamp: parseError.timestamp,
          },
        });
      },
    });

    try {
      for await (const command of commandStream) {
        if (!this.running) break;
        await this.handler.dispatch(command);
      }
    } catch (err: unknown) {
      // Stream error (e.g. input stream destroyed, read failure).
      // Publish an error event for any remaining subscribers.
      const message =
        err instanceof Error
          ? err.message
          : 'Unknown transport error';

      this.bus.publish({
        event: 'error',
        data: {
          code: 'TRANSPORT_ERROR',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      this.stop();
    }
  }

  /**
   * Stop the server by unsubscribing the transport from the bus and closing
   * it so no further events are emitted.
   *
   * If the command iterable is still active, the {@link start} loop will exit
   * on its next iteration. The caller is responsible for closing the
   * underlying resource (stream, socket) if immediate shutdown is required.
   */
  stop(): void {
    this.running = false;
    this.unsubscribeEmitter?.();
    this.unsubscribeEmitter = undefined;
    this.transport.close();
  }
}
