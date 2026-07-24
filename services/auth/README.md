# services/auth — `@open-tomato/auth`

The Open Tomato authentication gateway backend, on the `@open-tomato/express`
service chassis (port **4500**). Implements `auth-app/docs/auth-api-contract.md`
so the auth app can run against a live service instead of its in-app mock.

Built per the plan at `docs/plans/poc-release/09-auth-backend.md`. **Phase 09a**
shipped the chassis + password sign-in; **09b** added 2FA (sign-in verification
+ TOTP enrollment), password reset, and recovery codes; **09c** (this commit)
adds OAuth/OIDC sign-in, email + federated sign-up, and workspace
invitations/select onto the schema already created here.

## Endpoints (09a + 09b + 09c)

| Route | Result |
|---|---|
| `POST /sign-in/email` | `{status:'ok', tokens}` (`amr:['pwd']`) · `{status:'two_factor_required', challenge, user}` · `{status:'invalid_credentials'}` (401) |
| `POST /sign-in/2fa` | `{status:'ok', tokens}` (`amr:['pwd','otp']`) · `{status:'invalid_code'}` (200) — verifies a TOTP **or** a single-use recovery code against the step-1 challenge |
| `GET /sign-in/oauth/:provider` | `302` → provider authorization endpoint (state/nonce/PKCE stashed) · `501` for an unconfigured provider (github) |
| `GET /sign-in/oauth/:provider/callback` | `{status:'ok', tokens}` (linked, `amr:['oauth:google']`) · `{status:'needs_profile', provider, suggested}` (new — sets `ot_pending_fed` cookie) · `{status:'denied'}` · `400` on a failed CSRF/`state` check |
| `POST /sign-up/email` | `{status:'ok', user, tokens}` (`amr:['pwd']`) · `{status:'email_taken'}` (200) |
| `POST /sign-up/oauth/:provider/complete` | `{status:'ok', user, tokens}` (`amr:['oauth:google']`) · `{status:'email_taken'}` — provisions from the cookie-carried verified identity + chosen handle |
| `GET /workspaces/invitations` | `WorkspaceInvitation[]` — **bearer-authed**; open invites for the token's email, display fields derived |
| `POST /workspaces/select` | `{status:'ok', tokens}` (final token, `wsp`/`wspRole`/`inv` stamped) · `{status:'invalid_invitation'}` — **bearer-authed** |
| `POST /token/refresh` | `{status:'ok', tokens}` — rotates access via the `sid`-bound refresh token · 401 on unknown/rotated |
| `POST /introspect` | `{active:true, ...claims}` · `{active:false}` — the framework `auth.introspectUrl` seam |
| `POST /reset/request` | `{status:'sent', channel, maskedEmail}` — **always** (no enumeration); mints an account-bound code + stub-mails it |
| `POST /reset/confirm` | `{status:'ok', tokens}` · `{status:'expired'}` · `{status:'invalid_code'}` (200) — account-bound code, sets password + revokes sessions |
| `POST /2fa/totp/start` | `{secret, otpauthUri}` — **bearer-authed**; stores a pending secret |
| `POST /2fa/totp/verify` | `{status:'ok', recoveryCodes}` (8, shown once) · `{status:'invalid_code'}` — **bearer-authed**; confirms the secret |
| `POST /2fa/passkey/start`·`/finish` | `501` — deferred (D5) |
| `GET /health` | chassis builtin |

Tokens: 15-min HS256 access JWT + 30-day opaque refresh bound to a `sid`
(Redis). Claims match `AccessTokenClaims` (`sub/email/name/amr/wsp?/wspRole?/inv?/iat/exp`).

**09d notes (deploy prep + hardening, backend):** the access token now carries a
`kid` header (`hs-1`) and a `jti` claim — rotation-ready + a denylist hook, no
behavior change (the RS256/JWKS graduation swaps the key set and selects by
`kid`; see `auth-architecture-direction` in session memory). The framework
introspect seam is now real: `@open-tomato/express`'s `buildRequireAuth` /
`buildOptionalAuth` are a pluggable `SessionVerifier` port with an HTTP
`/introspect` adapter (introspect-now, JWKS-swap-later), fail-closed, exported
for consumers. `service.config.yaml` is written (provisional pending WS12
grow-box onboarding). **Remaining (next session):** the auth-app HTTP wiring to
this live service (`httpAuthApi` over `VITE_AUTH_API_URL`; OAuth browser-redirect
+ webapp hand-off) — split out because it pairs with the workspace-service
decomposition (`wspRole` leaves the identity token). `wspRole`-in-token is
**PoC-only**; don't build on it permanently.

**09c design notes:** OAuth is provider-agnostic OIDC (authorization-code +
PKCE + `state`/`nonce`), Google the only configured provider (others → `501`);
every endpoint is env-overridable so tests point the token/JWKS at a mock and
real Google is just credentials. The `code`+PKCE exchange is server-to-server —
the browser never sees `code` or the client secret; the id_token is verified
against the provider JWKS with `iss`/`aud`/`nonce` enforced. Because
`/sign-up/oauth/:provider/complete` carries only the chosen handle, the
OIDC-verified `sub`/email is bridged from the callback in a short-lived, signed,
httpOnly `ot_pending_fed` cookie (typ-pinned so it can't be confused with an
access token) — `complete` trusts identity only from that cookie. The callback
returns the JSON result union; wiring the browser redirect back to the webapp is
**09d**. Workspace UI fields (`description`/`members`/`tone`) are derived from
real data (membership counts, inviter name), so no migration was needed.

