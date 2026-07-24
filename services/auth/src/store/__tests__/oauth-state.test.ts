import { beforeEach, describe, expect, it } from 'vitest';

import { consumeOAuthState, putOAuthState } from '../oauth-state.js';

import { createFakeRedis, type FakeRedis } from './fake-redis.js';

describe('oauth-state store', () => {
  let fake: FakeRedis;

  beforeEach(() => {
    fake = createFakeRedis();
  });

  it('round-trips the flow secrets under its state', async () => {
    await putOAuthState(fake.client, 'st_1', { provider: 'google', nonce: 'n1', codeVerifier: 'v1' });
    expect(await consumeOAuthState(fake.client, 'st_1')).toEqual({
      provider: 'google', nonce: 'n1', codeVerifier: 'v1',
    });
  });

  it('is single-use — a consumed state cannot be replayed', async () => {
    await putOAuthState(fake.client, 'st_1', { provider: 'google', nonce: 'n1', codeVerifier: 'v1' });
    expect(await consumeOAuthState(fake.client, 'st_1')).not.toBeNull();
    expect(await consumeOAuthState(fake.client, 'st_1')).toBeNull();
  });

  it('returns null for an unknown state (failed CSRF check)', async () => {
    expect(await consumeOAuthState(fake.client, 'st_nope')).toBeNull();
  });
});
