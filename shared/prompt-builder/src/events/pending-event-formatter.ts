import type { PendingEvent } from '@open-tomato/types';

/**
 * Formats a list of {@link PendingEvent} entries into the Section 6 (Pending
 * Events) block of the assembled prompt.
 *
 * The output uses the canonical format expected by the agent:
 * - A `## PENDING EVENTS` header
 * - A "You MUST handle the following events:" preamble
 * - A numbered list of events, each showing its topic, target hat, and
 *   JSON-serialised payload
 *
 * Returns an empty string when the list is empty so the block can be omitted
 * from the assembled prompt.
 *
 * @example
 * ```typescript
 * const formatter = new PendingEventFormatter();
 * const output = formatter.format(events);
 * // ## PENDING EVENTS
 * //
 * // You MUST handle the following events:
 * //
 * // 1. [user-input] → hat:planner | {"message":"Hello"}
 * ```
 */
export class PendingEventFormatter {
  /**
   * Formats a single pending event as a numbered list item.
   *
   * @param event - The pending event to format.
   * @param index - The 1-based position of the event in the list.
   * @returns A string of the form `{index}. [{topic}] → hat:{forHatId} | {payload}`.
   */
  formatItem(event: PendingEvent, index: number): string {
    const payload = this.safeSerialize(event.payload);
    return `${index}. [${event.topic}] → hat:${event.forHatId} | ${payload}`;
  }

  /**
   * Formats a list of pending events into the full Section 6 block.
   *
   * Returns an empty string when `events` is empty so the section can be
   * omitted from the assembled prompt.
   *
   * @param events - The pending events to format.
   * @returns The complete Section 6 block string, or an empty string when
   *   `events` is empty.
   */
  format(events: PendingEvent[]): string {
    if (events.length === 0) {
      return '';
    }

    const items = events
      .map((event, i) => this.formatItem(event, i + 1))
      .join('\n');

    return `## PENDING EVENTS\n\nYou MUST handle the following events:\n\n${items}`;
  }

  /**
   * Safely serialises a value to a JSON string.
   *
   * Falls back to `"[unserializable]"` when {@link JSON.stringify} throws (e.g.
   * circular references or `BigInt` values).
   *
   * @param value - The value to serialise.
   * @returns The JSON string, or `"[unserializable]"` on failure.
   */
  private safeSerialize(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }
}
