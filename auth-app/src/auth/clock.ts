/**
 * Deterministic clock for the mock backend.
 *
 * Token issuance needs a time base for `iat`/`exp`. The mock defaults to a
 * FROZEN instant so tokens (and their expiries) are byte-for-byte stable in
 * tests and fixtures — never `Date.now()`, which is non-deterministic and
 * throws in some workflow contexts. A real backend swaps this for wall-clock
 * time; the token shape and TTLs are unchanged.
 */

/** 2026-07-24T12:00:00Z — the fixed "now" every mock token is minted against. */
export const FROZEN_NOW_MS = Date.parse('2026-07-24T12:00:00Z');

export type Clock = () => number;

export const frozenClock: Clock = () => FROZEN_NOW_MS;

/** Seconds-since-epoch helper used for JWT-style `iat`/`exp` claims. */
export const toEpochSeconds = (ms: number): number => Math.floor(ms / 1000);
