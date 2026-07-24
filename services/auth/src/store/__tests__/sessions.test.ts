import { beforeEach, describe, expect, it } from 'vitest';

import { createSession, type NewSessionInput, revokeUserSessions } from '../sessions.js';

import { createFakeRedis, type FakeRedis } from './fake-redis.js';

const newSessionInput = (sub: string): NewSessionInput => ({
  sub,
  email: `${sub}@open-tomato.dev`,
  name: sub,
  amr: ['pwd'],
});

describe('sessions store — user index + revoke', () => {
  let fake: FakeRedis;

  beforeEach(() => {
    fake = createFakeRedis();
  });

  it('indexes each new session under its user', async () => {
    const a = await createSession(fake.client, newSessionInput('usr_1'));
    const b = await createSession(fake.client, newSessionInput('usr_1'));

    expect(fake.members('auth:usess:usr_1').sort()).toEqual([a.sid, b.sid].sort());
  });

  it('revokes every session for a user, dropping session + refresh keys and the index', async () => {
    const a = await createSession(fake.client, newSessionInput('usr_1'));
    const b = await createSession(fake.client, newSessionInput('usr_1'));

    const revoked = await revokeUserSessions(fake.client, 'usr_1');
    expect(revoked).toBe(2);

    // Both sessions and both refresh tokens are gone.
    expect(await fake.client.get(`auth:sess:${a.sid}`)).toBeNull();
    expect(await fake.client.get(`auth:sess:${b.sid}`)).toBeNull();
    expect(await fake.client.get(`auth:refresh:${a.refreshToken}`)).toBeNull();
    expect(await fake.client.get(`auth:refresh:${b.refreshToken}`)).toBeNull();
    expect(fake.members('auth:usess:usr_1')).toEqual([]);
  });

  it('leaves another user’s sessions untouched', async () => {
    const mine = await createSession(fake.client, newSessionInput('usr_1'));
    const theirs = await createSession(fake.client, newSessionInput('usr_2'));

    await revokeUserSessions(fake.client, 'usr_1');

    expect(await fake.client.get(`auth:sess:${mine.sid}`)).toBeNull();
    expect(await fake.client.get(`auth:sess:${theirs.sid}`)).not.toBeNull();
    expect(fake.members('auth:usess:usr_2')).toEqual([theirs.sid]);
  });

  it('is self-healing — an already-expired sid in the index is skipped, not counted', async () => {
    const live = await createSession(fake.client, newSessionInput('usr_1'));
    // Simulate a session whose TTL elapsed: index still lists it, keys are gone.
    await fake.client.sadd('auth:usess:usr_1', 'sid_ghost');

    const revoked = await revokeUserSessions(fake.client, 'usr_1');
    expect(revoked).toBe(1); // only the live session counted
    expect(await fake.client.get(`auth:sess:${live.sid}`)).toBeNull();
  });

  it('returns 0 when the user has no sessions', async () => {
    expect(await revokeUserSessions(fake.client, 'nobody')).toBe(0);
  });
});
