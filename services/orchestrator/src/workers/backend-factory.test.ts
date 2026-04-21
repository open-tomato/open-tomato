import type { BackendDescriptor } from './backend-descriptor.js';

import { describe, expect, it } from 'vitest';

import { BackendFactory } from './backend-factory.js';

describe('BackendFactory', () => {
  describe('create', () => {
    it('returns a Claude descriptor with stream-json output', () => {
      const d = BackendFactory.create('claude');

      expect(d).toEqual({
        name: 'claude',
        command: 'claude',
        args: ['--output-format', 'stream-json', '--dangerously-skip-permissions'],
        promptMode: 'flag',
        outputFormat: 'stream-json',
        envVars: {},
      });
    });

    it('returns a Gemini descriptor with text output', () => {
      const d = BackendFactory.create('gemini');

      expect(d).toEqual({
        name: 'gemini',
        command: 'gemini',
        args: ['--yolo'],
        promptMode: 'flag',
        outputFormat: 'text',
        envVars: {},
      });
    });

    it('returns a Codex descriptor with text output', () => {
      const d = BackendFactory.create('codex');

      expect(d).toEqual({
        name: 'codex',
        command: 'codex',
        args: [],
        promptMode: 'flag',
        outputFormat: 'text',
        envVars: {},
      });
    });

    it('returns frozen descriptors that are not the same reference across calls', () => {
      const first = BackendFactory.create('claude');
      const second = BackendFactory.create('claude');

      expect(first).toEqual(second);
    });
  });

  describe('createCustom', () => {
    it('returns a copy of the provided descriptor', () => {
      const custom: BackendDescriptor = {
        name: 'my-backend',
        command: '/usr/local/bin/my-ai',
        args: ['--json'],
        promptMode: 'stdin',
        outputFormat: 'acp',
        envVars: { MY_TOKEN: 'secret' },
      };

      const result = BackendFactory.createCustom(custom);

      expect(result).toEqual(custom);
      expect(result).not.toBe(custom);
    });

    it('does not mutate the original descriptor', () => {
      const original: BackendDescriptor = {
        name: 'custom',
        command: 'custom-cli',
        args: [],
        promptMode: 'positional',
        outputFormat: 'pi-stream-json',
        envVars: {},
      };

      const result = BackendFactory.createCustom(original);
      (result as Record<string, unknown>).name = 'mutated';

      expect(original.name).toBe('custom');
    });
  });
});
