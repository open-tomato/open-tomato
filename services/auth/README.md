# services/auth — `@open-tomato/auth`

The Open Tomato authentication gateway backend, on the `@open-tomato/express`
service chassis (port **4500**). Implements `auth-app/docs/auth-api-contract.md`
so the auth app can run against a live service instead of its in-app mock.

Built per the plan at `docs/plans/poc-release/09-auth-backend.md`. **Phase 09a**
shipped the chassis + password sign-in; **09b** (this commit) adds 2FA (sign-in
verification + TOTP enrollment), password reset, and recovery codes. 09c adds
OAuth + workspace handlers onto the schema already created here.

## Endpoints (09a + 09b)

| Route | Result |
|---|---|
| `POST /sign-in/email` | `{status:'ok', tokens}` (`amr:['pwd']`) · `{status:'two_factor_required', challenge, user}` · `{status:'invalid_credentials'}` (401) |
| `POST /sign-in/2fa` | `{status:'ok', tokens}` (`amr:['pwd','otp']`) · `{status:'invalid_code'}` (200) — verifies a TOTP **or** a single-use recovery code against the step-1 challenge |
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
(unset → console stub mailer for reset codes).

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

**09b security review (2026-07-24):** no CRITICAL. Fixed before ship — the HIGH
`/reset/confirm` timing oracle (decoy argon2 on the unknown-email / no-code
branches) and two MEDIUM single-use TOCTOU races (recovery codes now claimed via
`used_at IS NULL` compare-and-set; sign-in 2FA challenge gated on the atomic
`DEL` count). The remainder are deferred below.

**Deferred hardening (tracked, not blocking 09b — see OPT-259):**
- Per-email/per-IP throttle + attempt budgets on `/sign-in/email`, `/sign-in/2fa`,
  `/reset/confirm`, `/2fa/totp/verify` (redis rate counters).
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
