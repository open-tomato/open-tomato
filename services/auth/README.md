# services/auth — `@open-tomato/auth`

The Open Tomato authentication gateway backend, on the `@open-tomato/express`
service chassis (port **4500**). Implements `auth-app/docs/auth-api-contract.md`
so the auth app can run against a live service instead of its in-app mock.

Built per the plan at `docs/plans/poc-release/09-auth-backend.md`. **Phase 09a**
(this commit) ships the chassis + password sign-in; 09b/09c add 2FA, reset,
OAuth, and workspace handlers onto the schema already created here.

## Endpoints (09a)

| Route | Result |
|---|---|
| `POST /sign-in/email` | `{status:'ok', tokens}` (`amr:['pwd']`) · `{status:'two_factor_required', challenge, user}` · `{status:'invalid_credentials'}` (401) |
| `POST /token/refresh` | `{status:'ok', tokens}` — rotates access via the `sid`-bound refresh token · 401 on unknown/rotated |
| `POST /introspect` | `{active:true, ...claims}` · `{active:false}` — the framework `auth.introspectUrl` seam |
| `GET /health` | chassis builtin |

Tokens: 15-min HS256 access JWT + 30-day opaque refresh bound to a `sid`
(Redis). Claims match `AccessTokenClaims` (`sub/email/name/amr/wsp?/wspRole?/inv?/iat/exp`).

## Run locally

```bash
bun run db:start      # postgres :5435 + redis :6380 (docker compose)
bun run db:migrate    # apply drizzle migration
bun run db:seed       # dev fixtures (guarded to local DB; password: tomato-dev-password)
bun dev               # start on :4500
```

Env (inline `process.env`, D-CFG): `PORT`, `DATABASE_URL`, `REDIS_URL`,
`AUTH_JWT_SECRET` (**required outside dev/test**, ≥32 bytes).

## Security posture

**Enforced here:** HS256 with the algorithm pinned on verify; the JWT secret
**fails closed** (a real ≥32-byte secret is required unless `NODE_ENV` is
`development`/`test`); argon2id at OWASP params (m=19456,t=2,p=1); **constant-time
sign-in** (a decoy hash equalizes the unknown-email vs wrong-password paths — no
enumeration by body or timing); replay-safe refresh rotation; introspect never
leaks claims for an invalid token; zod at every boundary; the chassis applies a
global per-IP rate limit (100 req/60s) + helmet.

**Deferred hardening (tracked, not blocking 09a — see OPT-259):**
- Tighter per-email/per-IP throttle on `/sign-in/email` (redis rate counters, 09b).
- Atomic refresh rotation (Lua/`WATCH`) + refresh-reuse detection → revoke session.
- Authenticate `/introspect` callers (shared credential / mTLS / network policy).
- `aud` claim + RS256/JWKS graduation path (currently shared-secret HS256).

## Testing

Persistence sits behind `src/store/*` + `src/auth/password`, which the tests
`vi.mock` — no live Postgres/Redis needed. Route tests drive `supertest` against
the real token issuer; token-core tests round-trip mint→verify and rotation.
`bunx turbo run build check-types test lint --filter=@open-tomato/auth`.
