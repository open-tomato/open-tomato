import type { WaveEvent, WaveGroup } from '@open-tomato/types';

/**
 * Detects and groups wave events from JSONL input.
 *
 * Parses raw JSONL lines, identifies entries carrying wave metadata
 * (`wave_id`, `wave_index`, `wave_total`), groups them by `wave_id`,
 * validates consistency, and returns the first valid {@link WaveGroup}.
 */
export class WaveDetector {
  /**
   * Parse JSONL lines and return only those that are valid {@link WaveEvent}s.
   *
   * A line qualifies as a wave event when its parsed JSON object contains
   * all three wave metadata fields: `wave_id`, `wave_index`, and `wave_total`.
   * Malformed lines are silently skipped.
   */
  detectWaveEvents(lines: readonly string[]): WaveEvent[] {
    const events: WaveEvent[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      try {
        const parsed: unknown = JSON.parse(trimmed);

        if (isWaveEvent(parsed)) {
          events.push(parsed);
        }
      } catch {
        // Malformed JSON — skip without throwing
      }
    }

    return events;
  }

  /**
   * Group an array of {@link WaveEvent}s by their `wave_id`.
   *
   * @returns A map keyed by `wave_id` with arrays of events belonging to each wave.
   */
  groupByWaveId(events: readonly WaveEvent[]): Map<string, WaveEvent[]> {
    const groups = new Map<string, WaveEvent[]>();

    for (const event of events) {
      const existing = groups.get(event.wave_id);
      if (existing) {
        existing.push(event);
      } else {
        groups.set(event.wave_id, [event]);
      }
    }

    return groups;
  }

  /**
   * Validate that a set of events forms a consistent {@link WaveGroup}.
   *
   * All events must share the same `topic` and `wave_total`. Returns `null`
   * when the group is empty or any consistency check fails.
   */
  validateWaveGroup(events: readonly WaveEvent[]): WaveGroup | null {
    if (events.length === 0) return null;

    const firstEvent = events[0]!;
    const { topic, wave_total, wave_id } = firstEvent;

    for (const event of events) {
      if (event.topic !== topic || event.wave_total !== wave_total) {
        return null;
      }
    }

    const sorted = [...events].sort((a, b) => a.wave_index - b.wave_index);
    const payloads = sorted.map((e) => e.payload);

    return { wave_id, topic, total: wave_total, payloads };
  }

  /**
   * Detect and return the first valid wave group from raw JSONL lines.
   *
   * Parses all lines, groups by `wave_id`, validates each group in
   * insertion order, and returns the first one that passes validation.
   * Subsequent groups are ignored per the one-wave-per-iteration constraint.
   *
   * @returns The first valid {@link WaveGroup}, or `null` if none found.
   */
  detectFirstWave(lines: readonly string[]): WaveGroup | null {
    const events = this.detectWaveEvents(lines);
    if (events.length === 0) return null;

    const groups = this.groupByWaveId(events);

    for (const [, groupEvents] of groups) {
      const group = this.validateWaveGroup(groupEvents);
      if (group !== null) return group;
    }

    return null;
  }
}

/**
 * Type guard that checks whether an unknown value is a valid {@link WaveEvent}.
 */
function isWaveEvent(value: unknown): value is WaveEvent {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['topic'] === 'string' &&
    typeof obj['payload'] === 'string' &&
    typeof obj['wave_id'] === 'string' &&
    typeof obj['wave_index'] === 'number' &&
    typeof obj['wave_total'] === 'number'
  );
}
