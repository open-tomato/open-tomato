/**
 * Error codes surfaced by the config loader. Every {@link ConfigError} carries
 * one so callers can branch without string-matching messages.
 *
 * - `MISSING_DEFAULT` — no `config.default.yaml` was found in the config dir.
 * - `VALIDATION_FAILED` — the merged config failed schema validation.
 * - `UNRESOLVED_TEMPLATE` — a template placeholder could not be resolved
 *   (a `{{config.*}}` self-reference pointing nowhere, or a `{{vault.*}}` /
 *   `{{proc.*}}` placeholder still present — meaning `tomato config export`
 *   was not run before the service started).
 * - `SCHEMA_MISMATCH` — an overlay file introduced an `env` key that does not
 *   exist in `config.default.yaml`.
 */
export type ConfigErrorCode =
  | 'MISSING_DEFAULT'
  | 'VALIDATION_FAILED'
  | 'UNRESOLVED_TEMPLATE'
  | 'SCHEMA_MISMATCH';

/** Optional location context attached to a {@link ConfigError}. */
export interface ConfigErrorContext {
  /** The config file the error originates from, if known. */
  file?: string;
  /** The dotted config key the error refers to, if applicable. */
  key?: string;
}

/**
 * The single error type thrown by `@open-tomato/config`. Discriminate on
 * {@link ConfigError.code}; `file` and `key` narrow the location when known.
 */
export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  readonly file?: string;
  readonly key?: string;

  constructor(
    code: ConfigErrorCode,
    message: string,
    context: ConfigErrorContext = {},
  ) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.file = context.file;
    this.key = context.key;
  }
}
