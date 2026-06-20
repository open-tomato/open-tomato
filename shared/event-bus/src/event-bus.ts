/**
 * @module event-bus
 *
 * Topic-based publish/subscribe event bus with three-level routing priority:
 *
 * 1. **Direct target** — `event.target` is set; the bus delivers only to
 *    subscribers whose `pattern` equals `event.target`, bypassing topic
 *    pattern matching entirely.
 * 2. **Specific subscribers** — non-wildcard patterns that match the event
 *    topic via {@link matchTopic}.
 * 3. **Wildcard / fallback subscribers** — patterns containing `*` that
 *    match the event topic (e.g. `"impl.*"`, `"*.done"`, `"*"`).
 *
 * Observers sit outside the routing priority system: every published event
 * is delivered to all observers synchronously before routing begins.
 */

import type {
  BusEvent,
  EventBusOptions,
  ObserverHandler,
  Subscription,
  SubscriptionHandler,
} from './types.js';

import { appendEvent, readEvents } from './persistence.js';
import { isWildcardPattern, matchTopic } from './topic.js';

export class EventBus {
  private readonly persistencePath: string | undefined;
  private subscriptions: Subscription[];
  private observers: ObserverHandler[];

  constructor(options: EventBusOptions = {}) {
    this.persistencePath = options.persistencePath;
    this.subscriptions = [];
    this.observers = [];
  }

  /**
   * Registers a subscription handler for the given topic pattern.
   *
   * Supported patterns: exact (`"build.done"`), suffix wildcard (`"impl.*"`),
   * prefix wildcard (`"*.done"`), and global wildcard (`"*"`).
   *
   * @param pattern - The topic pattern to subscribe to.
   * @param handler - Async or sync callback invoked when a matching event is published.
   * @returns An unsubscribe function that removes this subscription when called.
   *
   * @example
   * const unsubscribe = bus.subscribe('build.done', async (event) => {
   *   console.log(event.payload);
   * });
   * unsubscribe(); // removes the subscription
   */
  subscribe(pattern: string, handler: SubscriptionHandler): () => void {
    const subscription: Subscription = {
      pattern,
      handler,
      isWildcard: isWildcardPattern(pattern),
    };
    this.subscriptions = [...this.subscriptions, subscription];

    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    };
  }

  /**
   * Registers a read-only observer that receives every published event.
   *
   * Observers are notified synchronously before routing. They do not
   * participate in the three-level routing priority and cannot be used
   * to route events. Errors thrown by observers are caught and logged.
   *
   * @param fn - Observer callback invoked for every published event.
   * @returns A removal function that deregisters the observer when called.
   *
   * @example
   * const remove = bus.addObserver((event) => tuiDisplay.render(event));
   * remove(); // removes the observer
   */
  addObserver(fn: ObserverHandler): () => void {
    this.observers = [...this.observers, fn];

    return () => {
      this.observers = this.observers.filter((o) => o !== fn);
    };
  }

  /**
   * Publishes an event to all matching subscribers and observers.
   *
   * Steps performed in order:
   * 1. Stamp `ts` on the event if not already set.
   * 2. Persist to JSONL if `persistencePath` is configured.
   * 3. Notify all observers synchronously (errors caught per observer).
   * 4. Route to handlers using three-level priority.
   *
   * @param event - The event to publish.
   *
   * @example
   * await bus.publish({ topic: 'build.done', payload: '{}', source: 'builder' });
   */
  async publish(event: BusEvent): Promise<void> {
    const stamped: BusEvent = {
      ...event,
      ts: event.ts ?? new Date().toISOString(),
    };

    if (this.persistencePath !== undefined) {
      await appendEvent(this.persistencePath, stamped);
    }

    this.notifyObservers(stamped);
    await this.route(stamped);
  }

  /**
   * Replays all events stored in the given JSONL file by publishing each
   * one through the normal routing pipeline.
   *
   * Persistence is skipped during replay — events are not re-appended to
   * any JSONL file regardless of whether `persistencePath` is configured.
   *
   * @param filePath - Path to the JSONL file to replay from.
   *
   * @example
   * await bus.replayFromFile('./events.jsonl');
   */
  async replayFromFile(filePath: string): Promise<void> {
    const events = await readEvents(filePath);
    for (const event of events) {
      this.notifyObservers(event);
      await this.route(event);
    }
  }

  /**
   * Dispatches the event to the resolved handler list, catching and logging
   * per-handler errors so that a failing handler does not block subsequent ones.
   */
  private async route(event: BusEvent): Promise<void> {
    const handlers = this.resolveHandlers(event);
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err: unknown) {
        console.error('[event-bus] Handler error:', err);
      }
    }
  }

  /**
   * Returns the ordered list of handlers to invoke for the given event,
   * applying three-level routing priority:
   *
   * 1. If `event.target` is set, return only subscriptions whose `pattern`
   *    exactly equals `event.target` (direct routing — not a topic pattern match).
   * 2. Otherwise collect all non-wildcard subscriptions that match the topic.
   * 3. Then collect all wildcard subscriptions that match the topic.
   *
   * The returned array preserves registration order within each tier.
   *
   * Note: `human.*` topic events (e.g. `human.prompt`, `human.response`) are
   * routed normally through the subscription system. Use `bus.subscribe('human.*', handler)`
   * to handle all human queue events.
   */
  private resolveHandlers(event: BusEvent): SubscriptionHandler[] {
    if (event.target !== undefined) {
      return this.subscriptions
        .filter((s) => s.pattern === event.target)
        .map((s) => s.handler);
    }

    const specific = this.subscriptions
      .filter((s) => !s.isWildcard && matchTopic(s.pattern, event.topic))
      .map((s) => s.handler);

    const wildcards = this.subscriptions
      .filter((s) => s.isWildcard && matchTopic(s.pattern, event.topic))
      .map((s) => s.handler);

    return [...specific, ...wildcards];
  }

  /**
   * Notifies all observers synchronously, catching errors per observer.
   */
  private notifyObservers(event: BusEvent): void {
    for (const observer of this.observers) {
      try {
        observer(event);
      } catch (err: unknown) {
        console.error('[event-bus] Observer error:', err);
      }
    }
  }
}
