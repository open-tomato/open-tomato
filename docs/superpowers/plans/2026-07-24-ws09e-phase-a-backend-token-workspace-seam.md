# WS09e Phase A — Backend token-shape change + workspace seam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove workspace authorization (`wspRole`) and invite-acceptance state (`inv`) from the identity access token, keeping only the `wsp` scope pointer, and add a `WorkspaceContext` port + `GET /workspaces/:id/me` endpoint that resolves role/pending-invite on demand.

**Architecture:** The identity token becomes identity-only + a `wsp` scope pointer (offline-checkable). Authorization moves to an in-process `WorkspaceContext` module inside `services/auth` — a clean port other code depends on, so a later lift-out into a standalone workspace service is a client swap with no consumer change. Same process, same DB, no new deploy unit.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), Express, Drizzle (pg), `jose` (HS256 JWT), Redis (ioredis) via mocked stores, Vitest + supertest, bun + turbo.

## Global Constraints

- Runtime: bun; monorepo tasks via turbo. **Gate command:** `bunx turbo run build check-types test lint --filter=@open-tomato/auth` (must be green before the phase PR merges).
- ESM: every relative import uses a `.js` specifier (e.g. `'../tokens/types.js'`), even for `.ts` sources.
- No `console.log`. Zod at every request boundary. Immutable updates (no in-place mutation). Files < 800 lines.
- TDD: write the failing test first, run it RED, implement minimal, run GREEN, commit.
- **No backward compatibility** — the service is not in production. Break the token/introspect/DB-seed shape freely; do not add version negotiation or dual-read shims.
- Branch is already `ws09e-auth-http-wiring` (created for the spec). All Phase A commits land there; the phase merges as one squash PR after the gate is green and security-reviewer passes.
- `wsp` STAYS in the token and session (scope pointer). Only `wspRole` and `inv` are removed.

---

## File Structure

- `services/auth/src/tokens/types.ts` — **Modify.** Drop `wspRole`/`inv` from `AccessTokenClaims` and `SessionRecord`; keep `wsp`. Keep the `WorkspaceRole` export (used by stores/context).
- `services/auth/src/tokens/session-tokens.ts` — **Modify.** Stop passing `wspRole`/`inv` on mint (fresh) and refresh re-mint.
- `services/auth/src/store/sessions.ts` — **Modify.** Drop `wspRole`/`inv` from `NewSessionInput` and the `getSessionByRefreshToken` return; drop the now-unused `WorkspaceRole` import.
- `services/auth/src/routes/workspace.ts` — **Modify.** `select` mints `wsp`-only. Add `GET /:id/me` delegating to the context port. Drop the now-unused `WorkspaceRole` import.
- `services/auth/src/store/invitations.ts` — **Modify.** Add `getMembershipRole(db, userId, workspaceId)`.
- `services/auth/src/workspace/context.ts` — **Create.** The `WorkspaceContext` port + `createWorkspaceContext(db)`.
- `services/auth/src/workspace/__tests__/context.test.ts` — **Create.** Unit tests for the resolver.
- `services/auth/src/tokens/__tests__/token-core.test.ts` — **Modify.** The workspace-claims test asserts `wsp` only.
- `services/auth/src/routes/__tests__/workspace.test.ts` — **Modify.** `select` asserts `wsp`-only; add `GET /:id/me` tests; add `getMembershipRole` to the store mock.
- `services/auth/README.md` — **Modify.** Endpoint table + token-model note reflect the new shape.

---

## Task 1: Token & session layer drops `wspRole`/`inv` (keeps `wsp`)

**Files:**
- Modify: `services/auth/src/tokens/types.ts`
- Modify: `services/auth/src/tokens/session-tokens.ts`
- Modify: `services/auth/src/store/sessions.ts`
- Test: `services/auth/src/tokens/__tests__/token-core.test.ts:124-137`

**Interfaces:**
- Produces: `AccessTokenClaims` / `AccessTokenInput` / `SessionRecord` / `NewSessionInput` with fields `{ sub, email, name, amr, wsp?, iat?, exp? }` (no `wspRole`, no `inv`). Later tasks rely on `mintAccessToken`/`issueTokenSet` rejecting `wspRole`/`inv` at the type level.

