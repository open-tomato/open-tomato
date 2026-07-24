/**
 * Password-reset code store (Redis). A reset code is **bound to a single
 * account**: it lives at a per-user key, so a code minted for account A can
 * never be consumed for account B (the WS08 account-takeover fix — no
 * default-user fallback).
 *
 * The code is stored **hashed** (argon2id) so a Redis compromise doesn't hand
 * out live codes, and single-use (deleted on consume). The record carries its
 * own `expiresAt`; the Redis key outlives that window by a grace period so a
 * matched-but-late code can be reported as `expired` (offer resend) rather than
 * collapsing into `invalid` — an attacker without the code only ever sees
 * `invalid`, so this leaks nothing.
 */
import type { RedisClient } from '../redis/index.js';

import { randomInt } from 'node:crypto';

import { getDecoyHash, hashPassword, verifyPassword } from '../auth/password.js';
import { nowSeconds } from '../tokens/issuer.js';

/** Codes are valid for 15 minutes (per the contract). */
export const RESET_TTL_SECONDS = 15 * 60;
/**
 * The Redis key lingers past expiry so a matched-but-expired code reads as
 * `expired` instead of `invalid`. After this it is evicted and looks unknown.
 */
const RESET_GRACE_SECONDS = 30 * 60;

const RESET_PREFIX = 'auth:reset:';
const resetKey = (userId: string): string => `${RESET_PREFIX}${userId}`;

interface ResetCodeRecord {
  codeHash: string;
  /** Absolute expiry, seconds since epoch. */
  expiresAt: number;
}

export interface IssuedResetCode {
  /** The plaintext code to email (never persisted). */
  code: string;
  /** Validity window in minutes, for the email copy. */
  expiresInMinutes: number;
}

/** The outcome of consuming a reset code — the route maps this to the result union. */
export type ResetCodeCheck = 'ok' | 'expired' | 'invalid';

/** A six-digit numeric code (matches the emailed-OTP UX the reset screen expects). */
const generateNumericCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * Mint an account-bound reset code, store its hash (overwriting any prior code
 * for the user — a new request invalidates the old), and return the plaintext
 * for delivery.
 */
export async function createResetCode(redis: RedisClient, userId: string): Promise<IssuedResetCode> {
  const code = generateNumericCode();
  const record: ResetCodeRecord = {
    codeHash: await hashPassword(code),
    expiresAt: nowSeconds() + RESET_TTL_SECONDS,
  };
  await redis.set(resetKey(userId), JSON.stringify(record), 'EX', RESET_GRACE_SECONDS);
  return { code, expiresInMinutes: Math.floor(RESET_TTL_SECONDS / 60) };
}

/**
 * Validate a `(user, code)` pair and, on any decisive outcome, consume it.
 *   - no record for this user, or the code doesn't match → `invalid`
 *   - matches but past its window                        → `expired` (consumed)
 *   - matches and within its window                      → `ok` (consumed)
 *
 * A non-matching guess never deletes the record, so a live code survives a
 * wrong attempt; only the real code (or its expiry) clears it.
 */
export async function consumeResetCode(
  redis: RedisClient,
  userId: string,
  code: string,
): Promise<ResetCodeCheck> {
  const raw = await redis.get(resetKey(userId));
  if (raw == null) {
    // No pending code for this user (unknown email, or none requested). Pay the
    // same argon2 cost as the matched path so latency can't tell "has a live
    // reset code" apart from "doesn't" — closing the enumeration oracle.
    await verifyPassword(await getDecoyHash(), code.trim());
    return 'invalid';
  }

  const record = JSON.parse(raw) as ResetCodeRecord;
  const matches = await verifyPassword(record.codeHash, code.trim());
  if (!matches) return 'invalid';

  await redis.del(resetKey(userId));
  return nowSeconds() > record.expiresAt
    ? 'expired'
    : 'ok';
}
