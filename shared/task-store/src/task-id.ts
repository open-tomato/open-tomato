/**
 * Per-millisecond counter used to prevent collisions within the same timestamp.
 * Resets to 0 whenever the millisecond ticks over.
 */
let lastTimestamp = 0;
let counter = 0;

/**
 * Generates a unique task identifier in the format `task-{timestamp}-{hex}`.
 *
 * Format:
 * - `task-` — fixed prefix
 * - `{timestamp}` — milliseconds since Unix epoch (`Date.now()`)
 * - `{hex}` — 4-character lowercase hexadecimal suffix derived from a
 *   per-millisecond monotonic counter (0x0000–0xffff, wrapping)
 *
 * Uniqueness guarantees:
 * - The timestamp component makes IDs monotonically increasing across time.
 * - Within the same millisecond, the counter increments with each call,
 *   guaranteeing uniqueness for up to 65 536 calls per millisecond.
 * - Across milliseconds, the counter resets to 0 so the hex portion always
 *   starts from `0000` in the new millisecond.
 * - Not cryptographically random; do not use as a security token.
 *
 * @returns A string of the form `task-1718000000000-0001`.
 */
export function generateTaskId(): string {
  const timestamp = Date.now();
  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp;
    counter = 0;
  }
  const hex = (counter++ % 0x10000).toString(16).padStart(4, '0');
  return `task-${timestamp}-${hex}`;
}
