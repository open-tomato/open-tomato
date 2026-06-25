import type { PlatformPlugin } from './plugin';
import type {
  ProvisionAllowance,
  ProvisionRequest,
  ResolvedConfig,
} from './types';

import { createHash } from 'node:crypto';

import { describe, expect, expectTypeOf, it } from 'vitest';

import { EMPTY_EMIT_LOCK_HASH, createNoopPlugin } from './noopPlugin';

const sampleRequest: ProvisionRequest = {
  service: 'svc',
  env: 'dev',
  region: 'local',
  capabilities: [],
  metadata: {},
};

const sampleAllowance: ProvisionAllowance = {
  allowed: true,
  reasons: [],
  caps: {},
};

const sampleConfig: ResolvedConfig = {
  service: 'svc',
  env: 'dev',
  infrastructure: {},
  vault: {},
  extras: {},
};

describe('EMPTY_EMIT_LOCK_HASH', () => {
  it('is the SHA-256 hex digest of "[]"', () => {
    const expected = createHash('sha256').update('[]')
      .digest('hex');
    expect(EMPTY_EMIT_LOCK_HASH).toBe(expected);
  });

  it('is a 64-character lowercase hex string', () => {
    expect(EMPTY_EMIT_LOCK_HASH).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('createNoopPlugin', () => {
  it('returns an object that structurally satisfies PlatformPlugin', () => {
    const plugin = createNoopPlugin('noop');
    expectTypeOf(plugin).toMatchTypeOf<PlatformPlugin>();
  });

  it('exposes the provided name and a semver version', () => {
    const plugin = createNoopPlugin('my-noop');
    expect(plugin.name).toBe('my-noop');
    expect(plugin.version).toBe('0.0.0');
  });

  describe('matchCapabilities', () => {
    it('resolves to the documented no-match shape', async () => {
      const plugin = createNoopPlugin('noop');
      const result = await plugin.matchCapabilities(sampleRequest);
      expect(result).toEqual({ matches: false, score: 0, missing: [] });
    });
  });

  describe('resolvePlatformRefs', () => {
    it('returns the input template unchanged', async () => {
      const plugin = createNoopPlugin('noop');
      const template = 'hello ${platform.database.url} world';
      const result = await plugin.resolvePlatformRefs(template, sampleConfig);
      expect(result).toBe(template);
    });

    it('returns an empty string unchanged', async () => {
      const plugin = createNoopPlugin('noop');
      const result = await plugin.resolvePlatformRefs('', sampleConfig);
      expect(result).toBe('');
    });
  });

  describe('validateProvision', () => {
    it('resolves to a valid result with empty errors and warnings', async () => {
      const plugin = createNoopPlugin('noop');
      const result = await plugin.validateProvision(
        sampleRequest,
        sampleAllowance,
      );
      expect(result).toEqual({ valid: true, errors: [], warnings: [] });
    });
  });

  describe('emit', () => {
    it('resolves to no targets and the deterministic empty lock hash', async () => {
      const plugin = createNoopPlugin('noop');
      const result = await plugin.emit(sampleConfig);
      expect(result).toEqual({
        targets: [],
        lockHash: EMPTY_EMIT_LOCK_HASH,
      });
    });

    it('produces the same lockHash across invocations', async () => {
      const plugin = createNoopPlugin('noop');
      const a = await plugin.emit(sampleConfig);
      const b = await plugin.emit(sampleConfig);
      expect(a.lockHash).toBe(b.lockHash);
    });
  });
});
