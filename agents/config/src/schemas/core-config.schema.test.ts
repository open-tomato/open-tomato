import { describe, expect, it } from 'vitest';

import { CoreConfigSchema } from './core-config.schema.js';

describe('CoreConfigSchema — prompt/prompt_file mutual exclusivity', () => {
  describe('valid input', () => {
    it('accepts an empty object (neither prompt nor prompt_file)', () => {
      const result = CoreConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts prompt alone', () => {
      const result = CoreConfigSchema.safeParse({ prompt: 'do the thing' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe('do the thing');
        expect(result.data.prompt_file).toBeUndefined();
      }
    });

    it('accepts prompt_file alone', () => {
      const result = CoreConfigSchema.safeParse({ prompt_file: './prompts/task.md' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt_file).toBe('./prompts/task.md');
        expect(result.data.prompt).toBeUndefined();
      }
    });

    it('accepts prompt as empty string (falsy — not treated as provided)', () => {
      const result = CoreConfigSchema.safeParse({
        prompt: '',
        prompt_file: './prompts/task.md',
      });
      expect(result.success).toBe(true);
    });

    it('accepts prompt_file as empty string (falsy — not treated as provided)', () => {
      const result = CoreConfigSchema.safeParse({
        prompt: 'do the thing',
        prompt_file: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rejection when both are provided', () => {
    it('rejects when both prompt and prompt_file are non-empty strings', () => {
      const result = CoreConfigSchema.safeParse({
        prompt: 'do the thing',
        prompt_file: './prompts/task.md',
      });
      expect(result.success).toBe(false);
    });

    it('places the error on the prompt_file path', () => {
      const result = CoreConfigSchema.safeParse({
        prompt: 'do the thing',
        prompt_file: './prompts/task.md',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path);
        expect(paths).toContainEqual(['prompt_file']);
      }
    });

    it('includes the mutual exclusivity message in the error', () => {
      const result = CoreConfigSchema.safeParse({
        prompt: 'do the thing',
        prompt_file: './prompts/task.md',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        expect(messages).toContain('prompt and prompt_file are mutually exclusive');
      }
    });

    it('rejects regardless of the other config fields being valid', () => {
      const result = CoreConfigSchema.safeParse({
        event_loop: { iterations: 5 },
        prompt: 'inline prompt text',
        prompt_file: '/absolute/path/to/prompt.txt',
      });
      expect(result.success).toBe(false);
    });
  });
});
