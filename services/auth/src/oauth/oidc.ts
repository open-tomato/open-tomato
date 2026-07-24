/**
 * OIDC authorization-code + PKCE core.
 *
 * Pure, I/O-light helpers (PKCE, state/nonce, authorization-URL, claim→identity
 * mapping) live here and are unit-tested directly; the one network step
 * ({@link exchangeCodeForIdentity} — token POST + id_token JWKS verify) is a
 * thin seam route tests mock, matching the service's "mock the I/O boundary,
 * test the pure logic" convention.
 */
import type { OidcProviderConfig } from './providers.js';
import type { OAuthProvider } from '../tokens/types.js';
import type { JWTPayload } from 'jose';

import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify } from 'jose';

/** A verified federated identity, resolved from a provider's id_token. */
export interface FederatedIdentity {
  provider: OAuthProvider;
  /** The provider's stable subject id (`sub`) — what we key `oauth_accounts` on. */
  providerUid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

const base64url = (buf: Buffer): string => buf.toString('base64url');

// --- PKCE + CSRF/replay nonces --------------------------------------------

/** A high-entropy PKCE code verifier (RFC 7636 — 43–128 base64url chars). */
export const generateCodeVerifier = (): string => base64url(randomBytes(48));

/** The S256 code challenge for a verifier: `base64url(sha256(verifier))`. */
export const codeChallengeS256 = (verifier: string): string => base64url(createHash('sha256').update(verifier)
  .digest());

/** Opaque CSRF `state` value bound to the browser session. */
export const generateState = (): string => `st_${base64url(randomBytes(24))}`;

/** OIDC `nonce` — replay guard echoed in the id_token. */
export const generateNonce = (): string => base64url(randomBytes(24));

// --- Authorization request -------------------------------------------------

export interface AuthorizationParams {
  state: string;
  nonce: string;
  codeChallenge: string;
}

/** Build the provider authorization URL to redirect the browser to. */
export function buildAuthorizationUrl(config: OidcProviderConfig, params: AuthorizationParams): string {
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

// --- id_token → identity ---------------------------------------------------

/**
 * Map already-verified id_token claims to a {@link FederatedIdentity}, enforcing
 * the `nonce` replay guard and the presence of `sub`/`email`. Pure and directly
 * unit-tested. Returns `null` on a nonce mismatch or missing required claims.
 */
export function identityFromClaims(
  provider: OAuthProvider,
  claims: JWTPayload & { email?: unknown; name?: unknown; email_verified?: unknown; nonce?: unknown },
  expectedNonce: string,
): FederatedIdentity | null {
  if (typeof claims.nonce !== 'string' || claims.nonce !== expectedNonce) return null;
  if (typeof claims.sub !== 'string' || claims.sub === '') return null;
  if (typeof claims.email !== 'string' || claims.email === '') return null;
  // Only a provider-VERIFIED email may drive account provisioning or invitation
  // matching — an unverified/attacker-asserted email would allow taking over a
  // pending invite (or account) addressed to an address the subject doesn't own.
  if (claims.email_verified !== true) return null;

  const email = claims.email.trim().toLowerCase();
  const name = typeof claims.name === 'string' && claims.name !== ''
    ? claims.name
    : email;
  return {
    provider,
    providerUid: claims.sub,
    email,
    name,
    emailVerified: claims.email_verified === true,
  };
}

// --- Token exchange (network seam — mocked in route tests) -----------------

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function jwksFor(config: OidcProviderConfig): ReturnType<typeof createRemoteJWKSet> {
  let set = jwksCache.get(config.jwksUri);
  if (set == null) {
    set = createRemoteJWKSet(new URL(config.jwksUri));
    jwksCache.set(config.jwksUri, set);
  }
  return set;
}

/**
 * Exchange an authorization `code` (+ its PKCE verifier) for the provider's
 * tokens server-side, verify the id_token signature (JWKS) + `iss`/`aud`, and
 * return the federated identity — or `null` on any failure. The client never
 * sees `code` or the client secret. Never throws.
 */
export async function exchangeCodeForIdentity(
  config: OidcProviderConfig,
  input: { code: string; codeVerifier: string; expectedNonce: string },
): Promise<FederatedIdentity | null> {
  try {
    const res = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: input.codeVerifier,
      }).toString(),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { id_token?: unknown };
    if (typeof body.id_token !== 'string') return null;

    const { payload } = await jwtVerify(body.id_token, jwksFor(config), {
      issuer: config.issuer,
      audience: config.clientId,
    });

    return identityFromClaims(config.provider, payload, input.expectedNonce);
  } catch {
    return null;
  }
}