- [ ] **Step 1: Rewrite the token-core workspace-claims test to `wsp`-only**

Replace the test at `services/auth/src/tokens/__tests__/token-core.test.ts:124-137` (`'preserves optional workspace claims'`) with:

```ts
  it('preserves the optional wsp scope claim and no longer carries role/inv', async () => {
    const issuer = createTokenIssuer(SECRET);
    const { token } = await issuer.mintAccessToken({
      ...baseClaims,
      amr: ['pwd'],
      wsp: 'ws_open_garden',
    });
    const verified = await issuer.verifyAccessToken(token);
    expect(verified?.wsp).toBe('ws_open_garden');
    // Authorization (role) + invite-acceptance state left the token in WS09e.
    expect((verified as Record<string, unknown>)['wspRole']).toBeUndefined();
    expect((verified as Record<string, unknown>)['inv']).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test — verify it FAILS**

Run: `bunx vitest run src/tokens/__tests__/token-core.test.ts -t "wsp scope claim"` (cwd `services/auth`)
Expected: FAIL — the test still compiles today (fields exist) but this is the RED anchor for the type change; if it passes, proceed (the type change in Step 3 is what makes the assertion meaningful). The real RED is the type-check in Step 6.

- [ ] **Step 3: Remove `wspRole`/`inv` from `AccessTokenClaims` and `SessionRecord`**

In `services/auth/src/tokens/types.ts`, replace the `AccessTokenClaims` interface body's `wsp`/`wspRole`/`inv` block with `wsp` only, and remove `wspRole`/`inv` from `SessionRecord`:

```ts
/** Claims carried inside the access token — identity + a workspace scope pointer. */
export interface AccessTokenClaims {
  /** Subject — the user id. */
  sub: string;
  email: string;
  name: string;
  /** How this session was authenticated. */
  amr: Amr[];
  /** Active workspace SCOPE pointer, once selected. Absent until workspace pick
   *  resolves. Authorization (role) is NOT in the token — resolve it on demand
   *  via `GET /workspaces/:id/me` (WS09e). */
  wsp?: string;
  /** Issued-at / expiry, seconds since epoch (JWT convention). */
  iat: number;
  exp: number;
}
```

```ts
/** A persisted sign-in session — the record a refresh token is bound to. */
export interface SessionRecord {
  sid: string;
  sub: string;
  email: string;
  name: string;
  amr: Amr[];
  /** Active workspace scope pointer, preserved across refresh. */
  wsp?: string;
}
```

Leave `export type WorkspaceRole = ...` and `AccessTokenInput` (the `Omit`) unchanged.

- [ ] **Step 4: Stop passing `wspRole`/`inv` in `session-tokens.ts`**

In `services/auth/src/tokens/session-tokens.ts`, edit the `createSession` call inside `issueTokenSet` and the `mintAccessToken` call inside `refreshTokenSet` to drop the two fields:

```ts
  const { refreshToken } = await createSession(redis, {
    sub: input.sub,
    email: input.email,
    name: input.name,
    amr: input.amr,
    wsp: input.wsp,
  });
```

```ts
  const { token, claims } = await issuer.mintAccessToken({
    sub: session.sub,
    email: session.email,
    name: session.name,
    amr: session.amr,
    wsp: session.wsp,
  });
```

- [ ] **Step 5: Strip `wspRole`/`inv` from the session store**

In `services/auth/src/store/sessions.ts`:

Change the import to drop `WorkspaceRole`:
```ts
import type { Amr, SessionRecord } from '../tokens/types.js';
```

Replace the `NewSessionInput` interface:
```ts
/** Claim inputs a new session carries (everything but the generated `sid`). */
export interface NewSessionInput {
  sub: string;
  email: string;
  name: string;
  amr: Amr[];
  wsp?: string;
}
```

Replace the `getSessionByRefreshToken` return object:
```ts
  return {
    sid: stored.sid,
    sub: stored.sub,
    email: stored.email,
    name: stored.name,
    amr: stored.amr,
    wsp: stored.wsp,
  };
