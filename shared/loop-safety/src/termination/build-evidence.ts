import type { BuildEvidence } from './backpressure-validator.js';

/** The topic string for a blocked build event. */
export const BUILD_BLOCKED_TOPIC = 'build.blocked';

/**
 * Structured payload emitted when a build is blocked due to failing evidence.
 */
export interface BuildBlockedEvent {
  /** The event topic identifier. */
  topic: typeof BUILD_BLOCKED_TOPIC;
  /** The task ID that produced the failing build evidence. */
  taskId: string;
  /** The list of evidence fields that reported `'fail'`. */
  failingFields: Array<keyof BuildEvidence>;
  /** ISO-8601 timestamp when the event was synthesized. */
  timestamp: string;
}

/**
 * Synthesize a `build.blocked` event payload from failing build evidence.
 *
 * Only evidence fields set to `'fail'` are included in `failingFields`.
 * Fields set to `'pass'` or `'skip'` are not reported.
 *
 * @param taskId - The identifier of the task that produced the evidence.
 * @param evidence - The build evidence object to inspect.
 * @returns A structured {@link BuildBlockedEvent} payload.
 */
export function synthesizeBlockedEvent(
  taskId: string,
  evidence: BuildEvidence,
): BuildBlockedEvent {
  const knownFields: Array<keyof BuildEvidence> = ['tests', 'lint', 'typecheck'];

  const failingFields = knownFields.filter((field) => evidence[field] === 'fail');

  return {
    topic: BUILD_BLOCKED_TOPIC,
    taskId,
    failingFields,
    timestamp: new Date().toISOString(),
  };
}
