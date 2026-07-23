/**
 * Mock token minting + decoding.
 *
 * The mock produces JWT-SHAPED strings (`base64url(header).base64url(payload).sig`)
 * so the client exercises the same decode path it will use against real tokens.
 * The signature segment is a fixed placeholder — the mock does no crypto. A
 * real backend signs with its key; the client only ever reads claims.
 */

import type { Clock } from '../clock';
import type {
  AccessTokenClaims,
  RefreshTokenClaims,
  TokenSet,
} from '../types';

import { toEpochSeconds } from '../clock';

/** Access-token lifetime: 15 minutes (short — refresh rotates it). */
export const ACCESS_TTL_SECONDS = 15 * 60;
/** Refresh-token lifetime: 30 days. */
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const MOCK_SIGNATURE = 'mock-unsigned';

/** base64url without padding — JSON in, url-safe segment out (unicode-safe). */
const b64url = (value: unknown): string => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const decodeSegment = <T>(segment: string): T => {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
};

const sign = (claims: object): string => `${b64url(HEADER)}.${b64url(claims)}.${MOCK_SIGNATURE}`;

/** Random-ish but deterministic-friendly id (mock uses a counter, see authApi). */
export const makeId = (prefix: string, seed: number): string => `${prefix}_${seed.toString(36).padStart(6, '0')}`;

/**
 * Mint an access + refresh pair for a set of access-token claims. `iat`/`exp`
 * come from the injected clock so tokens are stable in tests.
 */
export const issueTokens = (
  claims: Omit<AccessTokenClaims, 'iat' | 'exp'>,
  sessionId: string,
  clock: Clock,
): TokenSet => {
  const iat = toEpochSeconds(clock());
  const accessClaims: AccessTokenClaims = {
    ...claims,
    iat,
    exp: iat + ACCESS_TTL_SECONDS,
  };
  const refreshClaims: RefreshTokenClaims = {
    sub: claims.sub,
    sid: sessionId,
    iat,
    exp: iat + REFRESH_TTL_SECONDS,
  };
  return {
    accessToken: sign(accessClaims),
    refreshToken: sign(refreshClaims),
    expiresIn: ACCESS_TTL_SECONDS,
    tokenType: 'Bearer',
    claims: accessClaims,
  };
};

/** Decode the access-token payload without verifying (client-side convenience). */
export const decodeAccessToken = (token: string): AccessTokenClaims => {
  const [, payload] = token.split('.');
  if (payload == null) throw new Error('malformed token');
  return decodeSegment<AccessTokenClaims>(payload);
};
