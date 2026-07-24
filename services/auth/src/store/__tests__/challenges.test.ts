import { beforeEach, describe, expect, it } from 'vitest';

import {
  consumeSignInChallenge,
  createSignInChallenge,
  getSignInChallenge,
} from '../challenges.js';

import { createFakeRedis, type FakeRedis } from './fake-redis.js';

describe('sign-in challenge store', () => {
  let fake: FakeRedis;

  beforeEach(() => {
    fake = createFakeRedis();
  });

  it('round-trips a challenge bound to its user', async () => {
    const created = await createSignInChallenge(fake.client, 'usr_1', ['totp']);
    expect(created.challengeId).toMatch(/^chl_/);

    const resolved = await getSignInChallenge(fake.client, created.challengeId);
    expect(resolved).toEqual({ challengeId: created.challengeId, userId: 'usr_1', methods: ['totp'] });
  });

  it('returns null for an unknown challenge id', async () => {
    expect(await getSignInChallenge(fake.client, 'chl_nope')).toBeNull();
  });

  it('consume makes the challenge single-use and gates concurrent redemption', async () => {
    const created = await createSignInChallenge(fake.client, 'usr_1', ['totp']);

    // First consume wins (removed a key); a second finds it already gone.
    expect(await consumeSignInChallenge(fake.client, created.challengeId)).toBe(true);
    expect(await consumeSignInChallenge(fake.client, created.challengeId)).toBe(false);
    expect(await getSignInChallenge(fake.client, created.challengeId)).toBeNull();
  });
});