**09b design notes:** recovery codes are deliberately redeemable at
`/sign-in/2fa` in place of a TOTP (routed by code shape) — otherwise the codes
minted at enrollment would be unusable; the wire shape (`{challengeId, code}`)
is unchanged. TOTP uses otplib defaults (SHA-1/6-digit/30s, Google-Authenticator
compatible) with a ±1-step drift window. Reset codes live **hashed** in Redis
(15-min window + grace so a matched-but-late code reads `expired`, not
`invalid`). Recovery codes are `XXXX-XXXX` (2^40 entropy) hashed with argon2id.

## Run locally

```bash
bun run db:start      # postgres :5435 + redis :6380 (docker compose)
bun run db:migrate    # apply drizzle migration
bun run db:seed       # dev fixtures (guarded to local DB; password: tomato-dev-password)
bun dev               # start on :4500
```

Env (inline `process.env`, D-CFG): `PORT`, `DATABASE_URL`, `REDIS_URL`,
`AUTH_JWT_SECRET` (**required outside dev/test**, ≥32 bytes), `MAIL_URL`
(unset → console stub mailer for reset codes), `AUTH_PUBLIC_URL` (this service's
public origin, used to derive OAuth callback URLs), and OAuth provider creds
`OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET` (unset → OAuth returns
`501`; endpoints default to Google's and are individually overridable via
`OAUTH_GOOGLE_{AUTH,TOKEN}_URL` / `OAUTH_GOOGLE_{ISSUER,JWKS_URI}` for tests).

## Security posture

**Enforced here:** HS256 with the algorithm pinned on verify; the JWT secret
**fails closed** (a real ≥32-byte secret is required unless `NODE_ENV` is
`development`/`test`); argon2id at OWASP params (m=19456,t=2,p=1); **constant-time
sign-in** (a decoy hash equalizes the unknown-email vs wrong-password paths — no
enumeration by body or timing); replay-safe refresh rotation; introspect never
leaks claims for an invalid token; zod at every boundary; the chassis applies a
global per-IP rate limit (100 req/60s) + helmet.

**09b additions:** reset codes are **account-bound** (per-user Redis key, hashed,
single-use) with **no default-user fallback** — a code for one account can never
authenticate another (the WS08 account-takeover fix); reset/request always
returns `sent` and runs a **decoy argon2 hash** on the unknown-email branch so
neither body nor timing leaks existence; sign-in 2FA trusts only the
server-side, single-use challenge for identity (never a client `sub`); recovery
codes are single-use + argon2id-hashed; TOTP enrollment is bearer-authed and a
secret is confirmed before it can gate sign-in; a completed reset revokes all
existing sessions; business outcomes (`invalid_code`/`expired`) are 200s so HTTP
status carries no oracle.

**09c security review (2026-07-24):** one CRITICAL, fixed before ship — a
token-confusion bypass: the `ot_pending_fed` cookie was signed with the same
secret + `iss` as access tokens and `verifyAccessToken` didn't pin `typ`, so it
verified as a bearer into `/workspaces/*` and `/introspect`. Closed three ways —
`verifyAccessToken` now pins `typ:'JWT'` + validates claim shape, and the
federation signer uses a domain-separated derived key (regression-tested). Also
fixed: unverified OIDC emails are now rejected (`email_verified===true` gate, no
invite/account takeover); sign-up and reset enforce an 8-char minimum password.
Deferred: durable invitation acceptance / `workspace_memberships` writes (select
stamps a *pending* `inv` by contract), a `handle` column, and downstream
sanitization of the IdP `name` claim.

**09b security review (2026-07-24):** no CRITICAL. Fixed before ship — the HIGH
`/reset/confirm` timing oracle (decoy argon2 on the unknown-email / no-code
branches) and two MEDIUM single-use TOCTOU races (recovery codes now claimed via
`used_at IS NULL` compare-and-set; sign-in 2FA challenge gated on the atomic
`DEL` count). The remainder are deferred below.

**Deferred hardening (tracked, not blocking 09b — see OPT-259):**
- Per-email/per-IP throttle + attempt budgets on `/sign-in/email`, `/sign-in/2fa`,
  `/reset/confirm`, `/2fa/totp/verify`, `/sign-up/email`, `/workspaces/select`
  (redis rate counters).
- Durable invitation acceptance: write `accepted_at` + a `workspace_memberships`
  row on a formal accept step (select currently stamps a pending `inv` only).
- A `handle` column (the chosen username is echoed but not persisted).
- TOTP anti-replay: track `(userId, lastAcceptedTimestep)` so a captured code
  can't authenticate a second flow inside its window (review MEDIUM #4).
- Step-up re-auth (recent password) before TOTP enrollment, so a stolen access
  token can't silently plant a second factor (review LOW #7).
- Encrypt TOTP seeds at rest (envelope/KMS) — currently plaintext `text()` since
  the seed must stay verifiable (review LOW #6).
- Password-strength policy on `/reset/confirm` (currently non-empty only),
  aligned with the future sign-up route (review MEDIUM #5).
- Atomic refresh rotation (Lua/`WATCH`) + refresh-reuse detection → revoke session.
- Authenticate `/introspect` callers (shared credential / mTLS / network policy).
- `aud` claim + RS256/JWKS graduation path (currently shared-secret HS256).

## Testing

Persistence sits behind `src/store/*` + `src/auth/*`, which the tests `vi.mock`
— no live Postgres/Redis needed. Route tests drive `supertest` against the real
token issuer and real TOTP/recovery crypto; store tests exercise the reset-code
discriminant, challenge single-use, and session revoke against an in-memory
Redis fake. 72 tests. `bunx turbo run build check-types test lint --filter=@open-tomato/auth`.
