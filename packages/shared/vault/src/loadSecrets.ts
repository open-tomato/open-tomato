import type { AuthStrategy } from './auth.js';

import { resolveAuth } from './auth.js';
import { createClient } from './client.js';
import { VaultRefNotFoundError } from './errors.js';
import { resolveVaultId } from './mapping.js';

/**
 * Options accepted by {@link loadSecrets}.
 */
export interface LoadSecretsOptions {
  /**
   * Deployment environment (e.g. `'production'`, `'staging'`). Forwarded to
   * {@link resolveVaultId} when building the per-id fallback list. Pass `''`
   * when no environment context is available.
   */
  env: string;
  /**
   * Optional deployment region (e.g. `'us-east-1'`). Forwarded to
   * {@link resolveVaultId}; only contributes a candidate key when `env` is
   * also non-empty.
   */
  region?: string;
  /**
   * Authentication strategy used to resolve the BWS access token. Defaults to
   * `'env'` so non-interactive contexts (CI, production services) work without
   * the caller having to spell out the strategy. See {@link AuthStrategy} for
   * the available values.
   */
  auth?: AuthStrategy;
}

/**
 * Pattern matching a single `{{vault.<id>}}` reference.
 *
 * Tolerates surrounding whitespace inside the braces — `{{ vault.db-password }}`
 * is accepted — because configs are commonly hand-edited and the upstream
 * trimming behaviour is consumer-specific. The id capture group is everything
 * up to the closing brace, minus whitespace, so embedded dots and dashes
 * (`api.gateway-key`) pass through untouched.
 */
const VAULT_REF_PATTERN = /^\s*\{\{\s*vault\.([^\s}]+)\s*\}\}\s*$/;

/**
 * Extract the bare id from a `{{vault.<id>}}` reference string. Throws when
 * the input does not match the expected syntax — a programmer error from the
 * caller, not a runtime vault failure, so it is not wrapped in a
 * {@link VaultError} subclass.
 */
function extractVaultId(ref: string): string {
  const match = VAULT_REF_PATTERN.exec(ref);
  const id = match?.[1];
  if (!id) {
    throw new Error(
      `Invalid vault reference: ${JSON.stringify(ref)} ` +
        '(expected "{{vault.<id>}}")',
    );
  }
  return id;
}

/**
 * Resolve a batch of `{{vault.<id>}}` references to their concrete secret
 * values against Bitwarden Secrets Manager.
 *
 * For each ref, the bare id is extracted and walked through the id-mapping
 * fallback list (see {@link resolveVaultId}) against the underlying client;
 * the first non-null hit wins. References that resolve to the same id share
 * a single lookup, so a batch containing N copies of `{{vault.db-password}}`
 * makes one set of client calls, not N.
 *
 * The returned record is keyed by the **original** ref string (e.g.
 * `'{{vault.db-password}}'`), not by the bare id, so callers can splice the
 * resolved values back into the source text without re-parsing.
 *
 * @param refs - Vault reference strings. May contain duplicates; duplicates
 *   are collapsed in the returned record by virtue of object key uniqueness.
 * @param opts - Resolution options. See {@link LoadSecretsOptions}.
 * @returns A record mapping each unique ref string to its resolved value.
 * @throws {VaultRefNotFoundError} when a ref's id has no matching secret
 *   anywhere in the fallback list. Carries the original `ref` and the full
 *   `triedKeys` array so operators can create the missing secret under the
 *   correct concrete name.
 * @throws {VaultAuthError} when the auth strategy cannot produce a token, or
 *   when BWS rejects the token at sync time.
 * @throws {VaultIOError} when the transport (native SDK binding or `bws`
 *   subprocess fallback) fails for non-authentication reasons.
 */
export async function loadSecrets(
  refs: string[],
  opts: LoadSecretsOptions,
): Promise<Record<string, string>> {
  if (refs.length === 0) {
    return {};
  }

  const { token } = await resolveAuth(opts.auth ?? 'env');
  const client = createClient(token);

  // Per-id cache so multiple refs sharing the same abstract id only walk the
  // fallback list once. The client itself already caches the populated key
  // map across getSecret calls, but this layer additionally skips the
  // per-candidate map lookups when the same id has already been resolved.
  const idCache = new Map<string, string>();
  const result: Record<string, string> = {};

  for (const ref of refs) {
    if (result[ref] !== undefined) {
      continue;
    }

    const id = extractVaultId(ref);
    const cached = idCache.get(id);
    if (cached !== undefined) {
      result[ref] = cached;
      continue;
    }

    const candidates = resolveVaultId(id, opts.env, opts.region);
    let resolved: string | undefined;
    for (const key of candidates) {
      // Sequential awaits are deliberate: we want to stop at the first
      // non-null hit, and the client's first getSecret call populates an
      // in-memory map that subsequent calls hit synchronously, so this loop
      // is cheap after the initial round-trip.
      const value = await client.getSecret(key);
      if (value !== null) {
        resolved = value;
        break;
      }
    }

    if (resolved === undefined) {
      throw new VaultRefNotFoundError({ ref, triedKeys: candidates });
    }

    idCache.set(id, resolved);
    result[ref] = resolved;
  }

  return result;
}