```

- [ ] **Step 6: Type-check + run token-core tests — verify GREEN**

Run: `bunx turbo run check-types --filter=@open-tomato/auth`
Expected: PASS. (If `workspace.ts` errors here on `wspRole`/`inv`, that is expected — Task 2 fixes it. To keep Task 1 independently green, if the type-checker reports `workspace.ts`, proceed to Task 2 before the gate; do NOT revert this task.)

Run: `bunx vitest run src/tokens/__tests__/token-core.test.ts` (cwd `services/auth`)
Expected: PASS — all token-core tests, including the rewritten workspace-claims test.

- [ ] **Step 7: Commit**

```bash
git add services/auth/src/tokens/types.ts services/auth/src/tokens/session-tokens.ts services/auth/src/store/sessions.ts services/auth/src/tokens/__tests__/token-core.test.ts
git commit -m "refactor(ws09e): drop wspRole/inv from access token + session, keep wsp scope"
```

---

## Task 2: `workspace.select` mints `wsp`-only

**Files:**
- Modify: `services/auth/src/routes/workspace.ts:43-44,101-131`
- Test: `services/auth/src/routes/__tests__/workspace.test.ts:108-133`

**Interfaces:**
- Consumes: `issueTokenSet(redis, issuer, { sub, email, name, amr, wsp })` (Task 1 shape).
- Produces: `POST /workspaces/select` → `{ status:'ok', tokens }` where `tokens.claims` carries `wsp` only (no `wspRole`/`inv`), or `{ status:'invalid_invitation' }`.

- [ ] **Step 1: Rewrite the two `select` success tests to assert `wsp`-only**

In `services/auth/src/routes/__tests__/workspace.test.ts`, replace the first two `it(...)` blocks inside `describe('POST /workspaces/select', ...)` (lines 109-133) with:

```ts
  it('stamps wsp only for a valid invite and preserves amr (no role/inv in token)', async () => {
    vi.mocked(getInvitationById).mockResolvedValue(OPEN_INVITE);

    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({ invitationId: 'inv_og' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.claims).toMatchObject({ wsp: 'ws_open_garden', amr: ['pwd'] });
    expect(res.body.tokens.claims.wspRole).toBeUndefined();
    expect(res.body.tokens.claims.inv).toBeUndefined();
  });

  it('mints the self-serve default (wsp only) when no invite is chosen', async () => {
    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.tokens.claims.wsp).toBe('ws_default');
    expect(res.body.tokens.claims.wspRole).toBeUndefined();
    expect(res.body.tokens.claims.inv).toBeUndefined();
    expect(vi.mocked(getInvitationById)).not.toHaveBeenCalled();
  });
```

Leave the `invalid`/`expired`/`foreign`/`requires auth` tests unchanged.

- [ ] **Step 2: Run — verify it FAILS**

Run: `bunx vitest run src/routes/__tests__/workspace.test.ts -t "POST /workspaces/select"` (cwd `services/auth`)
Expected: FAIL — the current handler stamps `wspRole`/`inv`, so `wspRole` is not `undefined`.

- [ ] **Step 3: Rewrite the `select` handler + default constant**

In `services/auth/src/routes/workspace.ts`:

Change the default-workspace constant (remove `role`):
```ts
/** The self-serve workspace minted when no invite is chosen. */
const DEFAULT_WORKSPACE = { id: 'ws_default' };
```

Replace the `router.post('/select', ...)` handler body's core with:
```ts
  router.post('/select', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SelectSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidationError(parsed.error);

      const { sub, email, name, amr } = (req as AuthedRequest).auth;
      const { invitationId } = parsed.data;

      let wsp = DEFAULT_WORKSPACE.id;

      if (invitationId != null) {
        const invite = await getInvitationById(db, invitationId);
        if (!inviteIsValidFor(invite, email)) {
          res.status(200).json({ status: 'invalid_invitation' });
          return;
        }
        wsp = invite.workspaceId;
      }

      // The FINAL token carries ONLY the `wsp` scope pointer. Authorization (role)
      // and invite-acceptance state are NOT in the token — resolve via
      // `GET /workspaces/:id/me` (WS09e). `amr` is preserved from the session.
      const tokens = await issueTokenSet(redis, issuer, { sub, email, name, amr, wsp });
      res.status(200).json({ status: 'ok', tokens });
    } catch (err) {
      next(err);
    }
  });
