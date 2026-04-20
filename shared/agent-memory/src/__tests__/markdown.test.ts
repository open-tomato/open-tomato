import type { Memory } from '../types.js';

import { describe, expect, it } from 'vitest';

import { parseMemoriesFromMarkdown, serializeMemoriesToMarkdown } from '../markdown.js';

describe('parseMemoriesFromMarkdown', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseMemoriesFromMarkdown('')).toEqual([]);
  });

  it('returns an empty array when there are no recognized section headers', () => {
    const raw = '## Unknown\n\n> something\n<!-- id: x | tags: a | created: 2024-01-01T00:00:00Z -->';
    expect(parseMemoriesFromMarkdown(raw)).toEqual([]);
  });

  it('returns an empty array when sections exist but have no blockquotes', () => {
    const raw = '## Patterns\n\nSome prose without blockquotes.\n\n## Decisions\n\nMore prose.';
    expect(parseMemoriesFromMarkdown(raw)).toEqual([]);
  });

  describe('single memory per section', () => {
    it('parses a single pattern with full metadata', () => {
      const raw = [
        '## Patterns',
        '',
        '> Use Zod for validation.',
        '<!-- id: abc123 | tags: typescript, zod | created: 2024-01-15T10:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'abc123',
        type: 'pattern',
        content: 'Use Zod for validation.',
        tags: ['typescript', 'zod'],
        created: new Date('2024-01-15T10:00:00Z'),
      });
    });

    it('parses a single decision', () => {
      const raw = [
        '## Decisions',
        '',
        '> We chose Drizzle ORM over Prisma.',
        '<!-- id: def456 | tags: orm, database | created: 2024-01-16T08:30:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'def456',
        type: 'decision',
        tags: ['orm', 'database'],
      });
    });

    it('parses a single fix', () => {
      const raw = [
        '## Fixes',
        '',
        '> Always await async operations in tests.',
        '<!-- id: fix001 | tags: testing | created: 2024-02-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'fix', id: 'fix001' });
    });

    it('parses a single context entry', () => {
      const raw = [
        '## Context',
        '',
        '> This project uses Bun as the runtime.',
        '<!-- id: ctx001 | tags: bun, runtime | created: 2024-03-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'context', id: 'ctx001' });
    });
  });

  describe('multiple memories per section', () => {
    it('parses two memories in the same section', () => {
      const raw = [
        '## Patterns',
        '',
        '> First pattern.',
        '<!-- id: p1 | tags: a | created: 2024-01-01T00:00:00Z -->',
        '',
        '> Second pattern.',
        '<!-- id: p2 | tags: b | created: 2024-01-02T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'p1', content: 'First pattern.' });
      expect(result[1]).toMatchObject({ id: 'p2', content: 'Second pattern.' });
    });

    it('parses memories across multiple sections', () => {
      const raw = [
        '## Patterns',
        '',
        '> Pattern one.',
        '<!-- id: pat1 | tags: ts | created: 2024-01-01T00:00:00Z -->',
        '',
        '## Decisions',
        '',
        '> Decision one.',
        '<!-- id: dec1 | tags: arch | created: 2024-01-02T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'pattern', id: 'pat1' });
      expect(result[1]).toMatchObject({ type: 'decision', id: 'dec1' });
    });

    it('parses three memories across all four section types', () => {
      const raw = [
        '## Patterns',
        '> P.',
        '<!-- id: p | tags: | created: 2024-01-01T00:00:00Z -->',
        '## Decisions',
        '> D.',
        '<!-- id: d | tags: | created: 2024-01-01T00:00:00Z -->',
        '## Fixes',
        '> F.',
        '<!-- id: f | tags: | created: 2024-01-01T00:00:00Z -->',
        '## Context',
        '> C.',
        '<!-- id: c | tags: | created: 2024-01-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);
      const types = result.map((m) => m.type);

      expect(types).toEqual(['pattern', 'decision', 'fix', 'context']);
    });
  });

  describe('missing metadata comment', () => {
    it('generates an id and sets created to new Date(0) when no comment follows', () => {
      const raw = ['## Patterns', '', '> No metadata here.'].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result[0].created).toEqual(new Date(0));
      expect(result[0].tags).toEqual([]);
      expect(result[0].content).toBe('No metadata here.');
    });

    it('generates unique ids for two blocks both missing metadata', () => {
      const raw = [
        '## Patterns',
        '',
        '> First.',
        '',
        '> Second.',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe(result[1].id);
    });
  });

  describe('malformed HTML comment', () => {
    it('treats a comment missing the closing --> as no metadata', () => {
      const raw = [
        '## Patterns',
        '',
        '> Content.',
        '<!-- id: x | tags: a | created: 2024-01-01T00:00:00Z',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      // No valid metadata → generated id and epoch created
      expect(result[0].created).toEqual(new Date(0));
    });

    it('treats a comment missing the id field as no metadata', () => {
      const raw = [
        '## Patterns',
        '',
        '> Content.',
        '<!-- tags: a | created: 2024-01-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0].created).toEqual(new Date(0));
    });

    it('treats a comment with an invalid date as epoch for created', () => {
      const raw = [
        '## Patterns',
        '',
        '> Content.',
        '<!-- id: x | tags: a | created: not-a-date -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('x');
      expect(result[0].created).toEqual(new Date(0));
    });
  });

  describe('multi-line blockquote content', () => {
    it('joins multiple blockquote lines with newlines', () => {
      const raw = [
        '## Patterns',
        '',
        '> Line one.',
        '> Line two.',
        '> Line three.',
        '<!-- id: ml | tags: | created: 2024-01-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Line one.\nLine two.\nLine three.');
    });
  });

  describe('content before first section header', () => {
    it('ignores content that appears before the first ## header', () => {
      const raw = [
        '# Agent Memory',
        '',
        'Some preamble.',
        '',
        '## Patterns',
        '',
        '> A pattern.',
        '<!-- id: p1 | tags: | created: 2024-01-01T00:00:00Z -->',
      ].join('\n');

      const result = parseMemoriesFromMarkdown(raw);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('pattern');
    });
  });
});

describe('serializeMemoriesToMarkdown', () => {
  it('returns an empty string for an empty array', () => {
    expect(serializeMemoriesToMarkdown([])).toBe('');
  });

  it('serializes a single pattern memory', () => {
    const memories: Memory[] = [
      {
        id: 'abc123',
        type: 'pattern',
        content: 'Use Zod for validation.',
        tags: ['typescript', 'zod'],
        created: new Date('2024-01-15T10:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).toBe(
      [
        '## Patterns',
        '',
        '> Use Zod for validation.',
        '<!-- id: abc123 | tags: typescript, zod | created: 2024-01-15T10:00:00.000Z -->',
      ].join('\n'),
    );
  });

  it('serializes memories of all four types', () => {
    const memories: Memory[] = [
      {
        id: 'p1',
        type: 'pattern',
        content: 'Pattern content.',
        tags: ['ts'],
        created: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'd1',
        type: 'decision',
        content: 'Decision content.',
        tags: ['arch'],
        created: new Date('2024-01-02T00:00:00.000Z'),
      },
      {
        id: 'f1',
        type: 'fix',
        content: 'Fix content.',
        tags: ['bug'],
        created: new Date('2024-01-03T00:00:00.000Z'),
      },
      {
        id: 'c1',
        type: 'context',
        content: 'Context content.',
        tags: ['env'],
        created: new Date('2024-01-04T00:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).toContain('## Patterns');
    expect(result).toContain('## Decisions');
    expect(result).toContain('## Fixes');
    expect(result).toContain('## Context');

    // Sections appear in canonical order
    const patIdx = result.indexOf('## Patterns');
    const decIdx = result.indexOf('## Decisions');
    const fixIdx = result.indexOf('## Fixes');
    const ctxIdx = result.indexOf('## Context');
    expect(patIdx).toBeLessThan(decIdx);
    expect(decIdx).toBeLessThan(fixIdx);
    expect(fixIdx).toBeLessThan(ctxIdx);
  });

  it('serializes two memories in the same section with a blank line between them', () => {
    const memories: Memory[] = [
      {
        id: 'p1',
        type: 'pattern',
        content: 'First pattern.',
        tags: ['a'],
        created: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        id: 'p2',
        type: 'pattern',
        content: 'Second pattern.',
        tags: ['b'],
        created: new Date('2024-01-02T00:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).toBe(
      [
        '## Patterns',
        '',
        '> First pattern.',
        '<!-- id: p1 | tags: a | created: 2024-01-01T00:00:00.000Z -->',
        '',
        '> Second pattern.',
        '<!-- id: p2 | tags: b | created: 2024-01-02T00:00:00.000Z -->',
      ].join('\n'),
    );
  });

  it('omits sections that have no memories', () => {
    const memories: Memory[] = [
      {
        id: 'f1',
        type: 'fix',
        content: 'Fix only.',
        tags: [],
        created: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).not.toContain('## Patterns');
    expect(result).not.toContain('## Decisions');
    expect(result).toContain('## Fixes');
    expect(result).not.toContain('## Context');
  });

  it('serializes special characters in content', () => {
    const memories: Memory[] = [
      {
        id: 'sc1',
        type: 'context',
        content: 'Use <angle> & "quotes" in content.',
        tags: ['special'],
        created: new Date('2024-06-01T00:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).toContain('> Use <angle> & "quotes" in content.');
  });

  it('serializes empty tags as an empty tags field', () => {
    const memories: Memory[] = [
      {
        id: 'nt1',
        type: 'pattern',
        content: 'No tags.',
        tags: [],
        created: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const result = serializeMemoriesToMarkdown(memories);

    expect(result).toContain('| tags:  |');
  });

  describe('round-trip fidelity', () => {
    it('round-trips a single memory', () => {
      const original: Memory[] = [
        {
          id: 'rt1',
          type: 'decision',
          content: 'We chose Drizzle over Prisma.',
          tags: ['orm', 'database'],
          created: new Date('2024-01-16T08:30:00.000Z'),
        },
      ];

      const parsed = parseMemoriesFromMarkdown(serializeMemoriesToMarkdown(original));

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        id: original[0].id,
        type: original[0].type,
        content: original[0].content,
        tags: original[0].tags,
      });
      expect(parsed[0].created.getTime()).toBe(original[0].created.getTime());
    });

    it('round-trips memories of all four types', () => {
      const original: Memory[] = [
        {
          id: 'p1',
          type: 'pattern',
          content: 'Pattern memory.',
          tags: ['ts'],
          created: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 'd1',
          type: 'decision',
          content: 'Decision memory.',
          tags: ['arch'],
          created: new Date('2024-01-02T00:00:00.000Z'),
        },
        {
          id: 'f1',
          type: 'fix',
          content: 'Fix memory.',
          tags: ['bug'],
          created: new Date('2024-01-03T00:00:00.000Z'),
        },
        {
          id: 'c1',
          type: 'context',
          content: 'Context memory.',
          tags: ['env'],
          created: new Date('2024-01-04T00:00:00.000Z'),
        },
      ];

      const parsed = parseMemoriesFromMarkdown(serializeMemoriesToMarkdown(original));

      expect(parsed).toHaveLength(4);

      // Sections are grouped by type, so order may differ from input
      const byId = Object.fromEntries(parsed.map((m) => [m.id, m]));
      for (const mem of original) {
        expect(byId[mem.id]).toMatchObject({
          id: mem.id,
          type: mem.type,
          content: mem.content,
          tags: mem.tags,
        });
        expect(byId[mem.id].created.getTime()).toBe(mem.created.getTime());
      }
    });

    it('round-trips multi-line content', () => {
      const original: Memory[] = [
        {
          id: 'ml1',
          type: 'pattern',
          content: 'Line one.\nLine two.\nLine three.',
          tags: [],
          created: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];

      const parsed = parseMemoriesFromMarkdown(serializeMemoriesToMarkdown(original));

      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('Line one.\nLine two.\nLine three.');
    });

    it('round-trips memories with empty tags', () => {
      const original: Memory[] = [
        {
          id: 'nt1',
          type: 'fix',
          content: 'No tags here.',
          tags: [],
          created: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];

      const parsed = parseMemoriesFromMarkdown(serializeMemoriesToMarkdown(original));

      expect(parsed).toHaveLength(1);
      expect(parsed[0].tags).toEqual([]);
    });
  });
});
