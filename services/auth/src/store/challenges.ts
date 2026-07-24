/**
 * Sign-in 2FA challenge store (Redis). When a password sign-in lands on an
 * account with a confirmed second factor, step 1 mints a short-lived,
 * single-use challenge **bound to that user**. Step 2 (`POST /sign-in/2fa`,
 * delivered in 09b) resolves the challenge back to its user — the client's
 * claimed `sub` is never trusted.
 *
 * 09a mints and stores the challenge so `POST /sign-in/email` returns the
 * correct `two_factor_required` shape; the verify handler that consumes it is
 * out of scope here.
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
