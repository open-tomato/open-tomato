import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { VaultAuthError, VaultIOError } from './errors.js';

const execFileAsync = promisify(execFile);

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
 * Structural surfaces of `@bitwarden/sdk-napi` that the transport touches.
 *
 * Declared inline rather than imported so the package's compile-time and
 * runtime cost stays the same whether or not the native binding is present —
 * tests can mock `@bitwarden/sdk-napi` against this same shape without
 * depending on the upstream type declarations.
 */
interface SdkSecretValue {
  key: string;
  value: string;
}
interface SdkSyncResponse {
  secrets?: SdkSecretValue[] | null;
}
interface SdkSecretsClient {
  sync(organizationId: string): Promise<SdkSyncResponse>;
}
interface SdkAuthClient {
  loginAccessToken(accessToken: string, stateFile?: string): Promise<void>;
}
interface SdkBitwardenClient {
  auth(): SdkAuthClient;
  secrets(): SdkSecretsClient;
}
interface SdkModule {
  BitwardenClient: new () => SdkBitwardenClient;
}

/**
 * Recursively search a parsed state-file payload for the `organization_id`
 * (or `organizationId`) field. The bws Rust SDK serialises its client state
 * struct as JSON with snake_case keys, but the exact shape — root object vs.
 * a map keyed by access-token id — is undocumented and varies across SDK
 * versions, so a defensive walk beats hard-coding the path. Stops at the
 * first non-empty string match.
 */
function findOrganizationId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (
      (key === 'organization_id' || key === 'organizationId') &&
      typeof val === 'string' &&
      val.length > 0
    ) {
      return val;
    }
    const nested = findOrganizationId(val);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Shape of a single entry in the JSON array returned by
 * `bws secret list --output json`. Declared inline because the BWS CLI's JSON
 * schema is not published as a TypeScript type — only `key` and `value` are
 * load-bearing here, but the wider shape is left optional so the parser is
 * forward-compatible with new fields the CLI may add.
 */
interface BwsListedSecret {
  id?: string;
  organizationId?: string;
  projectId?: string;
  key?: string;
  value?: string;
  note?: string;
}

/**
 * Heuristic node-style error shape from `child_process.execFile`. We never
 * cast directly to `Error` because the rejected value carries `stdout`,
 * `stderr`, and `code` properties layered on top — those are what we read to
 * classify the failure as auth-vs-IO.
 */
interface ExecFileError {
  code?: string | number;
  stdout?: string;
  stderr?: string;
  message?: string;
}

/**
 * Fingerprint the `bws` CLI's stderr for token-rejection failure modes so we
 * can surface them as {@link VaultAuthError} rather than a generic IO error.
 *
 * The CLI does not emit a stable, machine-readable error code, so we match on
 * the human-readable messages it prints — kept as a small regex set so the
 * heuristic stays explicit and easy to extend when the CLI's wording shifts.
 */
function looksLikeAuthFailure(stderr: string): boolean {
  return (
    /access token/i.test(stderr) ||
    /unauthor/i.test(stderr) ||
    /invalid.*token/i.test(stderr) ||
    /\b401\b/.test(stderr) ||
    /\b403\b/.test(stderr)
  );
}

/**
 * Subprocess transport: shells out to `bws secret list --output json` and
 * parses the resulting JSON array into the same key→value map shape the SDK
 * transport produces. Used as the fallback path when `@bitwarden/sdk-napi`
 * fails to load (no prebuild for the host platform, dependency not
 * installed, etc.).
 *
 * `BWS_ACCESS_TOKEN` is forwarded through `env` rather than relying on the
 * inherited process env so the subprocess sees the token the caller actually
 * resolved through the chosen auth strategy — `file` and `interactive`
 * tokens never live in the parent process env, only in memory.
 */
