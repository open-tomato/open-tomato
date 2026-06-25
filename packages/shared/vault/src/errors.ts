/**
 * Base error class for `@open-tomato/vault`.
 *
 * Every vault failure extends `VaultError` and carries a stable, machine-readable
 * `code` so consumers can match on the code across package boundaries without
 * relying on `instanceof` checks that depend on workspace class identity.
 */
export class VaultError extends Error {
  /** Stable, machine-readable error code (e.g. `"AUTH_FAILED"`, `"REF_NOT_FOUND"`). */
  readonly code: string;

  /**
   * @param opts.message - Human-readable error message.
   * @param opts.code - Stable, machine-readable error code.
   * @param opts.cause - The underlying error that triggered this one, forwarded to `Error.cause`.
   */
  constructor(opts: { message: string; code: string; cause?: unknown }) {
    super(opts.message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.code = opts.code;
  }
}

/**
 * Standard remediation guidance appended to every {@link VaultAuthError}.
 *
 * Lists the three concrete operator actions that resolve missing or invalid
 * `BWS_ACCESS_TOKEN` cases — one per supported auth strategy — so the error
 * message tells the reader how to fix the problem without depending on
 * external docs.
 */
const AUTH_REMEDIATION =
  'Set BWS_ACCESS_TOKEN in the environment, configure the file auth strategy ' +
  'with a readable token path, or run the command interactively on a TTY.';

/**
 * Thrown when a `BWS_ACCESS_TOKEN` is missing, unreadable, or rejected by
 * Bitwarden Secrets Manager.
 *
 * Every instance carries `code: 'AUTH_FAILED'` and a `message` that combines
 * the caller-supplied `reason` with a fixed remediation hint, so callers never
 * have to remember to append the "how to fix this" guidance themselves.
 */
export class VaultAuthError extends VaultError {
  /**
   * @param opts.reason - Short description of the specific auth failure
   *   (e.g. `'BWS_ACCESS_TOKEN is not set'`). Should not end with a period —
   *   the constructor appends the remediation sentence.
   * @param opts.cause - The underlying error, if any (e.g. an `ENOENT` from
   *   the file strategy or an SDK rejection from BWS).
   */
  constructor(opts: { reason: string; cause?: unknown }) {
    super({
      message: `${opts.reason}. ${AUTH_REMEDIATION}`,
      code: 'AUTH_FAILED',
      cause: opts.cause,
    });
  }
}

/**
 * Thrown when a `{{vault.<id>}}` reference cannot be resolved to any concrete
 * BWS secret after walking the id-mapping fallback list.
 *
 * Carries the original `ref` string (so log messages can echo the exact token
 * the operator wrote) and the full `triedKeys` array (so operators can see
 * which concrete keys the resolver attempted, in fallback order, and create
 * the missing secret under the right name).
 */
export class VaultRefNotFoundError extends VaultError {
  /** The original `{{vault.<id>}}` reference string that failed to resolve. */
  readonly ref: string;

  /** Concrete BWS keys attempted, in fallback order. */
  readonly triedKeys: readonly string[];

  /**
   * @param opts.ref - The original `{{vault.<id>}}` reference string.
   * @param opts.triedKeys - Concrete BWS keys attempted, in fallback order.
   * @param opts.cause - The underlying error, if any.
   */
  constructor(opts: { ref: string; triedKeys: readonly string[]; cause?: unknown }) {
    super({
      message:
        `Vault reference ${opts.ref} could not be resolved ` +
        `(tried: ${opts.triedKeys.join(', ')}).`,
      code: 'REF_NOT_FOUND',
      cause: opts.cause,
    });
    this.ref = opts.ref;
    this.triedKeys = opts.triedKeys;
  }
}
