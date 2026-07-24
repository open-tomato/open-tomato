# WS09e — auth-app HTTP wiring + workspace authz extraction

**Date:** 2026-07-24
**Depends on:** WS09a–09d (backend shipped + merged, PRs #1–#3)
**Linear:** OPT-248 (WS09 auth)
**Status:** Design approved (user, 2026-07-24) — ready for implementation planning

## Goal

Two coupled goals, planned together because the frontend contract changes when the
token shape changes:

1. **Auth-app HTTP wiring** — a real `httpAuthApi` (and `httpWorkspaceApi`) over
   `VITE_AUTH_API_URL`, with an env switch (URL set → live service, unset → the
   existing in-app mock). Rework the OAuth fork from a promise into a real browser
   redirect (`GET /sign-in/oauth/:provider` → provider → callback → webapp session
   hand-off).
2. **Workspace authz extraction** — pull `wspRole`/`inv` (authorization) OUT of the
   identity token per the architecture direction, and carve Workspace
   (memberships/invitations) into a clean **internal module + port** inside
   `services/auth` (not a new deploy unit this session), so a later lift-out into a
   standalone workspace service is cheap.

## Non-goals / explicit cut-lines

- **No backward compatibility.** The service is not in production; nothing is
  deployed or persisted for real users. No token-version negotiation, no dual-read
  of old claim shapes, no data backfill/migration-preservation. The `introspect`
  response, token claims, DB seed, and contract doc are rewritten to the new shape
  — not versioned. Schema/seed may be dropped & recreated freely.
- **No new workspace service** (port/DB/deploy) this session — internal seam only
  (user decision, 2026-07-24: "seam, not a new service").
- **No second (workspace) token** — rejected as over-engineered for the PoC; the
  context endpoint can graduate into a scoped workspace token later without
  touching the identity token.
- Deferred hardening (OPT-259) stays deferred: durable invite acceptance /
  membership writes are present only as a **stubbed seam**, not fully wired.

## Decisions

### D1 — Token shape: keep `wsp`, drop `wspRole` + `inv`

The identity access token keeps **`wsp`** (the active-workspace id) as a
*scope pointer* — offline-checkable ("this token is scoped to workspace X"), which
is genuinely stateless and does not couple identity validation to workspace data.
It drops **`wspRole`** (authorization) and **`inv`** (mutable invite-acceptance
state) — neither belongs in a signed, 15-min-immutable identity token.

- `POST /workspaces/select` still returns `{ status:'ok', tokens }`, but re-mints
  the identity token stamping **`wsp` only**. Selection still re-mints because
  before select there is no `wsp`.
- Authorization is resolved from the Workspace authority on demand (D2). Pulling
  authz out of the token *necessarily* means authz is fetched from the authz
  owner; the stateless-offline guarantee is about **identity**, not authz. Only
  workspace-touching services pay the (cacheable) round-trip.

### D2 — Workspace context endpoint + port

New in-process module inside `services/auth`:

- **`WorkspaceContext` port**: `resolveContext(sub, workspaceId) →
  { wspRole, membership, pendingInvite }`, backed by `store/invitations.ts` + a
  memberships read. The router and endpoint depend on the **port**, not concrete
  stores — later lift-out swaps the in-process call for an HTTP client with no
  consumer change.
- **`GET /workspaces/:id/me`** implements the port. `pendingInvite` replaces the
  old `inv` claim (select does not auto-accept for the PoC). A stubbed
  membership-write hook marks where durable invite-acceptance (OPT-259) will land.

### D3 — Frontend: split `workspaceApi` off `AuthApi`

Mirror the backend module split so the live client can point workspace calls at a
separate base URL later:

- `authApi` — identity only: `signIn`, `signUp`, `reset`, `twoFactor`.
- `workspaceApi` — `listInvitations`, `select`, new `getContext(workspaceId)`.
- `workspace.select` still returns `{ status:'ok', tokens }`; `tokens.claims` now
  carries `wsp` only (no `wspRole`/`inv`). `flows/workspace.ts` and
  `WorkspaceFlow.tsx` keep their shape (still persist tokens, still redirect).
- What auth-app hands the webapp after select: the identity token carrying `wsp`
  (existing `persistSession`/`completeSignIn`). When the webapp later needs role,
  it calls `workspaceApi.getContext`. Blast radius on the webapp is ~zero — `app/`
  routes workspaces by URL segment off fixtures and does not read the session yet
  (verified).

### D4 — httpAuthApi / httpWorkspaceApi + env switch

- Real fetch-based implementations returning the **same discriminated unions** as
  the mock. Business `status` outcomes (`invalid_credentials`, `email_taken`,
  `expired`, `invalid_invitation`, …) are data returned from the union; only
  transport failures (network / 5xx) throw.
- Env switch: `VITE_AUTH_API_URL` set → live, unset → existing in-app mock. A
  single factory selects the implementation; every screen keeps importing the same
  surface.
- `VITE_WORKSPACE_API_URL` seam: resolves to the auth origin in the PoC, but
  workspace calls route through it so they can point elsewhere later.

### D5 — OAuth redirect rework

- `signIn.withOAuth` stops being a promise and becomes a **full-page redirect** to
  `${AUTH_API}/sign-in/oauth/:provider` (optionally carrying the webapp
  `?redirect=` target, origin-validated as today).
- The backend callback (today returns JSON) **302s back to an auth-app landing
  route** carrying only a `status`:
  - `ok` → token hand-off is **server-side** (short-lived httpOnly one-time
    handoff → exchange endpoint); **never tokens in the URL**. The landing route
    then `persistSession` + `completeSignIn` to the webapp.
  - `needs_profile` → `/signup/oauth/:provider` (pending-fed cookie already set by
    the callback).
  - `denied` → `/login` with an error surface.
- The exact one-time-handoff mechanism (cookie + exchange endpoint vs. one-time
  code) is pinned in the Phase D plan; the invariant "no tokens in the URL,
  server-side hand-off" is fixed here.

## Phases (each: branch → PR → local turbo gate → squash-merge on green)

CI is disabled — gate locally with `turbo run build check-types test lint
--filter=…`. Run **security-reviewer** before merging Phase A and Phase D.

### Phase A — Backend: token-shape change + workspace seam
Scope: `services/auth` only. `packages/service/express` is **not** edited (its
`SessionClaims` is an open index signature with zero `wspRole`/`inv` readers) —
just re-grep-verified before merge.
- RED first: update `workspace.test.ts`, `introspect-token.test.ts`,
  `token-core.test.ts` to the new shape.
- Remove `wspRole` + `inv` from `AccessTokenClaims`, `AccessTokenInput`,
  `SessionRecord`, `NewSessionInput`; strip from `issuer.ts`, `session-tokens.ts`
  (mint **and** refresh re-mint), `store/sessions.ts`
  (`createSession`/`getSessionByRefreshToken`). Keep `wsp`.
- `workspace.select` re-mints `wsp`-only.
- Add `WorkspaceContext` port + `GET /workspaces/:id/me` (`{ wspRole, membership,
  pendingInvite }`) with a stubbed membership-write hook.
- Update `services/auth/README.md`.
- Gate: `--filter=@open-tomato/auth` green. security-reviewer.

### Phase B — Frontend contract (still on mock)
Scope: `auth-app`.
- `types.ts`: drop `wspRole`/`inv`, keep `wsp?`.
- Split `workspaceApi` off `AuthApi`; add `getContext`. `select` returns
  `wsp`-only tokens.
- Update `auth-app/docs/auth-api-contract.md` + README.
- Gate: `--filter` auth-app green.

### Phase C — httpAuthApi + env switch (live wiring)
Scope: `auth-app`.
- Real `httpAuthApi` / `httpWorkspaceApi` (fetch) behind the env-switch factory
  (`VITE_AUTH_API_URL` / `VITE_WORKSPACE_API_URL`). Same unions; transport errors
  throw, status outcomes are data.
- Gate green.

### Phase D — OAuth redirect rework
Scope: `auth-app` + small `services/auth` addition (callback 302 + handoff).
- `withOAuth` → full-page redirect; backend callback 302s to an auth-app landing
  route; server-side one-time token hand-off; `needs_profile`/`denied` routing.
- Independent of token shape; merges after C (touches the http client).
- Gate green. security-reviewer.

## Risks / must-change-together (internal consistency — not back-compat)

1. `issuer.mintAccessToken` signs `{...input}` (passthrough) — removing `wspRole`
   from the `AccessTokenInput` **type** is the guard that makes TS flag every stale
   call site.
2. `refreshTokenSet` re-mints from `SessionRecord` — strip `wspRole`/`inv` from
   the record + `createSession` + the refresh re-mint in the same change, or a
   refreshed token silently regains role.
3. `SessionClaims` (`packages/service/express/src/auth.ts`) is an open index
   signature → no compile error at consumers on removal. Verified: **zero** readers
   of `wspRole`/`inv` repo-wide, so this is safe — but re-grep before merge.
4. Mock/live divergence — update the mock (`authApi.ts`), `types.ts`, and
   `auth-api-contract.md` together so tests don't assert the old shape.
5. `introspect` returns `{ active:true, ...claims }` (passthrough) — fields vanish
   automatically once `claims` loses them; no separate change needed there.

## Verification

Per phase: `turbo run build check-types test lint --filter=…` green.
security-reviewer on Phase A (token/authz surface) and Phase D (OAuth
redirect/hand-off). Where practical, point the auth-app at the live service and
confirm a flow end-to-end against real tokens.

## Load-bearing files

- Backend: `services/auth/src/tokens/{types,issuer,session-tokens}.ts`,
  `services/auth/src/store/{sessions,invitations}.ts`,
  `services/auth/src/routes/{workspace,introspect,token}.ts`,
  `packages/service/express/src/auth.ts`.
- Frontend: `auth-app/src/auth/types.ts`, `auth-app/src/auth/api/authApi.ts`,
  `auth-app/src/auth/flows/workspace.ts`, `auth-app/src/pages/WorkspaceFlow.tsx`,
  `auth-app/src/pages/SignInFlow.tsx`, `auth-app/src/auth/session.ts`,
  `auth-app/docs/auth-api-contract.md`.
</content>
</invoke>
