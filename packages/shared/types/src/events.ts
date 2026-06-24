/**
 * A single event that the agent must handle in the current iteration.
 */
export interface PendingEvent {
  /** Unique event identifier. */
  id: string;

  /** Bus topic this event was published on. */
  topic: string;

  /** Serialisable event payload. */
  payload: unknown;

  /** Id of the hat this event is addressed to. */
  forHatId: string;
}
