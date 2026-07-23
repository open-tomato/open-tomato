---
repo: open-tomato (services/auth)
tier: detailed (planned 2026-07-24 from auth-api-contract.md + backend survey)
depends-on: [08 (auth-api-contract.md)]
parallel-with: [12-partial]
size: L
status: PLANNED + decisions resolved (2026-07-24); build held for explicit go
linear: OPT-248
---

# WS09 — Auth backend

**Goal:** implement `auth-app/docs/auth-api-contract.md` as a real `services/auth`
on the existing service framework, so the auth app runs against a live gateway
instead of its in-app mock. **Frontend-first paid off**: the contract is the
spec, derived from exactly what the screens need.

## Confirmed cut-lines (user, 2026-07-24)

1. **Stub email transport** — reset/verify codes go to a console/stub mailer
   (factory-patterned after `orchestrator/src/notifications/client.ts` so it can
   later point at a real mailer). *Not* through the notifications service — its
   `mail` path is SSE fan-out, a poor fit for transactional email.
2. **Passkey/WebAuthn backend deferred (D5)** — passkey ships UI-only; the
   `2fa/passkey/*` endpoints stay mocked/`501`-shaped. Everything else real.
3. **Single OAuth provider** end-to-end; the other stubbed.
4. **Real minimal persistence** — Postgres + Drizzle (the repo convention), not
   an in-memory store. Minimal schema, real migrations.

## Grounding — what the survey established (see the backend map)

- **Chassis:** `createService({ serviceId, port, dependencies, register(app, ctx) })`
  from `@open-tomato/express` (+ `createDependency` from `service-core`). Copy
  `services/notifications` as the scaffold (NOT `scheduler` — it's missing
  scripts).
- **DB:** copy `services/notifications/src/db/index.ts` verbatim
  (`createDbDependency` → pg `Pool` + `drizzle`), `src/db/schema.ts` with
  `drizzle-orm/pg-core`, `drizzle.config.ts` + `db:generate`/`db:migrate` scripts,
  own Postgres DB/port (next free, e.g. :5435), soft UUID refs, no cross-service FKs.
- **Crypto gap (important):** nothing installed — no jwt/hash/totp anywhere, and
  `express/src/auth.ts` `requireAuth`/`optionalAuth` are passthrough stubs. This
  service **adds** the crypto libs and **owns** all token/session/hash/TOTP logic.
- **The introspection seam:** `express/src/auth.ts` is built to call an
  `auth.introspectUrl`. `services/auth` should implement that endpoint — it's the
  framework's cross-service session-validation seam, currently unimplemented.
- **Errors:** `createService`'s built-in error handler is minimal; mount
  `errorHandler` from `@open-tomato/errors` inside `register()` and throw its
  typed errors for the `{ error, fields }` shape.
- **Config:** no service uses `@open-tomato/config` yet — convention is inline
  `process.env` at the top of `index.ts`. See decision D-CFG.
- **`service.config.yaml`:** the grow-box onboarding format lives in the external
  grow-box repo; no in-repo example. Treat as WS12 coordination, not WS09 blocker.

## Architecture

`services/auth` (`@open-tomato/auth`, private, port 4500) on the express chassis:

- **Dependencies:** `dbDep` (Postgres/Drizzle) + `redisDep` (via `@open-tomato/cache`'s
  ioredis) for short-lived state: refresh-token/session store (bound to `sid`),
  2FA sign-in challenges, reset codes, and per-account/per-IP rate counters.
- **Crypto libs to add:** `jose` (JWT access token), `argon2` (password hashing),
  `otplib` (TOTP + QR `otpauth://` URI). All new deps.
- **Token model** (per contract): 15-min access JWT + 30-day opaque refresh bound
  to a `sid`. Claims `sub/email/name/amr/wsp/wspRole/inv/iat/exp`. Workspace +
  invitation stamped at the token level only after `workspace.select` validates.
- **Email:** `MailTransport` interface + `StubMailTransport` (console) chosen by a
  factory (env `MAIL_URL` unset → stub), mirroring the notifications-client pattern.

## Endpoint → handler map (all from the contract)

