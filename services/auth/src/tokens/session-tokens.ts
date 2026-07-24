/**
 * Session-token assembly — glues the stateless access-JWT {@link TokenIssuer}
 * to the stateful refresh-session store into the wire {@link TokenSet}.
 *
 * Persistence goes through `store/sessions.ts` (Redis), so route/flow tests
 * mock that module and exercise this assembly against real `jose` crypto.
 */
import type { TokenIssuer } from './issuer.js';
import type { AccessTokenInput, TokenSet } from './types.js';
import type { RedisClient } from '../redis/index.js';

import {
  createSession,
  getSessionByRefreshToken,
  rotateRefreshToken,
} from '../store/sessions.js';

import { ACCESS_TTL_SECONDS } from './issuer.js';

/**
 * Mint a full token set for a fresh authentication: create the `sid`-bound
 * session + refresh token, then sign the access JWT over `input`.
 */
export async function issueTokenSet(
  redis: RedisClient,
  issuer: TokenIssuer,
  input: AccessTokenInput,
): Promise<TokenSet> {
  const { refreshToken } = await createSession(redis, {
    sub: input.sub,
    email: input.email,
    name: input.name,
    amr: input.amr,
    wsp: input.wsp,
    wspRole: input.wspRole,
    inv: input.inv,
  });

  const { token, claims } = await issuer.mintAccessToken(input);

  return {
    accessToken: token,
    refreshToken,
    expiresIn: ACCESS_TTL_SECONDS,
    tokenType: 'Bearer',
    claims,
  };
}

/**
 * Rotate a token set from a valid refresh token: resolve the bound session,
 * mint a fresh access JWT off its stored claims, and rotate the refresh token.
 * Returns `null` when the refresh token is unknown, dangling, or already
 * rotated — the caller maps that to HTTP 401.
 */
export async function refreshTokenSet(
  redis: RedisClient,
  issuer: TokenIssuer,
  refreshToken: string,
): Promise<TokenSet | null> {
  const session = await getSessionByRefreshToken(redis, refreshToken);
  if (session == null) return null;

  const rotated = await rotateRefreshToken(redis, session.sid, refreshToken);
  if (rotated == null) return null;

  const { token, claims } = await issuer.mintAccessToken({
    sub: session.sub,
    email: session.email,
    name: session.name,
    amr: session.amr,
    wsp: session.wsp,
    wspRole: session.wspRole,
    inv: session.inv,
  });

  return {
    accessToken: token,
    refreshToken: rotated,
    expiresIn: ACCESS_TTL_SECONDS,
    tokenType: 'Bearer',
    claims,
  };
}
