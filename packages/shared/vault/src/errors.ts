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
