import { describe, expect, it } from 'vitest';

import { HatCollectionSchema } from '../schemas/hat-collection.schema.js';

import { PRESET_NAMES, resolveBuiltinPreset } from './index.js';

describe('builtin preset YAML files', () => {
  it.each(PRESET_NAMES)('%s parses and validates against HatCollectionSchema', async (name) => {
    const collection = await resolveBuiltinPreset(name);
    const result = HatCollectionSchema.safeParse(collection);
    expect(result.success).toBe(true);
  });

  it('wave-review has at least one aggregate hat and at least one non-aggregate hat', async () => {
    const collection = await resolveBuiltinPreset('wave-review');
    const hats = collection.hats;
    expect(hats.some((h) => h.aggregate)).toBe(true);
    expect(hats.some((h) => !h.aggregate)).toBe(true);
  });

  it('sequential has no aggregate hats', async () => {
    const collection = await resolveBuiltinPreset('sequential');
    expect(collection.hats.every((h) => !h.aggregate)).toBe(true);
  });

  it('all presets have unique trigger lists (no ambiguous routing)', async () => {
    for (const name of PRESET_NAMES) {
      const collection = await resolveBuiltinPreset(name);
      const keys = collection.hats.map((h) => [...h.triggers].sort().join('\0'));
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    }
  });

  it('rejects an unknown preset name', async () => {
    await expect(resolveBuiltinPreset('nonexistent')).rejects.toThrow(
      'Unknown builtin preset: "nonexistent"',
    );
  });
});