| Contract endpoint | Handler | Notes / cut-line |
|---|---|---|
| `POST /sign-in/email` | password verify (argon2) → `ok` \| `two_factor_required` (+ challenge in redis) \| `invalid_credentials` (401) | no enumeration |
| `POST /sign-in/2fa` | resolve challenge (redis, bound to step-1 user, single-use, TTL) → TOTP verify → tokens `amr:[pwd,otp]` | never trust client `sub` |
| `GET /sign-in/oauth/:provider` | OAuth/OIDC initiate (state+nonce+PKCE in redis) | single provider (D-OAUTH); other → `501` |
| `GET /sign-in/oauth/:provider/callback` | validate state/nonce, server-side code+PKCE exchange, resolve/provision identity → `ok` \| `needs_profile` \| `denied` | secret never reaches client |
| `POST /sign-up/email` | create user (argon2) → `ok` \| `email_taken` | |
| `POST /sign-up/oauth/:provider/complete` | create federated account → `ok` \| `email_taken` | |
| `POST /reset/request` | mint account-bound code (redis, 15-min), stub-mail it → always `sent` | no enumeration |
| `POST /reset/confirm` | validate `(account, code)` binding → set password (argon2), revoke sessions → `ok` \| `expired` \| `invalid_code` | **no default-user fallback** (the WS08 sec fix) |
| `POST /2fa/totp/start` / `verify` | otplib secret + QR; verify → recovery codes | |
| `POST /2fa/passkey/start` / `finish` | **deferred (D5)** → `501`/mock | |
| `GET /workspaces/invitations` | list open invites for user | seed data (D-WSP) |
| `POST /workspaces/select` | validate invitation → mint final token with `wsp/wspRole/inv` | self-serve → `ws_default/owner` |
| `POST /token/refresh` | rotate access via refresh `sid` (redis) | contract implies; add explicitly |
| `POST /introspect` | validate access token → claims (the framework `introspectUrl` seam) | closes the chassis auth loop |
| `GET /health` | chassis builtin | |

## DB schema (Drizzle pg — minimal)

`users` (id, email unique, name, created_at), `credentials` (user_id, password_hash,
algo), `oauth_accounts` (user_id, provider, provider_uid, unique(provider,uid)),
`totp_secrets` (user_id, secret, confirmed_at), `recovery_codes` (user_id, code_hash,
used_at), `workspace_memberships` (user_id, workspace_id, role), `invitations`
(id, workspace_id, workspace_name, email, role, invited_by, expires_at, accepted_at).
Short-lived state (reset codes, 2FA challenges, refresh sessions, rate counters)
lives in **redis** with TTLs, not Postgres.

## Implementation phasing (≈ per session)

- **09a — chassis + password sign-in:** scaffold `services/auth` (copy notifications),
  db/index + schema + migrations, redis dep, jose/argon2 token core, `POST /sign-in/email`
  (password-only path), `/token/refresh`, `/introspect`, `errorHandler`, `/health`. Gate + supertest.
- **09b — 2FA + reset:** TOTP enroll/verify (otplib), sign-in 2FA challenge, reset request/confirm
  (account-bound codes, stub mail), recovery codes.
- **09c — OAuth + workspace:** single-provider OAuth/OIDC initiate+callback (state/nonce/PKCE),
  sign-up (email + OAuth complete), workspace invitations + select (token-level claim stamping).
- **09d — deploy prep + hardening:** `service.config.yaml` (WS12 coordination), Dockerfile,
  contract tests vs `auth-api-contract.md`, wire the auth app's `VITE_AUTH_API_URL` to the
  running service for an end-to-end walk; re-point `express` `introspectUrl` consumers.

## Resolved decisions (user, 2026-07-24)

- **D-OAUTH → Google** end-to-end; GitHub stubbed (`501`). (The `oauth:github`
  `amr` and provider glyph stay defined for the deferred provider.)
- **D-JWT → HS256 + shared secret.** Other services validate via this service's
  `POST /introspect`. RS256 + JWKS recorded as the graduation path.
- **D-CFG → inline `process.env`** at the top of `index.ts` (every existing
  service's convention). Adopting `@open-tomato/config` is a separate follow-up,
  not WS09.
- **D-WSP → seed fixtures** — invitations + memberships seeded to match the
  webapp's mock workspaces; enough to validate invites and stamp `wsp/wspRole/inv`.
  The workspace screen can move to the webapp later without changing the claim shape.

## Verification

Vitest + supertest with `NODE_ENV=test` (ephemeral port, no `process.exit`), one
suite per flow mirroring the auth-app's flow tests; **contract tests** asserting
each endpoint's result union matches `auth-api-contract.md`; turbo gate green
(`build check-types test lint --filter=@open-tomato/auth`); the auth app pointed
at the live service passes its flows against real tokens.

## Risks / friction

- **No crypto reference** in-repo — token/hash/TOTP written fresh (mitigated by
  battle-tested libs: jose/argon2/otplib).
- **`service.config.yaml` format is external** (grow-box repo) — WS09d writes a
  best-effort file; final shape confirmed during WS12 onboarding.
- **First real DB service onboarded to grow-box** is WS12's job; WS09 just ships a
  gate-green, Dockerfile-buildable service.
- Re-enabling/confirming orchestrator tests (OPT-239) is out of scope here.