```

Remove the now-unused `WorkspaceRole` import line (`import type { WorkspaceRole } from '../tokens/types.js';`).

- [ ] **Step 4: Run — verify GREEN**

Run: `bunx vitest run src/routes/__tests__/workspace.test.ts` (cwd `services/auth`)
Expected: PASS — every workspace route test (GET invitations + POST select). The `GET /:id/me` describe block does not exist yet; that is Task 3.

- [ ] **Step 5: Commit**

```bash
git add services/auth/src/routes/workspace.ts services/auth/src/routes/__tests__/workspace.test.ts
git commit -m "refactor(ws09e): workspace.select mints wsp-only token"
```

---

## Task 3: `WorkspaceContext` port + `GET /workspaces/:id/me`

**Files:**
- Modify: `services/auth/src/store/invitations.ts`
- Create: `services/auth/src/workspace/context.ts`
- Create: `services/auth/src/workspace/__tests__/context.test.ts`
- Modify: `services/auth/src/routes/workspace.ts`
- Test: `services/auth/src/routes/__tests__/workspace.test.ts`

**Interfaces:**
- Consumes: `getMembershipRole(db, userId, workspaceId)`, `listOpenInvitationsForEmail(db, email)` (returns `InvitationRow[]` with `.workspaceId`, `.id`, `.role`).
- Produces:
  - `getMembershipRole(db: Db, userId: string, workspaceId: string): Promise<WorkspaceRole | null>`
  - `createWorkspaceContext(db: Db): WorkspaceContext` where `WorkspaceContext.resolveContext(params: { sub: string; email: string; workspaceId: string }): Promise<{ wspRole: WorkspaceRole | null; membership: { role: WorkspaceRole } | null; pendingInvite: { id: string; role: WorkspaceRole } | null }>`
  - `GET /workspaces/:id/me` (bearer-authed) → that result object as JSON 200.

- [ ] **Step 1: Add `getMembershipRole` to the invitations store**

Append to `services/auth/src/store/invitations.ts` (the `and`/`eq` imports already exist):

```ts
/** The caller's confirmed role in a workspace, or `null` when not a member. */
export async function getMembershipRole(
  db: Db,
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const rows = await db
    .select({ role: workspaceMembershipsTable.role })
    .from(workspaceMembershipsTable)
    .where(and(
      eq(workspaceMembershipsTable.user_id, userId),
      eq(workspaceMembershipsTable.workspace_id, workspaceId),
    ))
    .limit(1);
  return rows[0]?.role ?? null;
}
```

- [ ] **Step 2: Write the failing `WorkspaceContext` unit test**

Create `services/auth/src/workspace/__tests__/context.test.ts`:

```ts
import type { Db } from '../../db/index.js';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../store/invitations.js', () => ({
  getMembershipRole: vi.fn(),
  listOpenInvitationsForEmail: vi.fn(),
}));

const { getMembershipRole, listOpenInvitationsForEmail } = await import('../../store/invitations.js');
const { createWorkspaceContext } = await import('../context.js');

const db = {} as Db;
const params = { sub: 'usr_sam', email: 'sam@open-tomato.dev', workspaceId: 'ws_open_garden' };
const INVITE = {
  id: 'inv_og', workspaceId: 'ws_open_garden', workspaceName: 'open-garden',
  email: 'sam@open-tomato.dev', role: 'member' as const, invitedBy: null,
  expiresAt: null, acceptedAt: null,
};

beforeEach(() => {
  vi.mocked(getMembershipRole).mockReset();
  vi.mocked(listOpenInvitationsForEmail).mockReset();
});

