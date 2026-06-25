import type {
  EmitResult,
  MatchResult,
  ProvisionAllowance,
  ProvisionRequest,
  ResolvedConfig,
  ValidationResult,
} from './types';

/**
 * Contract every infrastructure vendor plugin (e.g. `@open-tomato/platform-growbox`,
 * `@open-tomato/platform-heroku`) must implement. `@open-tomato/config` dispatches
 * to these methods during `loadConfig` and `bun svc generate`.
 *
 * ## Error semantics
 *
 * Every method follows the same two-channel error model:
 *
 * - **Programmer errors** — invalid arguments, internal invariant violations,
 *   misuse of the plugin API — must `throw` (typically an `Error` or subclass).
 *   These are bugs and should surface as uncaught exceptions to the caller.
 * - **User-facing errors** — anything the operator can fix by editing their
 *   config (missing capability, invalid template reference, schema violation)
 *   must be reported by returning a `ValidationResult` with `valid: false` and
 *   populated `errors`, *not* by throwing.
 *
 * The only method that surfaces user-facing errors structurally is
 * `validateProvision`. The other methods report user-facing problems via their
 * own result shapes (`matches: false` + `missing`, an unresolved template, an
 * empty `targets` array) — they should not throw on user mistakes either.
 */
export interface PlatformPlugin {
  /** Stable plugin identifier, typically the npm package name (e.g. `"@open-tomato/platform-heroku"`). */
  readonly name: string;
  /** Semver version of the plugin implementation (not the platform it targets). */
  readonly version: string;

  /**
   * Decide whether this plugin can satisfy a provision request.
   *
   * @param request - The provision request describing the service, environment,
   *   region, requested capabilities, and arbitrary metadata. Treated as
   *   read-only by the plugin.
   * @returns A `MatchResult` where `matches` indicates whether every required
   *   capability can be provided, `score` is a 0..1 confidence value (higher
   *   wins when multiple plugins match), and `missing` lists capabilities the
   *   plugin cannot satisfy.
   * @throws If `request` is malformed in a way the dispatcher should have
   *   prevented (programmer error). Capabilities this plugin simply doesn't
   *   support are not errors — return `matches: false` with the unsupported
   *   capabilities listed in `missing`.
   */
  matchCapabilities(request: ProvisionRequest): Promise<MatchResult>;

  /**
   * Resolve platform-specific references inside a template string against an
   * already-resolved config (e.g. expand `${platform.database.url}` using
   * values from `ctx.infrastructure`).
   *
   * @param template - The raw template string as it appears in the user's
   *   config. May contain zero or more platform references; plain strings must
   *   be returned unchanged.
   * @param ctx - The fully resolved config used to look up reference values.
   *   Treated as read-only.
   * @returns The template with every platform reference replaced by its
   *   resolved value. Unknown or unresolvable references must remain in the
   *   output untouched (callers detect them with a downstream check) — do not
   *   throw on user mistakes here.
   * @throws If the plugin's own state is invalid (e.g. it was called before
   *   initialization). Programmer error only.
   */
  resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string>;

  /**
   * Validate that a provision request is satisfiable given the allowance
   * granted by the dispatcher. This is the dedicated channel for surfacing
   * user-facing errors.
   *
   * @param request - The provision request being validated. Read-only.
   * @param allowance - The dispatcher's decision about which capabilities are
   *   permitted for this request, including resolved capability values in
   *   `caps` and any denial reasons. Read-only.
   * @returns A `ValidationResult` describing the outcome. `valid: true` means
   *   the request can proceed; `valid: false` means the operator must fix
   *   something — list each problem in `errors` with a config `path` and a
   *   human-readable `message`. Use `warnings` for non-blocking advice.
   * @throws Only on programmer errors (malformed arguments, internal
   *   invariant failures). All user-facing problems must be reported via the
   *   returned `ValidationResult`, never thrown.
   */
  validateProvision(
    request: ProvisionRequest,
    allowance: ProvisionAllowance,
  ): Promise<ValidationResult>;

  /**
   * Emit the platform artifacts (manifests, env files, lock entries) for a
   * fully resolved config. Called by `bun svc generate`.
   *
   * @param config - The resolved config to emit artifacts for. Read-only.
   * @returns An `EmitResult` whose `targets` lists every file the plugin wants
   *   written (with `kind`, `path`, `content`, and optional `mode`) and whose
   *   `lockHash` is a deterministic SHA-256 hex digest of the canonicalized
   *   targets — identical inputs must produce identical hashes so callers can
   *   detect drift.
   * @throws Only on programmer errors or unrecoverable I/O / serialization
   *   failures inside the plugin. Config-level mistakes should have been
   *   caught earlier by `validateProvision`; if `emit` discovers one anyway,
   *   it must still throw rather than silently writing partial output.
   */
  emit(config: ResolvedConfig): Promise<EmitResult>;
}
