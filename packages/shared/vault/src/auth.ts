import type { Readable, Writable } from 'node:stream';

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import { VaultAuthError } from './errors.js';

/**
 * Authentication strategy used to resolve a Bitwarden Secrets Manager access
 * token (`BWS_ACCESS_TOKEN`).
 *
 * - `'env'` reads the token from `process.env.BWS_ACCESS_TOKEN`. This is the
 *   strategy used by CI, production services, and any non-interactive context.
 * - `'file'` reads the token from a file on disk (default `~/.bws/token`),
 *   for operators who provision the token via a system-level secret store
 *   that writes to a file rather than exporting an env var.
 * - `'interactive'` prompts on a TTY using `node:readline`, for ad-hoc
 *   developer commands when no token is available in the environment.
 */
export type AuthStrategy = 'env' | 'file' | 'interactive';

/**
 * Strategy-specific options for {@link resolveAuth}. Each field is consulted
 * only by the strategy that uses it and ignored by the others, so a single
 * options object can be passed regardless of which strategy is selected.
 */
export interface ResolveAuthOptions {
  /**
   * Path to the token file used by the `'file'` strategy. Defaults to
   * `~/.bws/token` when omitted. Ignored by the `'env'` and `'interactive'`
   * strategies.
   */
  tokenPath?: string;
  /**
   * Input stream the `'interactive'` strategy reads the token from. Defaults
   * to `process.stdin`. Exposed primarily so tests can inject a fake TTY
   * stream; production callers should leave this unset. Ignored by the
   * `'env'` and `'file'` strategies.
   */
  input?: Readable;
  /**
   * Output stream the `'interactive'` strategy writes the prompt to. Defaults
   * to `process.stdout`. Exposed primarily so tests can capture prompt
   * output; production callers should leave this unset. Ignored by the
   * `'env'` and `'file'` strategies.
   */
  output?: Writable;
}

/**
 * Resolved access token returned by {@link resolveAuth}. Wrapped in an object
 * so future fields (source path, expiry, etc.) can be added without changing
 * the public call signature.
 */
export interface ResolvedAuth {
  /** The Bitwarden Secrets Manager access token. */
  token: string;
}

/**
 * Resolve a Bitwarden Secrets Manager access token using the requested
 * authentication strategy.
 *
 * Per-strategy behaviour is implemented by the dedicated handlers below; this
 * dispatcher only validates the strategy and forwards strategy-specific
 * options. All failure paths throw {@link VaultAuthError} with a remediation
 * message attached by the error class.
 *
 * @param strategy - The {@link AuthStrategy} to use.
 * @param options - Strategy-specific options. Defaults to `{}`.
 * @throws {VaultAuthError} when the chosen strategy cannot produce a token.
 */
export async function resolveAuth(
  strategy: AuthStrategy,
  options: ResolveAuthOptions = {},
): Promise<ResolvedAuth> {
  switch (strategy) {
    case 'env':
      return resolveFromEnv();
    case 'file':
      return resolveFromFile(options.tokenPath);
    case 'interactive':
      return resolveFromInteractive(options.input, options.output);
  }
}

async function resolveFromEnv(): Promise<ResolvedAuth> {
  const token = process.env.BWS_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new VaultAuthError({
      reason: 'BWS_ACCESS_TOKEN is not set in the environment',
    });
  }
  return { token };
}

async function resolveFromFile(tokenPath: string | undefined): Promise<ResolvedAuth> {
  const resolvedPath = tokenPath ?? join(homedir(), '.bws', 'token');

  let contents: string;
  try {
    contents = await readFile(resolvedPath, 'utf8');
  } catch (cause) {
    throw new VaultAuthError({
      reason: `token file at ${resolvedPath} could not be read`,
      cause,
    });
  }

  const token = contents.trim();
  if (!token) {
    throw new VaultAuthError({
      reason: `token file at ${resolvedPath} is empty`,
    });
  }
  return { token };
}

async function resolveFromInteractive(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<ResolvedAuth> {
  // `isTTY` is only present on `tty.ReadStream`; on a piped/redirected stdin
  // the property is `undefined`, so a strict `!== true` check rejects every
  // non-interactive context (CI, `cmd < file`, `cmd | tomato …`) without
  // requiring callers to plumb an extra flag through.
  const isTTY = (input as { isTTY?: boolean }).isTTY === true;
  if (!isTTY) {
    throw new VaultAuthError({
      reason: 'cannot prompt for BWS_ACCESS_TOKEN: stdin is not a TTY',
    });
  }

  const rl = createInterface({ input, output, terminal: false });
  let answer: string;
  try {
    answer = await rl.question('BWS_ACCESS_TOKEN: ');
  } finally {
    rl.close();
  }

  const token = answer.trim();
  if (!token) {
    throw new VaultAuthError({
      reason: 'BWS_ACCESS_TOKEN prompt returned an empty value',
    });
  }
  return { token };
}
