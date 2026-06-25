import { VaultIOError } from './errors.js';

/**
 * Transport-agnostic Bitwarden Secrets Manager client used by
 * {@link createClient}.
 *
 * The interface exists so callers can depend on a stable shape regardless of
 * which transport the package ends up using under the hood — the native
 * `@bitwarden/sdk-napi` binding when it loads, and a `bws` subprocess fallback
 * when the native binding is unavailable on the host platform. Both transports
 * implement this exact contract; the choice is invisible to the caller.
 */
export interface VaultClient {
  /**
   * Look up a single BWS secret by its key.
   *
   * The `key` here is the human-readable secret name (e.g.
   * `db-password-staging-us-east-1`) that the id-mapping fallback list in
   * `resolveVaultId` already walks through; callers pass each candidate key in
   * order until one returns a non-null value.
   *
   * @param key - The concrete BWS secret key to look up.
   * @returns The secret value, or `null` when no secret with that key exists
   *   in the access token's organisation. A missing key is not an error — it
   *   lets the resolver fall through to the next candidate without throwing.
   * @throws {VaultIOError} when the underlying transport (SDK binding or
   *   `bws` subprocess) fails for any non-authentication, non-not-found
   *   reason — network errors, malformed responses, subprocess crashes.
   *   Authentication failures are surfaced as `VaultAuthError`, not
   *   `VaultIOError`, so callers can distinguish "fix your token" from
   *   "retry the request".
   */
  getSecret(key: string): Promise<string | null>;
}

/**
 * Build a {@link VaultClient} bound to a resolved BWS access token.
 *
 * The returned client lazily initialises its transport on the first
 * `getSecret` call so that constructing it is side-effect-free and cheap —
 * callers can hand a client to long-lived code paths without paying the
 * native-binding load cost until the first secret is actually requested.
 *
 * Concrete transport wiring (the `@bitwarden/sdk-napi` primary path and the
 * `bws` subprocess fallback) is layered on top of this contract by subsequent
 * stages in the plan; this function defines the public surface those stages
 * implement against.
 *
 * @param token - A Bitwarden Secrets Manager access token, typically resolved
 *   via the package's `resolveAuth` helper.
 * @returns A {@link VaultClient} bound to the supplied token.
 */
export function createClient(token: string): VaultClient {
  // `token` is captured by the closure so transport wiring added in later
  // stages can read it without changing the public signature. The void
  // expression silences the unused-parameter lint while the transport
  // remains a stub.
  void token;

  return {
    async getSecret(key: string): Promise<string | null> {
      throw new VaultIOError({
        reason: `BWS client transport is not yet wired up (requested key: ${key})`,
      });
    },
  };
}
