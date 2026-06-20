import type { PromptContext, PromptSection } from '../types/index.js';

/**
 * Section 9 — Event Writing.
 *
 * Renders a static block of rules governing how and when the agent may emit
 * events onto the event bus. These rules are always present in the assembled
 * prompt regardless of the current hat topology or active hats — they form
 * an invariant constraint on agent behaviour.
 *
 * The rules follow RFC 2119 keyword conventions (MUST, MUST NOT, SHOULD, MAY)
 * and cover:
 *
 * - Topic authorisation (only publish to topics declared in your hat's
 *   `publishTopics`)
 * - Payload schema (payloads MUST be valid JSON objects)
 * - Idempotency (include a unique event id so consumers can deduplicate)
 * - Error signalling (emit an error event rather than silently failing)
 * - Ordering (emit events only after the producing action has completed)
 *
 * This section never returns an empty string — it is unconditionally included
 * in every assembled prompt.
 *
 * @example
 * ```typescript
 * const section = new EventWritingSection();
 * const output = section.render(context);
 * // ## EVENT WRITING
 * //
 * // Follow these rules whenever you emit an event:
 * // ...
 * ```
 */
export class EventWritingSection implements PromptSection {
  readonly name = 'event-writing';

  /**
   * Renders the event-writing rules block.
   *
   * The output is identical for every context because these rules are static
   * invariants, not context-derived content.
   *
   * @param _context - Unused; accepted to satisfy the {@link PromptSection}
   *   interface.
   * @returns The rendered event-writing rules block.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_context: PromptContext): string {
    return EVENT_WRITING_BLOCK;
  }
}

const EVENT_WRITING_BLOCK = `## EVENT WRITING

Follow these rules whenever you emit an event:

1. **MUST** only publish to topics listed in your active hat's \`publishTopics\`. Emitting to an unauthorised topic is a protocol violation and MUST be treated as an error.
2. **MUST** include a unique \`id\` field (e.g. a UUID v4) in every event payload so that consumers can deduplicate retried or replayed events.
3. **MUST** emit events only after the action that produces them has completed successfully. Never emit speculatively before the producing step is done.
4. **MUST NOT** emit an event whose payload contains circular references or values that cannot be serialised to JSON.
5. **SHOULD** include a \`timestamp\` field (ISO 8601 UTC) in every event payload to aid debugging and ordering.
6. **SHOULD** emit a dedicated error event on the hat's error topic whenever a step fails, rather than silently dropping the failure.
7. **MAY** batch multiple events into a single emission when the consuming hat explicitly supports batch payloads, but each event in the batch MUST still carry its own \`id\`.`;
