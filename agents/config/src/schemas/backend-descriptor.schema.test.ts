import { describe, expect, it } from 'vitest';

import {
  BackendDescriptorSchema,
  BackendFieldSchema,
  OutputFormatSchema,
  PromptModeSchema,
} from './backend-descriptor.schema.js';

describe('PromptModeSchema', () => {
  it.each(['flag', 'stdin', 'positional'] as const)(
    'accepts valid prompt mode "%s"',
    (mode) => {
      const result = PromptModeSchema.safeParse(mode);
      expect(result.success).toBe(true);
    },
  );

  it('rejects an invalid prompt mode', () => {
    const result = PromptModeSchema.safeParse('pipe');
    expect(result.success).toBe(false);
  });

  it('rejects a non-string value', () => {
    const result = PromptModeSchema.safeParse(42);
    expect(result.success).toBe(false);
  });
});

describe('OutputFormatSchema', () => {
  it.each(['text', 'stream-json', 'pi-stream-json', 'acp'] as const)(
    'accepts valid output format "%s"',
    (format) => {
      const result = OutputFormatSchema.safeParse(format);
      expect(result.success).toBe(true);
    },
  );

  it('rejects an invalid output format', () => {
    const result = OutputFormatSchema.safeParse('xml');
    expect(result.success).toBe(false);
  });

  it('rejects a non-string value', () => {
    const result = OutputFormatSchema.safeParse(true);
    expect(result.success).toBe(false);
  });
});

describe('BackendDescriptorSchema', () => {
  const validDescriptor = {
    name: 'my-llm',
    command: '/usr/local/bin/my-llm',
    promptMode: 'flag' as const,
    outputFormat: 'text' as const,
  };

  describe('valid input', () => {
    it('accepts a minimal descriptor with required fields only', () => {
      const result = BackendDescriptorSchema.safeParse(validDescriptor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('my-llm');
        expect(result.data.command).toBe('/usr/local/bin/my-llm');
        expect(result.data.promptMode).toBe('flag');
        expect(result.data.outputFormat).toBe('text');
      }
    });

    it('applies default empty array for args when omitted', () => {
      const result = BackendDescriptorSchema.safeParse(validDescriptor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.args).toEqual([]);
      }
    });

    it('applies default empty record for envVars when omitted', () => {
      const result = BackendDescriptorSchema.safeParse(validDescriptor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envVars).toEqual({});
      }
    });

    it('accepts a fully specified descriptor', () => {
      const result = BackendDescriptorSchema.safeParse({
        name: 'custom-backend',
        command: 'my-cli',
        args: ['--json', '--verbose'],
        promptMode: 'stdin',
        outputFormat: 'stream-json',
        envVars: { API_KEY: 'key123', REGION: 'us-east-1' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.args).toEqual(['--json', '--verbose']);
        expect(result.data.envVars).toEqual({ API_KEY: 'key123', REGION: 'us-east-1' });
      }
    });

    it('accepts each valid promptMode in a descriptor', () => {
      for (const mode of ['flag', 'stdin', 'positional'] as const) {
        const result = BackendDescriptorSchema.safeParse({
          ...validDescriptor,
          promptMode: mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts each valid outputFormat in a descriptor', () => {
      for (const format of ['text', 'stream-json', 'pi-stream-json', 'acp'] as const) {
        const result = BackendDescriptorSchema.safeParse({
          ...validDescriptor,
          outputFormat: format,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('validation', () => {
    it('rejects an empty name', () => {
      const result = BackendDescriptorSchema.safeParse({ ...validDescriptor, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty command', () => {
      const result = BackendDescriptorSchema.safeParse({ ...validDescriptor, command: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing name', () => {
      const { name, ...rest } = validDescriptor;
      void name;
      const result = BackendDescriptorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing command', () => {
      const { command, ...rest } = validDescriptor;
      void command;
      const result = BackendDescriptorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing promptMode', () => {
      const { promptMode, ...rest } = validDescriptor;
      void promptMode;
      const result = BackendDescriptorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing outputFormat', () => {
      const { outputFormat, ...rest } = validDescriptor;
      void outputFormat;
      const result = BackendDescriptorSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects non-string args elements', () => {
      const result = BackendDescriptorSchema.safeParse({
        ...validDescriptor,
        args: [42],
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-string envVars values', () => {
      const result = BackendDescriptorSchema.safeParse({
        ...validDescriptor,
        envVars: { KEY: 123 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid promptMode in a descriptor', () => {
      const result = BackendDescriptorSchema.safeParse({
        ...validDescriptor,
        promptMode: 'pipe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid outputFormat in a descriptor', () => {
      const result = BackendDescriptorSchema.safeParse({
        ...validDescriptor,
        outputFormat: 'xml',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('BackendFieldSchema', () => {
  describe('string variant (named backend)', () => {
    it('accepts a named backend string', () => {
      const result = BackendFieldSchema.safeParse('claude');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('claude');
      }
    });

    it('accepts any non-empty string as a backend name', () => {
      const result = BackendFieldSchema.safeParse('my-custom-backend');
      expect(result.success).toBe(true);
    });

    it('accepts an empty string (validation is at a higher level)', () => {
      const result = BackendFieldSchema.safeParse('');
      expect(result.success).toBe(true);
    });
  });

  describe('object variant (custom descriptor)', () => {
    it('accepts a valid full descriptor object', () => {
      const descriptor = {
        name: 'custom',
        command: 'my-cli',
        args: ['--flag'],
        promptMode: 'stdin',
        outputFormat: 'stream-json',
        envVars: { TOKEN: 'abc' },
      };
      const result = BackendFieldSchema.safeParse(descriptor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(descriptor);
      }
    });

    it('accepts a minimal descriptor with defaults applied', () => {
      const result = BackendFieldSchema.safeParse({
        name: 'minimal',
        command: 'cli',
        promptMode: 'positional',
        outputFormat: 'acp',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data['args']).toEqual([]);
        expect(data['envVars']).toEqual({});
      }
    });

    it('rejects a descriptor missing required fields', () => {
      const result = BackendFieldSchema.safeParse({
        name: 'incomplete',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('rejection of invalid types', () => {
    it('rejects a number', () => {
      const result = BackendFieldSchema.safeParse(42);
      expect(result.success).toBe(false);
    });

    it('rejects a boolean', () => {
      const result = BackendFieldSchema.safeParse(true);
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = BackendFieldSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('rejects an array', () => {
      const result = BackendFieldSchema.safeParse(['claude', 'gemini']);
      expect(result.success).toBe(false);
    });
  });
});
