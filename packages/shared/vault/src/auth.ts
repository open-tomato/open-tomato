import process from 'node:process';

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
      return resolveFromInteractive();
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
  // Captured here so the file-strategy implementation task can wire in the
  // default (`~/.bws/token`) and the actual fs read without changing the
  // dispatcher above.
  void tokenPath;
  throw new VaultAuthError({
    reason: 'the \'file\' auth strategy is not yet implemented',
  });
}

async function resolveFromInteractive(): Promise<ResolvedAuth> {
  throw new VaultAuthError({
    reason: 'the \'interactive\' auth strategy is not yet implemented',
  });
}