describe('createWorkspaceContext.resolveContext', () => {
  it('reports membership role when the caller is a confirmed member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('admin');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: 'admin', membership: { role: 'admin' }, pendingInvite: null,
    });
  });

  it('falls back to a pending invite role when not a member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([INVITE]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  it('prefers the membership role over a pending invite', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('owner');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([INVITE]);

    const ctx = createWorkspaceContext(db);
    const result = await ctx.resolveContext(params);
    expect(result.wspRole).toBe('owner');
    expect(result.membership).toEqual({ role: 'owner' });
    expect(result.pendingInvite).toEqual({ id: 'inv_og', role: 'member' });
  });

  it('ignores invites addressed to a different workspace', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([{ ...INVITE, workspaceId: 'ws_other' }]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: null, membership: null, pendingInvite: null,
    });
  });
});
```

- [ ] **Step 3: Run — verify it FAILS**

Run: `bunx vitest run src/workspace/__tests__/context.test.ts` (cwd `services/auth`)
Expected: FAIL — `../context.js` does not resolve yet.

- [ ] **Step 4: Create the `WorkspaceContext` module**

Create `services/auth/src/workspace/context.ts`:

```ts
/**
 * Workspace-context port — the seam a future standalone Workspace service lifts
 * out behind. Resolves a caller's authorization (role) + pending invite for a
 * workspace on demand, from the memberships/invitations stores. This is where
 * `wspRole`/`inv` went when they left the identity token (WS09e): the token
 * carries only the `wsp` scope pointer; role and invite-state are fetched here.
 *
 * FUTURE (OPT-259): a durable `acceptInvite(sub, invitationId)` method belongs on
 * this port — writing a `workspace_memberships` row + setting
 * `invitations.accepted_at`. Left as a documented extension point; `select` does
 * NOT auto-accept for the PoC. When Workspace becomes its own service, swap
 * `createWorkspaceContext(db)` for an HTTP client behind the same interface — no
 * consumer changes.
 */
import type { Db } from '../db/index.js';
import type { WorkspaceRole } from '../tokens/types.js';

import { getMembershipRole, listOpenInvitationsForEmail } from '../store/invitations.js';

export interface WorkspaceContextResult {
  /** Effective role: the caller's membership role, else a pending invite's role,
   *  else `null` (no access). Authorization lives here now, not in the token. */
  wspRole: WorkspaceRole | null;
  /** Present when the caller is a confirmed member. */
  membership: { role: WorkspaceRole } | null;
  /** Present when the caller has an open (unaccepted) invite to this workspace —
   *  the replacement for the old `inv` token claim. */
  pendingInvite: { id: string; role: WorkspaceRole } | null;
}

export interface WorkspaceContextParams {
  sub: string;
  email: string;
  workspaceId: string;
}

/** The port consumers depend on — never the concrete stores. */
export interface WorkspaceContext {
  resolveContext(params: WorkspaceContextParams): Promise<WorkspaceContextResult>;
}

export function createWorkspaceContext(db: Db): WorkspaceContext {
  return {
    async resolveContext({ sub, email, workspaceId }) {
      const [membershipRole, openInvites] = await Promise.all([
        getMembershipRole(db, sub, workspaceId),
        listOpenInvitationsForEmail(db, email),
      ]);

      const invite = openInvites.find((i) => i.workspaceId === workspaceId) ?? null;
      const pendingInvite = invite == null
        ? null
        : { id: invite.id, role: invite.role };
      const membership = membershipRole == null
        ? null
        : { role: membershipRole };
      const wspRole = membershipRole ?? pendingInvite?.role ?? null;

      return { wspRole, membership, pendingInvite };
    },
  };
}
```

- [ ] **Step 5: Run — verify GREEN**

Run: `bunx vitest run src/workspace/__tests__/context.test.ts` (cwd `services/auth`)
Expected: PASS — all four resolver tests.

- [ ] **Step 6: Add the `GET /:id/me` route test (extend the store mock)**

In `services/auth/src/routes/__tests__/workspace.test.ts`:

Add `getMembershipRole` to the `store/invitations.js` mock factory (line 11-15):
```ts
vi.mock('../../store/invitations.js', () => ({
  listOpenInvitationsForEmail: vi.fn(),
  getInvitationById: vi.fn(),
  countWorkspaceMembers: vi.fn(),
  getMembershipRole: vi.fn(),
}));
```

Add it to the destructured import (line 22):
```ts
const { listOpenInvitationsForEmail, getInvitationById, countWorkspaceMembers, getMembershipRole } = await import('../../store/invitations.js');
```

Add a reset in `beforeEach` (alongside the others):
```ts
  vi.mocked(getMembershipRole).mockReset();
