/**
 * Access-token crypto core — HS256 mint + verify via `jose`.
 *
 * Pure and dependency-free (no DB/Redis): give it a shared secret and it mints
 * and verifies access JWTs. The refresh token is opaque and lives server-side
 * (see `store/sessions.ts`); this module never touches it.
 */
import type { AccessTokenClaims, AccessTokenInput } from './types.js';

import { randomUUID } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

/** Access-token lifetime: 15 minutes (short — refresh rotates it). */
export const ACCESS_TTL_SECONDS = 15 * 60;
/** Refresh-token lifetime: 30 days. */
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const ALG = 'HS256';
/** Issuer claim — stamped on mint and enforced on verify (token-confusion
 *  hardening if this HS256 secret is ever shared with another signer). */
const ISSUER = 'open-tomato-auth';
/**
 * Signing-key id stamped in the JWT header. A single static id today (one HS256
 * key), but present from day one so tokens are **rotation-ready**: the RS256/JWKS
 * graduation swaps the key set and selects by `kid` (O(1), no scanning) without
 * a token-shape change. See the auth-architecture direction (D-JWT graduation).
 */
const KID = 'hs-1';

/** Current epoch seconds (floored) — the JWT time unit. */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export interface TokenIssuer {
  /**
   * Mint a signed access token. `iat`/`exp` are stamped from `issuedAt`
   * (defaults to now) + {@link ACCESS_TTL_SECONDS}.
   */
  mintAccessToken(
    input: AccessTokenInput,
    issuedAt?: number,
  ): Promise<{ token: string; claims: AccessTokenClaims }>;
  /**
   * Verify signature + expiry and return the decoded claims, or `null` when the
   * token is malformed, tampered, or expired.
   */
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;
}

/**
 * Build a token issuer bound to a shared HS256 secret. All access tokens minted
 * by this service — and every `POST /introspect` verification — go through the
 * same secret, per decision D-JWT.
 */
export function createTokenIssuer(secret: string): TokenIssuer {
  const key = new TextEncoder().encode(secret);

  return {
    async mintAccessToken(input, issuedAt = nowSeconds()) {
      const iat = issuedAt;
      const exp = iat + ACCESS_TTL_SECONDS;
      // Explicit allow-list of signed claim fields — structurally closes the
      // token so a caller spreading a wider object into `input` can never sign
      // extra fields in (defense in depth beyond the AccessTokenInput type).
      const signedClaims = {
        sub: input.sub,
        email: input.email,
        name: input.name,
        amr: input.amr,
        ...(input.wsp === undefined
          ? {}
          : { wsp: input.wsp }),
      };
      const claims: AccessTokenClaims = { ...signedClaims, iat, exp };

      // jose owns `iat`/`exp` in the signed payload; we mirror them into the
      // returned `claims` so callers get the exact decoded shape without a
      // round-trip. `jti` (a per-token id) is the hook a future access-token
      // denylist checks — minted now so tokens are identifiable from day one.
      const token = await new SignJWT({ ...signedClaims })
        .setProtectedHeader({ alg: ALG, typ: 'JWT', kid: KID })
        .setIssuer(ISSUER)
        .setJti(randomUUID())
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(key);

      return { token, claims };
    },

    async verifyAccessToken(token) {
      try {
        // Pin `typ: 'JWT'` (mint sets it) so a token of a DIFFERENT class signed
        // with the same secret — e.g. the OAuth pending-federation token
        // (`typ: 'ot-pending-fed'`) — can never verify as an access token.
        const { payload } = await jwtVerify(token, key, { algorithms: [ALG], issuer: ISSUER, typ: 'JWT' });
        // Shape guard: only a genuine access token (required claims present and
        // well-typed) is trusted. Blocks any payload that verifies but isn't one.
        if (
          typeof payload.sub !== 'string' || payload.sub === ''
          || typeof payload['email'] !== 'string'
          || typeof payload['name'] !== 'string'
          || !Array.isArray(payload['amr'])
        ) {
          return null;
        }
        return payload as unknown as AccessTokenClaims;
      } catch {
        return null;
      }
    },
  };
}
