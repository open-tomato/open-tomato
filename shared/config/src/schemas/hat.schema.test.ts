import { describe, expect, it } from 'vitest';

import { RESERVED_TRIGGER_NAMES } from '../constants.js';

import { HatCollectionSchema } from './hat-collection.schema.js';
import { HatSchema } from './hat.schema.js';

const validHat = {
  id: 'reviewer',
  triggers: ['review_requested'],
  instructions: 'Review the code and provide feedback.',
};

describe('HatSchema', () => {
  describe('valid input', () => {
    it('accepts a minimal hat with required fields', () => {
      const result = HatSchema.safeParse(validHat);
      expect(result.success).toBe(true);
    });

    it('applies defaults for optional fields', () => {
      const result = HatSchema.safeParse(validHat);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publishes).toEqual([]);
        expect(result.data.concurrency).toBe(1);
        expect(result.data.aggregate).toBe(false);
        expect(result.data.disallowed_tools).toEqual([]);
      }
    });

    it('accepts a fully specified hat with a named backend', () => {
      const result = HatSchema.safeParse({
        id: 'worker',
        triggers: ['task_assigned', 'retry_requested'],
        publishes: ['task_completed'],
        instructions: 'Do the work.',
        backend: 'openai',
        concurrency: 3,
        aggregate: false,
        disallowed_tools: ['BashTool'],
        max_activations: 10,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concurrency).toBe(3);
        expect(result.data.max_activations).toBe(10);
        expect(result.data.disallowed_tools).toEqual(['BashTool']);
        expect(result.data.backend).toBe('openai');
      }
    });

    it('accepts multiple triggers that are not reserved', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        triggers: ['event_a', 'event_b', 'event_c'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts max_activations of 1 (minimum positive integer)', () => {
      const result = HatSchema.safeParse({ ...validHat, max_activations: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts concurrency of 1 (minimum positive integer)', () => {
      const result = HatSchema.safeParse({ ...validHat, concurrency: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts a hat without a backend field', () => {
      const result = HatSchema.safeParse(validHat);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.backend).toBeUndefined();
      }
    });

    it('accepts a hat with a custom backend descriptor', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'my-custom-llm',
          command: '/usr/local/bin/my-llm',
          args: ['--json'],
          promptMode: 'stdin',
          outputFormat: 'stream-json',
          envVars: { MY_API_KEY: 'secret' },
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.backend).toEqual({
          name: 'my-custom-llm',
          command: '/usr/local/bin/my-llm',
          args: ['--json'],
          promptMode: 'stdin',
          outputFormat: 'stream-json',
          envVars: { MY_API_KEY: 'secret' },
        });
      }
    });

    it('applies defaults for optional descriptor fields (args, envVars)', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'minimal',
          command: 'my-cli',
          promptMode: 'flag',
          outputFormat: 'text',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const descriptor = result.data.backend as Record<string, unknown>;
        expect(descriptor['args']).toEqual([]);
        expect(descriptor['envVars']).toEqual({});
      }
    });
  });

  describe('backend field validation', () => {
    it('rejects a descriptor with an empty name', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: '',
          command: 'my-cli',
          promptMode: 'flag',
          outputFormat: 'text',
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a descriptor with an empty command', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'bad',
          command: '',
          promptMode: 'flag',
          outputFormat: 'text',
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a descriptor with an invalid promptMode', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'bad',
          command: 'cli',
          promptMode: 'pipe',
          outputFormat: 'text',
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a descriptor with an invalid outputFormat', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'bad',
          command: 'cli',
          promptMode: 'flag',
          outputFormat: 'xml',
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a descriptor missing required fields', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: {
          name: 'incomplete',
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-string non-object backend value', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        backend: 42,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('trigger reservation rejection', () => {
    it('rejects a hat with a single reserved trigger', () => {
      for (const reserved of RESERVED_TRIGGER_NAMES) {
        const result = HatSchema.safeParse({ ...validHat, triggers: [reserved] });
        expect(result.success).toBe(false);
      }
    });

    it('rejects __start__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__start__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __stop__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__stop__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __error__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__error__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __timeout__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__timeout__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __tick__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__tick__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __init__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__init__'] });
      expect(result.success).toBe(false);
    });

    it('rejects __teardown__ trigger', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__teardown__'] });
      expect(result.success).toBe(false);
    });

    it('rejects a mix of valid and reserved triggers', () => {
      const result = HatSchema.safeParse({
        ...validHat,
        triggers: ['valid_event', '__start__'],
      });
      expect(result.success).toBe(false);
    });

    it('reports an error on the triggers path', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__start__'] });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(paths).toContain('triggers');
      }
    });

    it('includes a descriptive message listing reserved names', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: ['__stop__'] });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        const hasReservedMessage = messages.some((m) => m.includes('reserved'));
        expect(hasReservedMessage).toBe(true);
      }
    });
  });

  describe('field validation', () => {
    it('rejects missing id', () => {
      const { id, ...noId } = validHat;
      void id;
      const result = HatSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('rejects missing instructions', () => {
      const { instructions, ...noInstructions } = validHat;
      void instructions;
      const result = HatSchema.safeParse(noInstructions);
      expect(result.success).toBe(false);
    });

    it('rejects an empty triggers array', () => {
      const result = HatSchema.safeParse({ ...validHat, triggers: [] });
      expect(result.success).toBe(false);
    });

    it('rejects concurrency of 0', () => {
      const result = HatSchema.safeParse({ ...validHat, concurrency: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative concurrency', () => {
      const result = HatSchema.safeParse({ ...validHat, concurrency: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects fractional concurrency', () => {
      const result = HatSchema.safeParse({ ...validHat, concurrency: 1.5 });
      expect(result.success).toBe(false);
    });

    it('rejects max_activations of 0', () => {
      const result = HatSchema.safeParse({ ...validHat, max_activations: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative max_activations', () => {
      const result = HatSchema.safeParse({ ...validHat, max_activations: -5 });
      expect(result.success).toBe(false);
    });
  });
});

describe('HatCollectionSchema — ambiguous routing detection', () => {
  const makeHat = (id: string, triggers: string[]) => ({
    id,
    triggers,
    instructions: `Instructions for ${id}.`,
  });

  describe('valid collections', () => {
    it('accepts a collection with a single hat', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['event_a'])],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a collection with non-overlapping trigger lists', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['event_a']), makeHat('hat-b', ['event_b'])],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a collection where hats share some but not all triggers', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          makeHat('hat-a', ['event_a', 'event_b']),
          makeHat('hat-b', ['event_b', 'event_c']),
        ],
      });
      expect(result.success).toBe(true);
    });

    it('applies default version when omitted', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['event_a'])],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1');
      }
    });

    it('accepts a collection with a mix of aggregate and non-aggregate hats', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          makeHat('worker', ['task_ready']),
          { ...makeHat('aggregator', ['all_done']), aggregate: true },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ambiguous routing detection', () => {
    it('rejects two hats with identical single-element trigger lists', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['event_x']), makeHat('hat-b', ['event_x'])],
      });
      expect(result.success).toBe(false);
    });

    it('rejects two hats with identical multi-element trigger lists', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          makeHat('hat-a', ['event_a', 'event_b']),
          makeHat('hat-b', ['event_a', 'event_b']),
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects two hats with identical trigger lists regardless of order', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          makeHat('hat-a', ['event_b', 'event_a']),
          makeHat('hat-b', ['event_a', 'event_b']),
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects three hats where two share triggers', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          makeHat('hat-a', ['unique_event']),
          makeHat('hat-b', ['shared_event']),
          makeHat('hat-c', ['shared_event']),
        ],
      });
      expect(result.success).toBe(false);
    });

    it('reports an error on the hats path', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['dup']), makeHat('hat-b', ['dup'])],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path.join('.'));
        expect(paths).toContain('hats');
      }
    });

    it('includes a descriptive message about ambiguous routing', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [makeHat('hat-a', ['dup']), makeHat('hat-b', ['dup'])],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        const hasAmbiguousMessage = messages.some((m) => m.toLowerCase().includes('ambiguous'));
        expect(hasAmbiguousMessage).toBe(true);
      }
    });
  });

  describe('wave-config aggregate validation', () => {
    it('rejects a collection with only aggregate hats', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          { ...makeHat('hat-a', ['event_a']), aggregate: true },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a collection with multiple aggregate hats and no non-aggregate hats', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [
          { ...makeHat('hat-a', ['event_a']), aggregate: true },
          { ...makeHat('hat-b', ['event_b']), aggregate: true },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('includes a descriptive message about aggregate constraint', () => {
      const result = HatCollectionSchema.safeParse({
        hats: [{ ...makeHat('hat-a', ['event_a']), aggregate: true }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((issue) => issue.message);
        const hasAggregateMessage = messages.some((m) => m.toLowerCase().includes('aggregate'));
        expect(hasAggregateMessage).toBe(true);
      }
    });
  });

  describe('collection-level field validation', () => {
    it('rejects an empty hats array', () => {
      const result = HatCollectionSchema.safeParse({ hats: [] });
      expect(result.success).toBe(false);
    });

    it('rejects missing hats field', () => {
      const result = HatCollectionSchema.safeParse({ version: '1' });
      expect(result.success).toBe(false);
    });
  });
});