async function populateCacheFromSubprocess(token: string): Promise<Map<string, string>> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      'bws',
      ['secret', 'list', '--output', 'json'],
      {
        // Inherit PATH and similar so the CLI can find its own config dirs,
        // but override BWS_ACCESS_TOKEN with the in-memory token we
        // resolved — never leak whatever value the parent process happened
        // to have set.
        env: { ...process.env, BWS_ACCESS_TOKEN: token },
        // BWS secret payloads can be large (cert bundles, multi-line keys);
        // bump the default 1 MiB buffer so a healthy org doesn't truncate.
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    stdout = result.stdout;
  } catch (rawCause) {
    const cause = rawCause as ExecFileError;
    if (cause.code === 'ENOENT') {
      throw new VaultIOError({
        reason:
          'bws CLI not found on PATH; install @bitwarden/sdk-napi prebuilds ' +
          'or the bws CLI to use @open-tomato/vault on this platform',
        cause: rawCause,
      });
    }
    const stderr = (cause.stderr ?? '').trim();
    if (looksLikeAuthFailure(stderr)) {
      throw new VaultAuthError({
        reason: 'bws CLI rejected the access token',
        cause: rawCause,
      });
    }
    throw new VaultIOError({
      reason: stderr
        ? `bws secret list failed: ${stderr}`
        : 'bws secret list failed',
      cause: rawCause,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (cause) {
    throw new VaultIOError({
      reason: 'bws CLI returned output that is not valid JSON',
      cause,
    });
  }

  if (!Array.isArray(parsed)) {
    throw new VaultIOError({
      reason: 'bws CLI returned a non-array JSON payload',
    });
  }

  const map = new Map<string, string>();
  for (const entry of parsed as BwsListedSecret[]) {
    if (
      entry &&
      typeof entry.key === 'string' &&
      typeof entry.value === 'string'
    ) {
      map.set(entry.key, entry.value);
    }
  }
  return map;
}

/**
 * Build a {@link VaultClient} bound to a resolved BWS access token.
 *
 * The returned client lazily initialises its transport on the first
 * `getSecret` call so that constructing it is side-effect-free and cheap —
 * callers can hand a client to long-lived code paths without paying the
 * native-binding load cost until the first secret is actually requested.
 *
 * The primary path uses `@bitwarden/sdk-napi` (lazy-imported the first time
 * `getSecret` runs). On first call it authenticates with the supplied token,
 * derives the organisation id from the SDK's state file, and pulls every
 * secret via `secrets().sync(orgId)` into an in-memory key→value map. When the
 * native binding fails to load — unsupported platform, missing prebuild —
 * the transport falls back to shelling out to the `bws` CLI (`bws secret list
 * --output json`) and building the same map from its JSON output. All
 * subsequent `getSecret` calls hit that map directly — a single network
 * round-trip serves an entire `loadSecrets` batch regardless of fanout.
 *
 * @param token - A Bitwarden Secrets Manager access token, typically resolved
 *   via the package's `resolveAuth` helper.
 * @returns A {@link VaultClient} bound to the supplied token.
 */
export function createClient(token: string): VaultClient {
  // Shared cache across `getSecret` calls on the same client. Holds a Promise
  // (not a Map) so concurrent first-time callers coalesce onto a single
  // populate attempt instead of racing each other into duplicate network
  // round-trips.
  let cachePromise: Promise<Map<string, string>> | undefined;

  async function populateCache(): Promise<Map<string, string>> {
    let sdk: SdkModule | undefined;
    try {
      // Dynamic import keeps the napi binding off the constructor path so
      // `createClient` itself never triggers a native load — important for
      // CLI subcommands that import vault but never end up resolving a
      // secret.
      sdk = (await import('@bitwarden/sdk-napi')) as unknown as SdkModule;
    } catch {
      // Native binding unavailable on this host (no prebuild for the
      // platform/arch, the package wasn't installed, etc.). Fall through to
      // the `bws` CLI subprocess transport — same contract, different
      // implementation. The SDK load failure itself is not surfaced; only the
      // subprocess fallback's outcome is reported to the caller, because the
      // SDK miss is the expected condition that triggers the fallback.
    }

    if (!sdk) {
      return populateCacheFromSubprocess(token);
    }

    const sdkClient = new sdk.BitwardenClient();

    // The SDK only writes the organisation id to its state file, so we hand
    // it a fresh temp path per client, read it back, and clean up. The dir
    // lives under tmpdir to stay within OS-managed cleanup if the process
    // crashes between login and `rm`.
    const stateDir = await mkdtemp(join(tmpdir(), 'open-tomato-vault-'));
    const stateFile = join(stateDir, 'bws-state.json');

    try {
      try {
        await sdkClient.auth().loginAccessToken(token, stateFile);
      } catch (cause) {
        // Pre-sync failures almost always mean a bad/expired token. Surface
        // as VaultAuthError so callers get the remediation hint that points
        // at `BWS_ACCESS_TOKEN` rather than a generic IO retry message.
        throw new VaultAuthError({
          reason: 'BWS rejected the access token',
          cause,
        });
      }

      let organizationId: string;
      try {
        const raw = await readFile(stateFile, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        const found = findOrganizationId(parsed);
        if (!found) {
          throw new Error('organization_id field missing from BWS state file');
        }
        organizationId = found;
      } catch (cause) {
        throw new VaultIOError({
          reason: 'Could not extract organizationId from BWS state file',
          cause,
        });
      }

      let syncResponse: SdkSyncResponse;
      try {
        syncResponse = await sdkClient.secrets().sync(organizationId);
      } catch (cause) {
        throw new VaultIOError({
          reason: 'BWS secrets sync failed',
          cause,
        });
      }

      const map = new Map<string, string>();
      for (const secret of syncResponse.secrets ?? []) {
        map.set(secret.key, secret.value);
      }
      return map;
    } finally {
      // Best-effort cleanup: a stranded temp dir is harmless, so swallow
      // errors here rather than masking the real failure that brought us
      // into the `finally`.
      await rm(stateDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  return {
    async getSecret(key: string): Promise<string | null> {
      if (!cachePromise) {
        const attempt = populateCache();
        cachePromise = attempt;
        // On rejection, reset the cache slot so the next `getSecret` call
        // gets a fresh attempt rather than re-throwing the same stale
        // failure forever. The identity guard avoids clobbering a newer
        // attempt that may already have replaced this one.
        attempt.catch(() => {
          if (cachePromise === attempt) cachePromise = undefined;
        });
      }
      const map = await cachePromise;
      return map.get(key) ?? null;
    },
  };
}
