import type { RedisClient } from '../../redis/index.js';

import { describe, expect, it } from 'vitest';

import {
  ACCESS_TTL_SECONDS,
  createTokenIssuer,
  nowSeconds,
  REFRESH_TTL_SECONDS,
} from '../issuer.js';
import { issueTokenSet, refreshTokenSet } from '../session-tokens.js';

// ---------------------------------------------------------------------------
// A minimal in-memory Redis stub — enough of the ioredis surface for the
// session store (get / set-with-EX / del). No live Redis, no TTL simulation.
// ---------------------------------------------------------------------------

function createFakeRedis(): RedisClient {
  const map = new Map<string, string>();
  const fake = {
    async get(key: string): Promise<string | null> {
      return map.has(key)
        ? map.get(key)!
        : null;
    },
    async set(key: string, value: string): Promise<'OK'> {
      map.set(key, value);
      return 'OK';
    },
    async del(key: string): Promise<number> {
      return map.delete(key)
        ? 1
        : 0;
    },
  };
  return fake as unknown as RedisClient;
}

const SECRET = 'unit-test-secret';

const baseClaims = {
  sub: 'usr_test',
  email: 'test@open-tomato.dev',
  name: 'Test User',
  amr: ['pwd'] as const,
};

describe('createTokenIssuer', () => {
  it('round-trips a minted access token through introspection', async () => {
    const issuer = createTokenIssuer(SECRET);
    const { token, claims } = await issuer.mintAccessToken({ ...baseClaims, amr: ['pwd'] });

    expect(token.split('.')).toHaveLength(3); // header.payload.signature

    const verified = await issuer.verifyAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(baseClaims.sub);
    expect(verified?.email).toBe(baseClaims.email);
    expect(verified?.amr).toEqual(['pwd']);
    expect(verified?.exp).toBe(claims.iat + ACCESS_TTL_SECONDS);
  });

  it('stamps iat/exp 15 minutes apart', async () => {
    const issuer = createTokenIssuer(SECRET);
    const { claims } = await issuer.mintAccessToken({ ...baseClaims, amr: ['pwd'] });
    expect(claims.exp - claims.iat).toBe(ACCESS_TTL_SECONDS);
  });

  it('rejects an expired token', async () => {
    const issuer = createTokenIssuer(SECRET);
    // Issue with an `iat` far enough in the past that exp is already elapsed.
    const { token } = await issuer.mintAccessToken(
      { ...baseClaims, amr: ['pwd'] },
      nowSeconds() - ACCESS_TTL_SECONDS - 60,
    );
    expect(await issuer.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const issuer = createTokenIssuer(SECRET);
    const other = createTokenIssuer('a-different-secret');
    const { token } = await other.mintAccessToken({ ...baseClaims, amr: ['pwd'] });
    expect(await issuer.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const issuer = createTokenIssuer(SECRET);
    const { token } = await issuer.mintAccessToken({ ...baseClaims, amr: ['pwd'] });
    const tampered = `${token}x`;
    expect(await issuer.verifyAccessToken(tampered)).toBeNull();
  });

  it('preserves optional workspace claims', async () => {
    const issuer = createTokenIssuer(SECRET);
    const { token } = await issuer.mintAccessToken({
      ...baseClaims,
      amr: ['pwd'],
      wsp: 'ws_open_garden',
      wspRole: 'member',
      inv: 'inv_og',
    });
    const verified = await issuer.verifyAccessToken(token);
    expect(verified?.wsp).toBe('ws_open_garden');
    expect(verified?.wspRole).toBe('member');
    expect(verified?.inv).toBe('inv_og');
  });
});

describe('issueTokenSet', () => {
  it('produces a contract-shaped TokenSet', async () => {
    const redis = createFakeRedis();
    const issuer = createTokenIssuer(SECRET);

    const set = await issueTokenSet(redis, issuer, { ...baseClaims, amr: ['pwd'] });

    expect(set.tokenType).toBe('Bearer');
    expect(set.expiresIn).toBe(ACCESS_TTL_SECONDS);
    expect(set.refreshToken).toMatch(/^rt_/);
    expect(set.accessToken.split('.')).toHaveLength(3);
    expect(set.claims.amr).toEqual(['pwd']);
    expect(set.claims.sub).toBe(baseClaims.sub);
  });
});

describe('refreshTokenSet', () => {
  it('rotates the refresh token and mints a fresh access token', async () => {
    const redis = createFakeRedis();
    const issuer = createTokenIssuer(SECRET);

    const first = await issueTokenSet(redis, issuer, { ...baseClaims, amr: ['pwd'] });
    const rotated = await refreshTokenSet(redis, issuer, first.refreshToken);

    expect(rotated).not.toBeNull();
    expect(rotated?.refreshToken).not.toBe(first.refreshToken);
    expect(rotated?.refreshToken).toMatch(/^rt_/);
    // The rotated access token still verifies and carries the same subject.
    const claims = await issuer.verifyAccessToken(rotated!.accessToken);
    expect(claims?.sub).toBe(baseClaims.sub);
    expect(claims?.amr).toEqual(['pwd']);
  });

  it('invalidates the old refresh token after rotation', async () => {
    const redis = createFakeRedis();
    const issuer = createTokenIssuer(SECRET);

    const first = await issueTokenSet(redis, issuer, { ...baseClaims, amr: ['pwd'] });
    await refreshTokenSet(redis, issuer, first.refreshToken);

    // Re-presenting the consumed token must fail.
    expect(await refreshTokenSet(redis, issuer, first.refreshToken)).toBeNull();
  });

  it('rejects an unknown refresh token', async () => {
    const redis = createFakeRedis();
    const issuer = createTokenIssuer(SECRET);
    expect(await refreshTokenSet(redis, issuer, 'rt_does_not_exist')).toBeNull();
  });

  it('carries the 30-day refresh lifetime constant', () => {
    expect(REFRESH_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
  });
});
