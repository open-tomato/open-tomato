/**
 * @packageDocumentation
 * Fan-out event bus for distributing {@link RpcEvent} instances to multiple
 * consumers.
 *
 * The bus uses a `Set` internally so the same consumer reference is only
 * registered once. Publishing is synchronous — each consumer is invoked in
 * registration order. If a consumer throws, the error is caught and an
 * internal `error` event is published to all *other* consumers so that one
 * misbehaving subscriber cannot break the rest of the pipeline.
 *
 * @example
 * ```ts
 * import { RpcEventBus } from './event-bus.js';
 *
 * const bus = new RpcEventBus();
 * const unsub = bus.subscribe((event) => console.dir(event));
 * bus.publish({ event: 'loop_started', data: { ... } });
 * unsub(); // stop receiving events
 * ```
 */

import type { RpcEvent } from './types/index.js';

/**
 * Callback signature accepted by {@link RpcEventBus.subscribe}.
 *
 * @param event - The RPC event being broadcast.
 */
export type EventConsumer = (event: RpcEvent) => void;

/**
 * Synchronous fan-out event bus for RPC events.
 *
 * **Error isolation guarantee:** When {@link publish} is called, every
 * registered consumer is invoked. If a consumer throws, the exception is
 * caught and an `error` event is published to the remaining consumers in
 * the current pass. Errors thrown by consumers during the error-event
 * re-publish are silently discarded to prevent infinite recursion.
 */
export class RpcEventBus {
  /** Active consumer set — insertion-ordered iteration. */
  private readonly consumers = new Set<EventConsumer>();

  /**
   * Register a consumer to receive all future events.
   *
   * @param fn - The consumer callback.
   * @returns A zero-argument function that removes the consumer when called.
   */
  subscribe(fn: EventConsumer): () => void {
    this.consumers.add(fn);
    return () => {
      this.consumers.delete(fn);
    };
  }

  /**
   * Broadcast an event to every registered consumer.
   *
   * Each consumer is wrapped in a `try/catch`. If a consumer throws, an
   * `error` event describing the failure is published to all *other*
   * consumers. Errors during that secondary publish are silently discarded
   * to prevent infinite loops.
   *
   * @param event - The RPC event to broadcast.
   */
  publish(event: RpcEvent): void {
    for (const fn of this.consumers) {
      try {
        fn(event);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unknown consumer error';

        const errorEvent: RpcEvent = {
          event: 'error',
          data: {
            code: 'CONSUMER_ERROR',
            message,
            timestamp: new Date().toISOString(),
          },
        };

        for (const other of this.consumers) {
          if (other === fn) continue;
          try {
            other(errorEvent);
          } catch {
            // Silently discard to prevent infinite recursion.
          }
        }
      }
    }
  }
}
