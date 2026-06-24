import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { ConfigError } from './errors.js';
import { defineConfig } from './schema.js';
import { validateConfig } from './validate.js';

function caught(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (err) {
    if (err instanceof ConfigError) return err;
    throw err;
  }
  throw new Error('expected validateConfig to throw a ConfigError');
}

const validService = {
  project: {
    id: 'knowledge-base',
    type: 'service',
    name: 'Knowledge Base',
    port: 3001,
    environments: ['dev', 'prod'],
  },
  infrastructure: { database: { engine: 'postgres', version: '15' } },
  env: { database_a: { url: 'postgres://h:5432/db', pool_size: 10 } },
};

describe('validateConfig — project type rules', () => {
  it('accepts a valid service config and returns it', () => {
    expect(validateConfig(validService)).toEqual(validService);
  });

  it('rejects a service with no port (VALIDATION_FAILED)', () => {
    const err = caught(() => validateConfig({ project: { id: 'kb', type: 'service' }, env: {} }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a frontend that declares a port (port forbidden)', () => {
    const err = caught(() => validateConfig({
      project: { id: 'site', type: 'frontend', url: 'https://x.dev', port: 3000 },
    }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a frontend with no url (url required)', () => {
    const err = caught(() => validateConfig({ project: { id: 'site', type: 'frontend' } }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('rejects a non-kebab-case project.id', () => {
    const err = caught(() => validateConfig({ project: { id: 'Knowledge_Base', type: 'service', port: 1 } }));
    expect(err.code).toBe('VALIDATION_FAILED');
  });
});

describe('validateConfig — env structure (overlay cannot add keys)', () => {
  it('rejects an env key not declared in the default layer (SCHEMA_MISMATCH)', () => {
    const err = caught(() => validateConfig(
      {
        project: { id: 'kb', type: 'service', port: 1 },
        env: { db: { url: 'x' }, surprise: true },
      },
      { defaultEnv: { db: { url: 'x' } } },
    ));
    expect(err.code).toBe('SCHEMA_MISMATCH');
    expect(err.key).toBe('env.surprise');
  });

  it('accepts overlays that only change values of declared keys', () => {
    expect(
      validateConfig(
        {
          project: { id: 'kb', type: 'service', port: 1 },
          env: { db: { url: 'changed' } },
        },
        { defaultEnv: { db: { url: 'default' } } },
      ),
    ).toBeDefined();
  });
});

describe('validateConfig — defineConfig extension', () => {
  it('runs the defineConfig env schema and fails on a violation (VALIDATION_FAILED)', () => {
    const schema = defineConfig({
      env: z.object({ db: z.object({ url: z.string().url() }) }),
    });
    const err = caught(() => validateConfig(
      {
        project: { id: 'kb', type: 'service', port: 1 },
        env: { db: { url: 'not-a-url' } },
      },
      { extension: schema },
    ));
    expect(err.code).toBe('VALIDATION_FAILED');
  });

  it('passes when the defineConfig env schema is satisfied', () => {
    const schema = defineConfig({
      env: z.object({ db: z.object({ url: z.string().url() }) }),
    });
    expect(
      validateConfig(
        {
          project: { id: 'kb', type: 'service', port: 1 },
          env: { db: { url: 'https://db.example.com' } },
        },
        { extension: schema },
      ),
    ).toBeDefined();
  });
});
