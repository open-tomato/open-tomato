import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultRefNotFoundError } from './errors.js';

interface MockClientState {
  store: Map<string, string>;
  calls: string[];
  token: string | undefined;
}

const state = vi.hoisted<MockClientState>(() => ({
  store: new Map<string, string>(),
  calls: [],
  token: undefined,
}));

vi.mock('./auth.js', () => ({
  async resolveAuth(): Promise<{ token: string }> {
    return { token: 'test-token' };
  },
}));

vi.mock('./client.js', () => ({
  createClient(token: string): { getSecret(key: string): Promise<string | null> } {
    state.token = token;
    return {
      async getSecret(key: string): Promise<string | null> {
        state.calls.push(key);
        return state.store.get(key) ?? null;
      },
    };
  },
}));

const { loadSecrets } = await import('./loadSecrets.js');

beforeEach(() => {
  state.store = new Map<string, string>();
  state.calls = [];
  state.token = undefined;
});

describe('loadSecrets', () => {
  it('resolves a single ref on the first (most specific) fallback', async () => {
    state.store.set('db-password-staging-us-east-1', 'specific-secret');
    state.store.set('db-password-staging', 'env-secret');
    state.store.set('db-password', 'bare-secret');

    const result = await loadSecrets(['{{vault.db-password}}'], {
      env: 'staging',
      region: 'us-east-1',
    });

    expect(result).toEqual({ '{{vault.db-password}}': 'specific-secret' });
    expect(state.calls).toEqual(['db-password-staging-us-east-1']);
  });

  it('resolves a single ref on the third (bare-id) fallback', async () => {
    state.store.set('db-password', 'bare-secret');

    const result = await loadSecrets(['{{vault.db-password}}'], {
      env: 'staging',
      region: 'us-east-1',
    });

    expect(result).toEqual({ '{{vault.db-password}}': 'bare-secret' });
    expect(state.calls).toEqual([
      'db-password-staging-us-east-1',
      'db-password-staging',
      'db-password',
    ]);
  });

  it('throws VaultRefNotFoundError with triedKeys populated when no fallback matches', async () => {
    const refs = ['{{vault.missing-id}}'];
    const opts = { env: 'staging', region: 'us-east-1' } as const;

    await expect(loadSecrets(refs, opts)).rejects.toBeInstanceOf(VaultRefNotFoundError);
    await expect(loadSecrets(refs, opts)).rejects.toMatchObject({
      code: 'REF_NOT_FOUND',
      ref: '{{vault.missing-id}}',
      triedKeys: [
        'missing-id-staging-us-east-1',
        'missing-id-staging',
        'missing-id',
      ],
    });
  });

  it('resolves a batch of three refs', async () => {
    state.store.set('db-password-prod', 'db-secret');
    state.store.set('api-key-prod', 'api-secret');
    state.store.set('webhook-secret', 'webhook-secret-value');

    const result = await loadSecrets(
      [
        '{{vault.db-password}}',
        '{{vault.api-key}}',
        '{{vault.webhook-secret}}',
      ],
      { env: 'prod' },
    );

    expect(result).toEqual({
      '{{vault.db-password}}': 'db-secret',
      '{{vault.api-key}}': 'api-secret',
      '{{vault.webhook-secret}}': 'webhook-secret-value',
    });
  });
});
