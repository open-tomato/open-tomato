---
repo: open-tomato (services/auth)
tier: detailed (planned 2026-07-24 from auth-api-contract.md + backend survey)
depends-on: [08 (auth-api-contract.md)]
parallel-with: [12-partial]
size: L
status: IN PROGRESS — 09a–09d backend shipped (password + 2FA/reset + OAuth/sign-up/workspace + deploy-prep/introspect-seam, security-reviewed); auth-app HTTP wiring + workspace-service decomposition are the next session (2026-07-24)
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

- **09a — chassis + password sign-in:** ✅ **DONE (2026-07-24).** `services/auth` (`@open-tomato/auth`,
  :4500) on the express chassis; all 7 tables + migration + guarded seed; ioredis session dep;
  jose HS256 + `@node-rs/argon2` token core; `POST /sign-in/email` (password path), `/token/refresh`
  (sid rotation), `/introspect`, `errorHandler`, `/health`. 25 tests (store-mocked, supertest), gate
  green. Security-reviewed — fixed timing-enumeration + fail-open secret; hardening deferred to
  OPT-259. Note: the plan's `@open-tomato/cache`=ioredis assumption was wrong (it's TanStack Query);
  redis is `ioredis` behind a mockable store. Run steps + posture in `services/auth/README.md`.
- **09b — 2FA + reset:** ✅ **DONE (2026-07-24).** TOTP enroll (`/2fa/totp/start`+`/verify`, otplib,
  bearer-authed) with 8 argon2-hashed single-use recovery codes; sign-in 2FA (`/sign-in/2fa`) verifying
  a TOTP **or** a recovery code against the single-use step-1 challenge (`amr:['pwd','otp']`); reset
  request/confirm (`/reset/*`) with account-bound hashed Redis codes (15-min + grace → `ok`/`expired`/
  `invalid_code`), decoy-hash timing equalization, session revocation on reset, and a stub console
  mailer (`MAIL_URL` unset). Local bearer `requireAuth` (the chassis seam is still a passthrough stub);
  passkey `/2fa/passkey/*` → `501` (D5). +49 tests (74 total), gate green. Security-reviewed — no
  CRITICAL; fixed the HIGH `/reset/confirm` timing oracle (decoy argon2 on unknown-email/no-code
  branches) + two MEDIUM single-use TOCTOU races (recovery `used_at IS NULL` CAS; challenge atomic-`DEL`
  gate). Deferred to OPT-259: TOTP anti-replay, enroll step-up re-auth, TOTP-seed-at-rest encryption,
  reset password-strength policy, per-endpoint attempt budgets. Notes: recovery codes redeemable at
  `/sign-in/2fa` (unchanged wire shape) so enrollment codes are usable.
- **09c — OAuth + workspace:** ✅ **DONE (2026-07-24).** Provider-agnostic OIDC (authorization-code +
  PKCE + `state`/`nonce`), Google the only configured provider (others → `501`), every endpoint
  env-overridable so tests hit a mock token/JWKS and real Google is just credentials: `GET
  /sign-in/oauth/:provider` (initiate → 302) + `/callback` (state single-use CSRF + nonce + server-side
  code exchange + id_token JWKS/iss/aud verify → `ok`|`needs_profile`|`denied`). `POST /sign-up/email`
  (→ `ok`|`email_taken`) and `/sign-up/oauth/:provider/complete` (provisions from a signed httpOnly
  `ot_pending_fed` cookie carrying the OIDC-verified identity — the contract body has no identity, so
  it's bridged server-side, never trusted from the client). `GET /workspaces/invitations` +
  `POST /workspaces/select` (bearer-authed; invite validated + bound to the caller's email; final token
  stamps `wsp`/`wspRole`/`inv`; self-serve → `ws_default`/`owner`). +35 tests (109 total), gate green.
  Decisions: OAuth strategy = provider-agnostic OIDC / Google-default / mock-testable (user, 2026-07-24);
  callback returns JSON (browser redirect-to-webapp hand-off is 09d); workspace UI fields
  (`description`/`members`/`tone`) derived from real data (no migration). Security-reviewed — fixed a
  CRITICAL token-confusion bypass (pending-fed cookie verified as an access token: `verifyAccessToken`
  now pins `typ` + validates claim shape, federation uses a domain-separated key, regression-tested) and
  two HIGHs (reject unverified OIDC emails; 8-char min password on sign-up/reset). Deferred to OPT-259:
  durable invite acceptance / membership writes, per-endpoint throttling, a `handle` column.
- **09d — deploy prep + hardening (backend):** ✅ **DONE (2026-07-24).** `kid` + `jti` stamped in the
  access token (`issuer.ts`) — rotation-ready header + denylist hook, no behavior change. Implemented the
  `@open-tomato/express` **introspect seam** (`buildRequireAuth`/`buildOptionalAuth`) as a pluggable
  `SessionVerifier` port with an HTTP `/introspect` adapter (introspect-now, RS256/JWKS-swap-later — see
  the auth-architecture direction), fail-closed, exported + tested (7 tests). `service.config.yaml` written
  (provisional; WS12 confirms the grow-box schema); the 09a Dockerfile stands (build-verification is WS12's
  job). Contract coverage: the 114 per-flow route tests already assert every documented result union, so
  they serve as the contract tests. Auth 114 + express 127 tests, gate green.
  **Deferred to the next session** (see the kickoff): the auth-app HTTP wiring (`httpAuthApi` over
  `VITE_AUTH_API_URL` + env switch; OAuth browser-redirect + callback landing + webapp session hand-off) —
  split out deliberately because it's a frontend routing/UX rework that pairs with the
  **workspace-service decomposition** (pulling `wspRole`/authz out of the identity token, per the
  architecture direction), the stakeholder's stated next-session goal. `wspRole`-in-token stays **PoC-only**
  for now (documented) so nothing builds on it permanently.

## Auth architecture direction (decided 2026-07-24, architect-reviewed)

Recorded so the next session inherits it. **Centralized token issuance + decentralized STATELESS
validation** (auth is sole issuer + owner of the refresh/session store; other services verify offline). The
forgery-blast-radius concern is solved by graduating HS256-shared-secret → **RS256/JWKS** (services hold
only the public key, cannot mint) — collapsing N signing-compromise points to one; rotate that one key via
`kid` + JWKS overlap (O(1) selection, pull-based propagation, never peer gossip), keeping key-rotation and
session-lifetime as independent clocks. **Never distribute `AUTH_JWT_SECRET` to services.** The monolith is
really three bounded contexts — **Auth** (identity + authenticators), **User/Profile** (PII/GDPR,
by-ID-only), **Workspace** (memberships/invitations + config) — to split at the target; keep authorization
(`wspRole`) OUT of the identity token so that split stays clean. Keep the monolith for the PoC; the cheap
forward-compat hooks (`kid`, `jti`, key-resolver-shaped verifier) are already in. Full analysis in the
`auth-architecture-direction` session memory.

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
