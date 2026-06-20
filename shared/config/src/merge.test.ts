import { describe, it, expect } from 'vitest';

import { deepMerge, mergeLayers } from './merge.js';

describe('deepMerge', () => {
  it('recursively merges nested objects, preserving sibling keys', () => {
    const base = { env: { db: { url: 'a', pool: 10 }, redis: { url: 'r' } } };
    const override = { env: { db: { url: 'b' } } };

    expect(deepMerge(base, override)).toEqual({
      env: { db: { url: 'b', pool: 10 }, redis: { url: 'r' } },
    });
  });

  it('overwrites scalars with the later value', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: 9 })).toEqual({ a: 9, b: 2 });
  });

  it('replaces arrays wholesale rather than concatenating', () => {
    expect(deepMerge({ envs: ['dev', 'prod'] }, { envs: ['staging'] })).toEqual({
      envs: ['staging'],
    });
  });

  it('does not mutate either input', () => {
    const base = { a: { b: 1 } };
    const override = { a: { c: 2 } };

    deepMerge(base, override);

    expect(base).toEqual({ a: { b: 1 } });
    expect(override).toEqual({ a: { c: 2 } });
  });
});

describe('mergeLayers', () => {
  it('folds layers left-to-right with the last write winning', () => {
    const result = mergeLayers([
      { project: { id: 'kb', port: 1 }, env: { x: 1 } },
      { project: { port: 2 } },
      { env: { x: 9 } },
    ]);

    expect(result).toEqual({ project: { id: 'kb', port: 2 }, env: { x: 9 } });
  });

  it('returns an empty object when given no layers', () => {
    expect(mergeLayers([])).toEqual({});
  });
});
