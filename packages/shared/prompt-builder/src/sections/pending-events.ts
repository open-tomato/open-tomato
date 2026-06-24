import type { PendingEvent, PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 6 — Pending Events.
 *
 * Renders the list of pending events from {@link PromptContext.pendingEvents}
 * as a formatted block prefixed with "You MUST handle the following events:".
 *
 * Each event is rendered as a numbered item showing its topic, target hat, and
 * JSON-serialised payload so the agent has full detail on what it must process.
 *
 * When `pendingEvents` is empty the section returns an empty string so the
 * block is omitted from the assembled prompt.
 *
 * @example
 * ```typescript
 * const section = new PendingEventsSection();
 * const output = section.render(context);
 * // ## PENDING EVENTS
 * //
 * // You MUST handle the following events:
 * //
 * // 1. [user-input] → hat:planner | {"message":"Hello"}
 * ```
 */
export class PendingEventsSection implements PromptSection {
  readonly name = 'pending-events';

  /**
   * Renders the pending events block given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered pending events block, or an empty string when
   *   `pendingEvents` is empty.
   */
  render(context: PromptContext): string {
    if (context.pendingEvents.length === 0) {
      return '';
    }

    const items = context.pendingEvents
      .map((event, i) => formatEvent(event, i + 1))
      .join('\n');

    return `## PENDING EVENTS\n\nYou MUST handle the following events:\n\n${items}`;
  }
}

/**
 * Formats a single pending event as a numbered list item.
 *
 * @param event - The pending event to format.
 * @param index - The 1-based position in the list.
 * @returns A string of the form `N. [topic] → hat:hatId | payload`.
 */
function formatEvent(event: PendingEvent, index: number): string {
  const payload = safeSerialize(event.payload);
  return `${index}. [${event.topic}] → hat:${event.forHatId} | ${payload}`;
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
function safeSerialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
