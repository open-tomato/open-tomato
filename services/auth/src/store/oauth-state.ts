/**
 * OAuth transaction state (Redis). Between the authorization redirect and the
 * callback we must remember, bound to the browser's `state`, the OIDC `nonce`
 * and the PKCE `code_verifier` — none of which may travel through the browser.
 *
 * Single-use (consumed with `GETDEL` on the callback) and short-TTL'd, so a
 * captured `state` can't be replayed and a stale flow simply expires.
 */
import type { RedisClient } from '../redis/index.js';
import type { OAuthProvider } from '../tokens/types.js';

/** Authorization flows live only for the length of one consent round-trip. */
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

const PREFIX = 'auth:oauthstate:';
const stateKey = (state: string): string => `${PREFIX}${state}`;

export interface OAuthStateRecord {
  provider: OAuthProvider;
  nonce: string;
  codeVerifier: string;
}

/** Persist the flow's secrets under its `state`, TTL'd to the consent window. */
export async function putOAuthState(
  redis: RedisClient,
  state: string,
  record: OAuthStateRecord,
): Promise<void> {
  await redis.set(stateKey(state), JSON.stringify(record), 'EX', OAUTH_STATE_TTL_SECONDS);
}

/**
 * Atomically fetch **and delete** the record for `state` (single-use CSRF/replay
 * guard). Returns `null` for an unknown/expired/already-consumed state — the
 * callback treats that as a failed CSRF check.
 */
export async function consumeOAuthState(
  redis: RedisClient,
  state: string,
): Promise<OAuthStateRecord | null> {
  const raw = await redis.getdel(stateKey(state));
  if (raw == null) return null;
  return JSON.parse(raw) as OAuthStateRecord;
}
