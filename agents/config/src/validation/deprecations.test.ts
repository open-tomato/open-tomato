import type { CoreConfig } from '../types.js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoreConfigSchema } from '../schemas/core-config.schema.js';

import { warnDroppedFields } from './deprecations.js';

function makeBaseConfig(overrides: Partial<CoreConfig> = {}): CoreConfig {
  const parsed = CoreConfigSchema.safeParse(overrides);
  if (!parsed.success) throw new Error('Invalid base config fixture');
  return parsed.data;
}

describe('warnDroppedFields', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('warning emission for unrecognised keys', () => {
    it('emits a warning for a single unknown top-level key', () => {
      const raw = { event_loop: {}, deprecated_key: 'value' };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"deprecated_key"'),
      );
    });

    it('emits one warning per unrecognised key', () => {
      const raw = { event_loop: {}, old_field: 1, typo_key: 2, removed_section: {} };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).toHaveBeenCalledTimes(3);
    });

    it('warning message mentions the key will be ignored', () => {
      const raw = { unknown_option: true };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      const [message] = warnSpy.mock.calls[0] as [string];
      expect(message).toContain('"unknown_option"');
      expect(message).toContain('ignored');
    });

    it('warning message includes the open-tomato config prefix', () => {
      const raw = { mystery_key: 42 };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      const [message] = warnSpy.mock.calls[0] as [string];
      expect(message).toContain('[open-tomato config]');
    });
  });

  describe('no warnings for known keys', () => {
    it('does not warn when all top-level keys are recognised', () => {
      const raw = {
        event_loop: {},
        cli: {},
        core: {},
        memories: {},
        tasks: {},
        hooks: {},
        skills: {},
        features: {},
        robot: {},
      };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for prompt key', () => {
      const raw = { prompt: 'do something' };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for prompt_file key', () => {
      const raw = { prompt_file: './prompt.txt' };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn when raw object is empty', () => {
      const raw = {};
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('graceful handling of non-object raw values', () => {
    it('does not warn and does not throw when raw is null', () => {
      const parsed = makeBaseConfig();

      expect(() => warnDroppedFields(null, parsed)).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn and does not throw when raw is a string', () => {
      const parsed = makeBaseConfig();

      expect(() => warnDroppedFields('not an object', parsed)).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn and does not throw when raw is an array', () => {
      const parsed = makeBaseConfig();

      expect(() => warnDroppedFields(['a', 'b'], parsed)).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn and does not throw when raw is a number', () => {
      const parsed = makeBaseConfig();

      expect(() => warnDroppedFields(42, parsed)).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn and does not throw when raw is undefined', () => {
      const parsed = makeBaseConfig();

      expect(() => warnDroppedFields(undefined, parsed)).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('mixed known and unknown keys', () => {
    it('warns only for unknown keys when mixed with known ones', () => {
      const raw = {
        event_loop: {},
        cli: {},
        legacy_option: 'old',
        another_deprecated: true,
      };
      const parsed = makeBaseConfig();

      warnDroppedFields(raw, parsed);

      expect(warnSpy).toHaveBeenCalledTimes(2);
      const messages = warnSpy.mock.calls.map(([msg]) => msg as string);
      expect(messages.some((m) => m.includes('"legacy_option"'))).toBe(true);
      expect(messages.some((m) => m.includes('"another_deprecated"'))).toBe(true);
      expect(messages.every((m) => !m.includes('"event_loop"'))).toBe(true);
      expect(messages.every((m) => !m.includes('"cli"'))).toBe(true);
    });
  });
});