```

Append a new describe block after `describe('POST /workspaces/select', ...)`:
```ts
describe('GET /workspaces/:id/me', () => {
  it('reports the caller’s membership role', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('admin');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const res = await request(app).get('/workspaces/ws_open_garden/me')
      .set('Authorization', await bearer());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ wspRole: 'admin', membership: { role: 'admin' }, pendingInvite: null });
  });

  it('falls back to a pending invite when not yet a member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([OPEN_INVITE]);

    const res = await request(app).get('/workspaces/ws_open_garden/me')
      .set('Authorization', await bearer());

    expect(res.body).toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  it('returns a null role for a workspace the caller cannot access', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const res = await request(app).get('/workspaces/ws_stranger/me')
      .set('Authorization', await bearer());

    expect(res.body).toEqual({ wspRole: null, membership: null, pendingInvite: null });
  });

  it('requires auth', async () => {
    const res = await request(app).get('/workspaces/ws_open_garden/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 7: Run — verify it FAILS**

Run: `bunx vitest run src/routes/__tests__/workspace.test.ts -t "GET /workspaces/:id/me"` (cwd `services/auth`)
Expected: FAIL — the route returns 404 (not mounted yet).

- [ ] **Step 8: Mount the `GET /:id/me` route via the context port**

In `services/auth/src/routes/workspace.ts`:

Add the import near the other store imports:
```ts
import { createWorkspaceContext } from '../workspace/context.js';
```

Inside `workspaceRouter`, after `const auth = requireAuth(issuer);`, build the context and add the route (place it after the `/select` handler, before `return router;`):
```ts
  const context = createWorkspaceContext(db);

  router.get('/:id/me', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sub, email } = (req as AuthedRequest).auth;
      const workspaceId = req.params.id ?? '';
      const result = await context.resolveContext({ sub, email, workspaceId });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });
```

- [ ] **Step 9: Run — verify GREEN**

Run: `bunx vitest run src/routes/__tests__/workspace.test.ts` (cwd `services/auth`)
Expected: PASS — all workspace route tests (invitations, select, `/:id/me`).

- [ ] **Step 10: Commit**

```bash
git add services/auth/src/store/invitations.ts services/auth/src/workspace/context.ts services/auth/src/workspace/__tests__/context.test.ts services/auth/src/routes/workspace.ts services/auth/src/routes/__tests__/workspace.test.ts
git commit -m "feat(ws09e): WorkspaceContext port + GET /workspaces/:id/me (role/invite off-token)"
```

---

## Task 4: Docs, audit, full gate, security review

**Files:**
- Modify: `services/auth/README.md`

**Interfaces:** none produced; this task verifies the whole phase.

- [ ] **Step 1: Grep-audit for stale `wspRole`/`inv` readers**

Run (from repo root):
```bash
grep -rn "wspRole\|\.inv\b" services/auth/src packages/service/express/src --include="*.ts" | grep -v "__tests__" | grep -v "workspace/context.ts"
```
Expected: only the `getMembershipRole`/context role plumbing (which is `WorkspaceRole`, not the removed claim). No `.wspRole`/`.inv` reads off `AccessTokenClaims`/`SessionRecord`/`getSession(...)`. If any appear, fix them before continuing.

- [ ] **Step 2: Update `services/auth/README.md`**

In the Endpoints table:
- Change the `POST /workspaces/select` row's result note to: `{status:'ok', tokens}` (final token, **`wsp` scope only** — role/invite off-token) · `{status:'invalid_invitation'}` — bearer-authed.
- Add a row: `GET /workspaces/:id/me` | `{ wspRole, membership, pendingInvite }` — **bearer-authed**; resolves the caller's role + pending invite on demand (authz lives here, not in the token).

Below the table, change the Tokens note from `Claims match AccessTokenClaims (sub/email/name/amr/wsp?/wspRole?/inv?/iat/exp)` to:
```
Tokens: 15-min HS256 access JWT + 30-day opaque refresh bound to a `sid` (Redis).
Claims are identity + a `wsp` scope pointer (`sub/email/name/amr/wsp?/iat/exp`).
Authorization (`wspRole`) and invite-acceptance state (`inv`) left the identity
token in WS09e — resolve them via `GET /workspaces/:id/me` (the WorkspaceContext
seam a future standalone workspace service lifts out behind).
```

- [ ] **Step 3: Run the full phase gate — verify GREEN**

Run (from repo root):
```bash
bunx turbo run build check-types test lint --filter=@open-tomato/auth
```
Expected: PASS — build, check-types, test (all suites, ~114+ tests including the new context + `/:id/me`), and lint all green. If lint flags an unused import (`WorkspaceRole` in `sessions.ts`/`workspace.ts`), remove it and re-run.

- [ ] **Step 4: Commit the docs**

```bash
git add services/auth/README.md
git commit -m "docs(ws09e): README — wsp-only token + GET /workspaces/:id/me seam"
```

- [ ] **Step 5: Security review of the new/changed auth surface**

Dispatch the **security-reviewer** agent over the Phase A diff (`git diff main...HEAD -- services/auth`), focused on: the token no longer carrying authz (no privilege leakage / no consumer still trusting a removed claim), `GET /workspaces/:id/me` authorization (bearer-authed, scoped to the token's `sub`/`email`, no client-supplied identity trusted), and that `resolveContext` cannot leak another user's role/invite. Address any CRITICAL/HIGH before opening the PR.

- [ ] **Step 6: Open the phase PR**

```bash
git push -u origin ws09e-auth-http-wiring
gh pr create --title "WS09e Phase A — backend token-shape + workspace seam" --body "$(cat <<'EOF'
Removes workspace authorization from the identity token and adds the WorkspaceContext seam.

- Access token + session drop `wspRole`/`inv`; keep the `wsp` scope pointer.
- `POST /workspaces/select` re-mints `wsp`-only.
- New `WorkspaceContext` port + `GET /workspaces/:id/me` resolves role + pending invite on demand (the seam a future standalone workspace service lifts out behind).
- No back-compat shims (service is pre-production). Full auth gate green; security-reviewed.

Part of WS09e (spec: docs/superpowers/specs/2026-07-24-ws09e-auth-http-wiring-workspace-extraction-design.md). Phases B–D (frontend contract, httpAuthApi, OAuth redirect) follow.
EOF
)"
```

Squash-merge once the gate is green (CI disabled — the local turbo gate is the gate).

---

## Self-Review

**Spec coverage (Phase A rows of the spec):** token shape drops `wspRole`/`inv`, keeps `wsp` (Task 1) ✓; `select` re-mints `wsp`-only (Task 2) ✓; `WorkspaceContext` port + `GET /workspaces/:id/me` with `pendingInvite` + documented membership-write seam (Task 3) ✓; RED-first on `workspace.test.ts`/`token-core.test.ts` (Tasks 1-3) ✓ (`introspect-token.test.ts` needs no change — its `SessionRecord` fixture already omits `wspRole`/`inv`, confirmed in Step-1 audit / gate); README update (Task 4) ✓; grep-audit for the open-index-signature silent-break risk (Task 4 Step 1) ✓; security-reviewer before merge (Task 4 Step 5) ✓; local turbo gate (Task 4 Step 3) ✓.

**Placeholder scan:** no TBD/TODO left as work; the only "future" reference is the explicitly-deferred OPT-259 `acceptInvite` extension point, documented as a seam per the approved spec (not a work placeholder).

**Type consistency:** `resolveContext(params)` object arg and `{ wspRole, membership, pendingInvite }` return shape are identical across `context.ts`, `context.test.ts`, and the route test. `getMembershipRole(db, userId, workspaceId)` signature matches its call in `context.ts`. `NewSessionInput`/`SessionRecord`/`AccessTokenClaims` all end at `{ …, wsp? }` with no `wspRole`/`inv`.
</content>
