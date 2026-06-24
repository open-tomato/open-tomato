import type { IncomingMessage, RobotService } from '@open-tomato/types';

import { resolveSessionId } from './resolve-session-id.js';

/**
 * Tracks active orchestration loop sessions, each backed by its own
 * {@link RobotService} instance.
 *
 * Incoming messages are routed to the correct service via
 * {@link resolveSessionId}, which inspects `@loop-id` prefixes,
 * `replyToSessionId` metadata, and falls back to a default session.
 */
export class SessionRegistry {
  private readonly sessions: ReadonlyMap<string, RobotService>;
  private readonly defaultSessionId: string;

  constructor(
    sessions: ReadonlyMap<string, RobotService>,
    defaultSessionId: string = 'main',
  ) {
    this.sessions = sessions;
    this.defaultSessionId = defaultSessionId;
  }

  /**
   * Register a new session. Returns a new registry with the added entry.
   */
  register(
    sessionId: string,
    service: RobotService,
  ): SessionRegistry {
    const next = new Map(this.sessions);
    next.set(sessionId, service);
    return new SessionRegistry(next, this.defaultSessionId);
  }

  /**
   * Remove a session. Returns a new registry without the entry.
   */
  unregister(sessionId: string): SessionRegistry {
    const next = new Map(this.sessions);
    next.delete(sessionId);
    return new SessionRegistry(next, this.defaultSessionId);
  }

  /**
   * Look up a service by session ID.
   */
  get(sessionId: string): RobotService | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Resolve an incoming message to the correct {@link RobotService} instance.
   *
   * Uses {@link resolveSessionId} to determine the target session, then
   * looks it up in the registry. Returns `undefined` if no service is
   * registered for the resolved session ID.
   */
  resolve(message: IncomingMessage): RobotService | undefined {
    const sessionId = resolveSessionId(message, this.defaultSessionId);
    return this.sessions.get(sessionId);
  }

  /**
   * Resolve an incoming message and return both the session ID and service.
   */
  resolveWithId(
    message: IncomingMessage,
  ): { readonly sessionId: string; readonly service: RobotService } | undefined {
    const sessionId = resolveSessionId(message, this.defaultSessionId);
    const service = this.sessions.get(sessionId);
    if (!service) return undefined;
    return { sessionId, service };
  }

  /**
   * Number of registered sessions.
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * All registered session IDs.
   */
  sessionIds(): ReadonlyArray<string> {
    return [...this.sessions.keys()];
  }
}
