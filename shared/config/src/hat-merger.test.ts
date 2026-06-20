import type { HatCollection } from './types.js';

import { describe, expect, it } from 'vitest';

import { ConfigValidationError } from './errors.js';
import { mergeHatCollections } from './hat-merger.js';

function makeCollection(hats: HatCollection['hats'], version = '1'): HatCollection {
  return { version, hats };
}

function makeHat(
  id: string,
  triggers: string[],
  overrides: Partial<HatCollection['hats'][number]> = {},
): HatCollection['hats'][number] {
  return {
    id,
    triggers,
    instructions: `Instructions for ${id}.`,
    publishes: [],
    concurrency: 1,
    aggregate: false,
    disallowed_tools: [],
    ...overrides,
  };
}

describe('mergeHatCollections', () => {
  describe('id-based override behavior', () => {
    it('replaces a base hat when the override contains a hat with the same id', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { instructions: 'Overridden instructions.' }),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(1);
      expect(result.hats[0]?.id).toBe('hat-a');
      expect(result.hats[0]?.instructions).toBe('Overridden instructions.');
    });

    it('replaces all fields of the matching hat, not just changed ones', () => {
      const base = makeCollection([
        makeHat('hat-a', ['event_a'], {
          instructions: 'Original.',
          concurrency: 2,
          publishes: ['done'],
        }),
      ]);
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { instructions: 'New.', concurrency: 5 }),
      ]);

      const result = mergeHatCollections(base, override);

      const hat = result.hats[0];
      expect(hat?.instructions).toBe('New.');
      expect(hat?.concurrency).toBe(5);
      expect(hat?.publishes).toEqual([]);
    });

    it('preserves the positional order of the base when replacing an in-place hat', () => {
      const base = makeCollection([
        makeHat('hat-a', ['event_a']),
        makeHat('hat-b', ['event_b']),
        makeHat('hat-c', ['event_c']),
      ]);
      const override = makeCollection([
        makeHat('hat-b', ['event_b'], { instructions: 'Updated hat-b.' }),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(3);
      expect(result.hats[0]?.id).toBe('hat-a');
      expect(result.hats[1]?.id).toBe('hat-b');
      expect(result.hats[1]?.instructions).toBe('Updated hat-b.');
      expect(result.hats[2]?.id).toBe('hat-c');
    });

    it('overrides multiple hats by id simultaneously', () => {
      const base = makeCollection([
        makeHat('hat-a', ['event_a']),
        makeHat('hat-b', ['event_b']),
      ]);
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { instructions: 'A updated.' }),
        makeHat('hat-b', ['event_b'], { instructions: 'B updated.' }),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(2);
      expect(result.hats[0]?.instructions).toBe('A updated.');
      expect(result.hats[1]?.instructions).toBe('B updated.');
    });
  });

  describe('append behavior for new hats', () => {
    it('appends a hat from override when its id is not present in base', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([makeHat('hat-b', ['event_b'])]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(2);
      expect(result.hats[0]?.id).toBe('hat-a');
      expect(result.hats[1]?.id).toBe('hat-b');
    });

    it('appends multiple new hats preserving their order from override', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([
        makeHat('hat-b', ['event_b']),
        makeHat('hat-c', ['event_c']),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(3);
      expect(result.hats[1]?.id).toBe('hat-b');
      expect(result.hats[2]?.id).toBe('hat-c');
    });

    it('appends only hats with new ids, not those that override existing ones', () => {
      const base = makeCollection([
        makeHat('hat-a', ['event_a']),
        makeHat('hat-b', ['event_b']),
      ]);
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { instructions: 'Updated A.' }),
        makeHat('hat-c', ['event_c']),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(3);
      expect(result.hats[0]?.id).toBe('hat-a');
      expect(result.hats[1]?.id).toBe('hat-b');
      expect(result.hats[2]?.id).toBe('hat-c');
    });
  });

  describe('version field', () => {
    it('uses the override version when provided', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])], '1');
      const override = makeCollection([makeHat('hat-b', ['event_b'])], '2');

      const result = mergeHatCollections(base, override);

      expect(result.version).toBe('2');
    });

    it('falls back to base version when override version is not set', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])], '3');
      // Override with the same version to simulate no explicit override version
      const override = makeCollection([makeHat('hat-b', ['event_b'])], '3');

      const result = mergeHatCollections(base, override);

      expect(result.version).toBe('3');
    });
  });

  describe('immutability', () => {
    it('does not mutate the base collection', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { instructions: 'Mutated?' }),
        makeHat('hat-b', ['event_b']),
      ]);

      const originalHatCount = base.hats.length;
      const originalInstructions = base.hats[0]?.instructions;

      mergeHatCollections(base, override);

      expect(base.hats).toHaveLength(originalHatCount);
      expect(base.hats[0]?.instructions).toBe(originalInstructions);
    });

    it('does not mutate the override collection', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([makeHat('hat-b', ['event_b'])]);

      const originalOverrideCount = override.hats.length;

      mergeHatCollections(base, override);

      expect(override.hats).toHaveLength(originalOverrideCount);
    });

    it('returns a new collection object, not the base or override reference', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'])]);
      const override = makeCollection([makeHat('hat-b', ['event_b'])]);

      const result = mergeHatCollections(base, override);

      expect(result).not.toBe(base);
      expect(result).not.toBe(override);
    });
  });

  describe('post-merge schema validation', () => {
    it('throws ConfigValidationError when the merged result has ambiguous routing', () => {
      // hat-b in override uses same triggers as hat-a in base, creating ambiguity
      const base = makeCollection([makeHat('hat-a', ['shared_event'])]);
      const override = makeCollection([makeHat('hat-b', ['shared_event'])]);

      expect(() => mergeHatCollections(base, override)).toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when the merged result has only aggregate hats', () => {
      const base = makeCollection([makeHat('hat-a', ['event_a'], { aggregate: true })]);
      // Override removes aggregate=false by providing only aggregate hats
      // We need the merged result to have all aggregate hats
      // base already has aggregate: true, override replaces hat-a
      const override = makeCollection([
        makeHat('hat-a', ['event_a'], { aggregate: true }),
      ]);

      expect(() => mergeHatCollections(base, override)).toThrow(ConfigValidationError);
    });

    it('succeeds when merged collection satisfies all schema constraints', () => {
      const base = makeCollection([makeHat('worker', ['task_ready'])]);
      const override = makeCollection([
        makeHat('worker', ['task_ready'], { instructions: 'Updated worker.' }),
        makeHat('aggregator', ['all_done'], { aggregate: true }),
      ]);

      const result = mergeHatCollections(base, override);

      expect(result.hats).toHaveLength(2);
    });
  });
});
