import { describe, expect, it } from 'bun:test';

import { WaveDetector } from '../wave/wave-detector.js';

function makeWaveLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    topic: 'research',
    payload: 'task-1',
    wave_id: 'w-001',
    wave_index: 0,
    wave_total: 3,
    ...overrides,
  });
}

describe('WaveDetector', () => {
  const detector = new WaveDetector();

  describe('detectWaveEvents', () => {
    it('returns empty array for JSONL with no wave metadata', () => {
      const lines = [
        JSON.stringify({ topic: 'ping', payload: 'hello' }),
        JSON.stringify({ some: 'other', data: 42 }),
      ];

      expect(detector.detectWaveEvents(lines)).toEqual([]);
    });

    it('parses valid wave events from JSONL lines', () => {
      const lines = [
        makeWaveLine({ wave_index: 0 }),
        makeWaveLine({ wave_index: 1 }),
      ];

      const events = detector.detectWaveEvents(lines);
      expect(events).toHaveLength(2);
      expect(events[0]!.wave_index).toBe(0);
      expect(events[1]!.wave_index).toBe(1);
    });

    it('handles malformed JSONL lines without throwing', () => {
      const lines = [
        'not valid json{{{',
        makeWaveLine({ wave_index: 0 }),
        '}{broken',
        '',
        makeWaveLine({ wave_index: 1 }),
      ];

      const events = detector.detectWaveEvents(lines);
      expect(events).toHaveLength(2);
    });

    it('skips lines missing required wave fields', () => {
      const lines = [
        JSON.stringify({ topic: 'x', payload: 'y', wave_id: 'w-1' }),
        makeWaveLine(),
      ];

      const events = detector.detectWaveEvents(lines);
      expect(events).toHaveLength(1);
    });
  });

  describe('groupByWaveId', () => {
    it('groups events correctly by wave_id', () => {
      const events = [
        { topic: 'a', payload: 'p1', wave_id: 'w-1', wave_index: 0, wave_total: 2 },
        { topic: 'a', payload: 'p2', wave_id: 'w-2', wave_index: 0, wave_total: 1 },
        { topic: 'a', payload: 'p3', wave_id: 'w-1', wave_index: 1, wave_total: 2 },
      ];

      const groups = detector.groupByWaveId(events);
      expect(groups.size).toBe(2);
      expect(groups.get('w-1')).toHaveLength(2);
      expect(groups.get('w-2')).toHaveLength(1);
    });

    it('returns empty map for empty input', () => {
      expect(detector.groupByWaveId([]).size).toBe(0);
    });
  });

  describe('validateWaveGroup', () => {
    it('returns a valid WaveGroup for consistent events', () => {
      const events = [
        { topic: 'research', payload: 'p2', wave_id: 'w-1', wave_index: 1, wave_total: 2 },
        { topic: 'research', payload: 'p1', wave_id: 'w-1', wave_index: 0, wave_total: 2 },
      ];

      const group = detector.validateWaveGroup(events);
      expect(group).toEqual({
        wave_id: 'w-1',
        topic: 'research',
        total: 2,
        payloads: ['p1', 'p2'],
      });
    });

    it('rejects groups with mismatched topic values', () => {
      const events = [
        { topic: 'research', payload: 'p1', wave_id: 'w-1', wave_index: 0, wave_total: 2 },
        { topic: 'analysis', payload: 'p2', wave_id: 'w-1', wave_index: 1, wave_total: 2 },
      ];

      expect(detector.validateWaveGroup(events)).toBeNull();
    });

    it('rejects groups with mismatched wave_total values', () => {
      const events = [
        { topic: 'research', payload: 'p1', wave_id: 'w-1', wave_index: 0, wave_total: 2 },
        { topic: 'research', payload: 'p2', wave_id: 'w-1', wave_index: 1, wave_total: 3 },
      ];

      expect(detector.validateWaveGroup(events)).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(detector.validateWaveGroup([])).toBeNull();
    });

    it('sorts payloads by wave_index', () => {
      const events = [
        { topic: 't', payload: 'third', wave_id: 'w-1', wave_index: 2, wave_total: 3 },
        { topic: 't', payload: 'first', wave_id: 'w-1', wave_index: 0, wave_total: 3 },
        { topic: 't', payload: 'second', wave_id: 'w-1', wave_index: 1, wave_total: 3 },
      ];

      const group = detector.validateWaveGroup(events);
      expect(group!.payloads).toEqual(['first', 'second', 'third']);
    });
  });

  describe('detectFirstWave', () => {
    it('returns null for JSONL with no wave metadata', () => {
      const lines = [
        JSON.stringify({ topic: 'ping', payload: 'hello' }),
      ];

      expect(detector.detectFirstWave(lines)).toBeNull();
    });

    it('returns the first valid wave group when multiple exist', () => {
      const lines = [
        makeWaveLine({ wave_id: 'w-first', wave_index: 0, wave_total: 2, payload: 'a1' }),
        makeWaveLine({ wave_id: 'w-first', wave_index: 1, wave_total: 2, payload: 'a2' }),
        makeWaveLine({ wave_id: 'w-second', wave_index: 0, wave_total: 1, payload: 'b1' }),
      ];

      const group = detector.detectFirstWave(lines);
      expect(group).not.toBeNull();
      expect(group!.wave_id).toBe('w-first');
      expect(group!.payloads).toEqual(['a1', 'a2']);
    });

    it('skips an invalid first group and returns the next valid one', () => {
      const lines = [
        // First group — mismatched topics → invalid
        makeWaveLine({ wave_id: 'w-bad', wave_index: 0, wave_total: 2, topic: 'alpha' }),
        makeWaveLine({ wave_id: 'w-bad', wave_index: 1, wave_total: 2, topic: 'beta' }),
        // Second group — valid
        makeWaveLine({ wave_id: 'w-good', wave_index: 0, wave_total: 1, payload: 'ok' }),
      ];

      const group = detector.detectFirstWave(lines);
      expect(group).not.toBeNull();
      expect(group!.wave_id).toBe('w-good');
    });

    it('returns null when all groups are invalid', () => {
      const lines = [
        makeWaveLine({ wave_id: 'w-bad', wave_index: 0, wave_total: 2, topic: 'x' }),
        makeWaveLine({ wave_id: 'w-bad', wave_index: 1, wave_total: 2, topic: 'y' }),
      ];

      expect(detector.detectFirstWave(lines)).toBeNull();
    });

    it('handles malformed JSONL lines without throwing', () => {
      const lines = [
        '{broken json',
        makeWaveLine({ wave_index: 0, wave_total: 1, payload: 'ok' }),
      ];

      const group = detector.detectFirstWave(lines);
      expect(group).not.toBeNull();
      expect(group!.payloads).toEqual(['ok']);
    });
  });
});
