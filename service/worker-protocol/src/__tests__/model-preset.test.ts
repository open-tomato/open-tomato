import { describe, expect, it } from 'vitest';

import {
  APPROVED_PRESETS,
  getPreset,
  listPresetNames,
  ModelPresetSchema,
  validatePreset,
} from '../model-preset.js';

describe('APPROVED_PRESETS', () => {
  it('contains at least one preset', () => {
    expect(APPROVED_PRESETS.length).toBeGreaterThan(0);
  });

  it('has unique names', () => {
    const names = APPROVED_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all presets have toolUse and coding capabilities', () => {
    for (const preset of APPROVED_PRESETS) {
      expect(preset.capabilities.toolUse).toBe(true);
      expect(preset.capabilities.coding).toBe(true);
    }
  });

  it('all presets pass schema validation', () => {
    for (const preset of APPROVED_PRESETS) {
      const result = ModelPresetSchema.safeParse(preset);
      expect(result.success).toBe(true);
    }
  });

  it('custom provider presets include a providerUrl', () => {
    const customPresets = APPROVED_PRESETS.filter((p) => p.provider === 'custom');
    for (const preset of customPresets) {
      expect(preset.providerUrl).toBeDefined();
      expect(preset.providerUrl!.length).toBeGreaterThan(0);
    }
  });
});

describe('getPreset', () => {
  it('returns a preset by name', () => {
    const preset = getPreset('sonnet');
    expect(preset).toBeDefined();
    expect(preset!.name).toBe('sonnet');
    expect(preset!.provider).toBe('anthropic');
  });

  it('returns undefined for unknown names', () => {
    expect(getPreset('nonexistent')).toBeUndefined();
  });
});

describe('validatePreset', () => {
  it('returns the preset for valid names', () => {
    const preset = validatePreset('sonnet');
    expect(preset.name).toBe('sonnet');
  });

  it('throws for unknown names', () => {
    expect(() => validatePreset('gpt-4')).toThrow('Unknown model preset');
  });

  it('error message lists available presets', () => {
    try {
      validatePreset('bad-model');
    } catch (err) {
      expect((err as Error).message).toContain('sonnet');
      expect((err as Error).message).toContain('haiku');
    }
  });
});

describe('listPresetNames', () => {
  it('returns all preset names', () => {
    const names = listPresetNames();
    expect(names).toContain('sonnet');
    expect(names).toContain('haiku');
    expect(names).toContain('opus');
    expect(names.length).toBe(APPROVED_PRESETS.length);
  });
});

describe('ModelPresetSchema', () => {
  it('rejects presets with empty name', () => {
    const result = ModelPresetSchema.safeParse({
      name: '',
      model: 'some-model',
      provider: 'anthropic',
      capabilities: { toolUse: true, coding: true, streaming: true },
    });
    expect(result.success).toBe(false);
  });

  it('rejects presets with invalid provider', () => {
    const result = ModelPresetSchema.safeParse({
      name: 'test',
      model: 'some-model',
      provider: 'openai',
      capabilities: { toolUse: true, coding: true, streaming: true },
    });
    expect(result.success).toBe(false);
  });

  it('rejects presets with invalid providerUrl', () => {
    const result = ModelPresetSchema.safeParse({
      name: 'test',
      model: 'some-model',
      provider: 'custom',
      providerUrl: 'not-a-url',
      capabilities: { toolUse: true, coding: true, streaming: true },
    });
    expect(result.success).toBe(false);
  });
});
