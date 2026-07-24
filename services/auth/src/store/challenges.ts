/**
 * Sign-in 2FA challenge store (Redis). When a password sign-in lands on an
 * account with a confirmed second factor, step 1 mints a short-lived,
 * single-use challenge **bound to that user**. Step 2 (`POST /sign-in/2fa`,
 * delivered in 09b) resolves the challenge back to its user — the client's
 * claimed `sub` is never trusted.
 *
 * `POST /sign-in/email` mints and stores the challenge; `POST /sign-in/2fa`
 * (09b) reads it back to recover the bound user, then consumes it on a
 * successful verify so a challenge can never mint more than one token set.
 */
import type { RedisClient } from '../redis/index.js';

import { randomUUID } from 'node:crypto';

/** Challenges live only for the length of one sign-in attempt. */
export const CHALLENGE_TTL_SECONDS = 5 * 60;

const CHALLENGE_PREFIX = 'auth:chl:';

export type TwoFactorMethod = 'totp' | 'passkey';

export interface ChallengeRecord {
  challengeId: string;
  userId: string;
  methods: TwoFactorMethod[];
}

const challengeKey = (challengeId: string): string => `${CHALLENGE_PREFIX}${challengeId}`;

/**
 * Mint + store a sign-in challenge bound to `userId`, returning its id and the
 * offered methods. Single-use + TTL enforcement belong to the 09b verify path.
 */
export async function createSignInChallenge(
  redis: RedisClient,
  userId: string,
  methods: TwoFactorMethod[],
): Promise<ChallengeRecord> {
  const challengeId = `chl_${randomUUID().replace(/-/g, '')}`;
  const record: ChallengeRecord = { challengeId, userId, methods };
  await redis.set(challengeKey(challengeId), JSON.stringify(record), 'EX', CHALLENGE_TTL_SECONDS);
  return record;
}

/**
 * Resolve a challenge id back to its bound record, or `null` when it is unknown
 * or has expired (TTL). Non-destructive: a wrong code may be retried within the
 * challenge's short TTL. The client's claimed user is irrelevant — the bound
 * `userId` here is the only identity trusted by step 2.
 */
export async function getSignInChallenge(
  redis: RedisClient,
  challengeId: string,
): Promise<ChallengeRecord | null> {
  const raw = await redis.get(challengeKey(challengeId));
  if (raw == null) return null;
  return JSON.parse(raw) as ChallengeRecord;
}

/**
 * Consume (delete) a challenge so it cannot mint a second token set. `DEL` is
 * atomic and reports how many keys it removed, so this doubles as the
 * single-use gate: the FIRST caller gets `true` (removed 1), a concurrent
 * duplicate gets `false` (already gone). Callers mint only when this returns
 * `true`. Called after a successful second-factor verification.
 */
export async function consumeSignInChallenge(
  redis: RedisClient,
  challengeId: string,
): Promise<boolean> {
  const removed = await redis.del(challengeKey(challengeId));
  return removed > 0;
}
