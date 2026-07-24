/**
 * Refresh-session store (Redis). A sign-in mints a `sid`-bound session plus an
 * opaque refresh token; the access JWT is stateless, the refresh path is not.
 *
 * Two keys per session, both TTL'd to {@link REFRESH_TTL_SECONDS}:
 *   - `auth:sess:{sid}`      → the {@link SessionRecord} + its *current* refresh token
 *   - `auth:refresh:{token}` → the owning `sid` (reverse lookup)
 *
 * Rotation invalidates the old refresh token (its reverse key is deleted and
 * the session's `currentRefresh` is replaced), so a captured-but-rotated token
 * no longer resolves. All Redis access lives here so tests `vi.mock` this
 * module and never need a live Redis.
 */
import type { RedisClient } from '../redis/index.js';
import type { Amr, SessionRecord, WorkspaceRole } from '../tokens/types.js';

import { randomUUID } from 'node:crypto';

import { REFRESH_TTL_SECONDS } from '../tokens/issuer.js';

const SESSION_PREFIX = 'auth:sess:';
const REFRESH_PREFIX = 'auth:refresh:';

/** Persisted session envelope — the record plus the live refresh token. */
interface StoredSession extends SessionRecord {
  currentRefresh: string;
}

/** Claim inputs a new session carries (everything but the generated `sid`). */
export interface NewSessionInput {
  sub: string;
  email: string;
  name: string;
  amr: Amr[];
  wsp?: string;
  wspRole?: WorkspaceRole;
  inv?: string;
}

/** Opaque, unguessable refresh token — two UUIDs, no dashes. */
const mintRefreshToken = (): string => `rt_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
const mintSid = (): string => `sid_${randomUUID().replace(/-/g, '')}`;

const sessionKey = (sid: string): string => `${SESSION_PREFIX}${sid}`;
const refreshKey = (token: string): string => `${REFRESH_PREFIX}${token}`;

/**
 * Create a session and its first refresh token. Both Redis keys are written
 * with a 30-day TTL. Returns the generated `sid` + `refreshToken`.
 */
export async function createSession(
  redis: RedisClient,
  input: NewSessionInput,
): Promise<{ sid: string; refreshToken: string }> {
  const sid = mintSid();
  const refreshToken = mintRefreshToken();
  const stored: StoredSession = { sid, ...input, currentRefresh: refreshToken };

  await redis.set(sessionKey(sid), JSON.stringify(stored), 'EX', REFRESH_TTL_SECONDS);
  await redis.set(refreshKey(refreshToken), sid, 'EX', REFRESH_TTL_SECONDS);

  return { sid, refreshToken };
}

/**
 * Resolve a refresh token to its session, rejecting (returning `null`) an
 * unknown token, a dangling `sid`, or a token that is no longer the session's
 * current one (i.e. already rotated).
 */
export async function getSessionByRefreshToken(
  redis: RedisClient,
  refreshToken: string,
): Promise<SessionRecord | null> {
  const sid = await redis.get(refreshKey(refreshToken));
  if (sid == null) return null;

  const raw = await redis.get(sessionKey(sid));
  if (raw == null) return null;

  const stored = JSON.parse(raw) as StoredSession;
  if (stored.currentRefresh !== refreshToken) return null;

  return {
    sid: stored.sid,
    sub: stored.sub,
    email: stored.email,
    name: stored.name,
    amr: stored.amr,
    wsp: stored.wsp,
    wspRole: stored.wspRole,
    inv: stored.inv,
  };
}

/**
 * Rotate the refresh token for a session: mint a new one, point the session at
 * it, drop the old reverse key, and refresh both TTLs. Returns the new token,
 * or `null` if the session vanished mid-flight.
 */
export async function rotateRefreshToken(
  redis: RedisClient,
  sid: string,
  oldRefreshToken: string,
): Promise<string | null> {
  const raw = await redis.get(sessionKey(sid));
  if (raw == null) return null;

  const stored = JSON.parse(raw) as StoredSession;
  const newRefresh = mintRefreshToken();
  const next: StoredSession = { ...stored, currentRefresh: newRefresh };

  await redis.set(sessionKey(sid), JSON.stringify(next), 'EX', REFRESH_TTL_SECONDS);
  await redis.set(refreshKey(newRefresh), sid, 'EX', REFRESH_TTL_SECONDS);
  await redis.del(refreshKey(oldRefreshToken));

  return newRefresh;
}
