import type { PendingEvent } from '@open-tomato/types';

/**
 * Source of pending events for a given hat in the agent loop.
 */
export interface EventSource {
  /**
   * Returns all pending events addressed to the specified hat.
   */
  getPendingEvents(hatId: string): Promise<PendingEvent[]>;
}
