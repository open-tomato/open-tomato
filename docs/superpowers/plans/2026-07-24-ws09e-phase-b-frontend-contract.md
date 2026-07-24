# WS09e Phase B — Frontend contract (split workspaceApi, drop wspRole/inv) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the auth-app mock contract in line with the WS09e backend: drop `wspRole`/`inv` from the token claims (keep `wsp`), split the workspace surface off `AuthApi` into a distinct `workspaceApi` (with a new `getContext`), and update every consumer/test/doc — still on the in-app mock (no HTTP yet).

**Architecture:** The auth-app's mock `authApi` IS the typed contract every screen talks to. Phase A already changed the live service; this phase makes the mock match: identity token carries `wsp` only, and workspace concerns (`listInvitations`/`select`/`getContext`) become their own `workspaceApi` surface — mirroring the backend module split so Phase C can point workspace calls at a separate base URL. `select` mints a `wsp`-only token; role/pending-invite come from `getContext`.

**Tech Stack:** TypeScript (ESM, Vite), React, Vitest + Testing Library, bun + turbo.

## Global Constraints

- Runtime: bun; **Gate command:** `bunx turbo run build check-types test lint --filter=@open-tomato/auth-app` (green before the PR merges).
- No `console.log`. Immutable updates. Files < 800 lines. TDD.
- **No backward compatibility** — break the mock contract freely; no version shims.
- Token claims end shape (must match Phase A backend): `AccessTokenClaims` = `{ sub, email, name, amr, wsp?, iat, exp }` — no `wspRole`, no `inv`. Keep `WorkspaceRole` (used by `WorkspaceInvitation` + the new context result).
- `workspaceApi.select` still returns `{ status:'ok', tokens }` with `tokens.claims` carrying `wsp` only. New `workspaceApi.getContext(workspaceId)` returns `{ wspRole: WorkspaceRole|null; membership: { role: WorkspaceRole }|null; pendingInvite: { id: string; role: WorkspaceRole }|null }` (mirrors backend `GET /workspaces/:id/me`).
- Branch is `ws09e-phase-b-frontend-contract`. Squash-merge after green + review.

---

## File Structure

- `auth-app/src/auth/types.ts` — **Modify.** Drop `wspRole`/`inv` from `AccessTokenClaims`; add `WorkspaceContextResult`.
- `auth-app/src/auth/api/authApi.ts` — **Modify.** Lift `sessionId`/`issueFor` to module scope as `sessionIdFor`/`issueForUser` (extra = `{ wsp? }`); remove the `workspace` block from `createAuthApi`; add `createWorkspaceApi` + `workspaceApi` + `WorkspaceApi`; `select` mints `wsp`-only; add `getContext`.
- `auth-app/src/auth/flows/workspace.ts` — **Modify.** Depend on `WorkspaceApi` (default `workspaceApi`); call `api.listInvitations()`/`api.select(...)`.
- `auth-app/src/pages/WorkspaceFlow.tsx` — **Modify.** Import `workspaceApi`; call `workspaceApi.listInvitations()`.
- `auth-app/src/auth/api/authApi.test.ts` — **Modify.** Remove the workspace `describe` block (moves to the new file).
- `auth-app/src/auth/api/workspaceApi.test.ts` — **Create.** Tests for `listInvitations`/`select` (wsp-only)/`getContext`.
- `auth-app/src/auth/flows/flows.test.ts` — **Modify.** Workspace-machine assertions drop `wspRole`/`inv`.
- `auth-app/docs/auth-api-contract.md` — **Modify.** Token table + workspace endpoints reflect the new shape.

---

## Task 1: Split `workspaceApi`, drop `wspRole`/`inv`, update consumers + tests

**Files:**
- Modify: `auth-app/src/auth/types.ts`
- Modify: `auth-app/src/auth/api/authApi.ts`
- Modify: `auth-app/src/auth/flows/workspace.ts`
- Modify: `auth-app/src/pages/WorkspaceFlow.tsx`
- Modify: `auth-app/src/auth/api/authApi.test.ts`
- Create: `auth-app/src/auth/api/workspaceApi.test.ts`
- Modify: `auth-app/src/auth/flows/flows.test.ts`

**Interfaces:**
- Produces:
  - `AccessTokenClaims` = `{ sub, email, name, amr, wsp?, iat, exp }` (no `wspRole`/`inv`).
  - `WorkspaceContextResult` (in `types.ts`): `{ wspRole: WorkspaceRole|null; membership: { role: WorkspaceRole }|null; pendingInvite: { id: string; role: WorkspaceRole }|null }`.
  - `createWorkspaceApi(clock?)` / `workspaceApi` / `WorkspaceApi` with `listInvitations(): Promise<WorkspaceInvitation[]>`, `select({ userId, invitationId? }): Promise<{ status:'ok'; tokens: TokenSet } | { status:'invalid_invitation' }>`, `getContext(workspaceId: string): Promise<WorkspaceContextResult>`.
  - `AuthApi` no longer has `.workspace`.

- [ ] **Step 1: Update `types.ts` — drop `wspRole`/`inv`, add `WorkspaceContextResult`**

In `auth-app/src/auth/types.ts`, replace the `wsp`/`wspRole`/`inv` block of `AccessTokenClaims` with `wsp` only:

```ts
  /** How this session was authenticated. */
  amr: Amr[];
  /** Active workspace SCOPE pointer, once selected. Absent until WorkspacePick
   *  resolves. Presence is NOT proof of access — authorization (role) is resolved
   *  on demand via `workspaceApi.getContext` (backend `GET /workspaces/:id/me`);
   *  `wspRole`/`inv` left the token in WS09e. */
  wsp?: string;
  /** Issued-at / expiry, seconds since epoch (JWT convention). */
  iat: number;
  exp: number;
```

Then append a new exported type after the `WorkspaceInvitation` interface (keep `WorkspaceRole` as-is):

```ts
/**
 * Workspace authorization context — resolved on demand (backend
 * `GET /workspaces/:id/me`) now that role/invite left the identity token.
 * `wspRole` is the effective role: the member's role, else a pending invite's
 * role, else null (no access).
 */
export interface WorkspaceContextResult {
  wspRole: WorkspaceRole | null;
  membership: { role: WorkspaceRole } | null;
  pendingInvite: { id: string; role: WorkspaceRole } | null;
}
```

- [ ] **Step 2: Restructure `authApi.ts` — module-level token helpers**

In `auth-app/src/auth/api/authApi.ts`, replace the factory's inline `sessionId`/`issueFor` closures (currently at the top of `createAuthApi`, lines ~208-222) by lifting them to module scope. Add these two helpers just above `export const createAuthApi` (after the `settle` helper), and change the `WorkspaceRole` import usage — `issueForUser`'s `extra` is now `{ wsp?: string }` only:

```ts
/** Deterministic session id from the subject + a discriminator (no counters). */
const sessionIdFor = (sub: string, extra: string): string => makeId('sid', stableHash(`${sub}:${extra}`));

/** Mint a token set for a user. `extra` carries only the `wsp` scope pointer —
 *  authorization (role) and invite state are no longer token claims (WS09e). */
const issueForUser = (
  user: UserProfile,
  amr: TokenSet['claims']['amr'],
  clock: Clock,
  extra: { wsp?: string } = {},
): TokenSet => issueTokens(
  {
    sub: user.id, email: user.email, name: user.name, amr, ...extra,
  },
  sessionIdFor(user.id, amr.join('+')),
  clock,
);
```

- [ ] **Step 3: Restructure `authApi.ts` — `createAuthApi` loses `workspace`, uses `issueForUser`**

Change `export const createAuthApi = (clock: Clock = frozenClock) => {` so it no longer defines `sessionId`/`issueFor` and no longer returns a `workspace` key. Inside every `issueFor(user, amr)` / `issueFor(user, amr, extra)` call in `signIn`/`signUp`/`reset`, replace with `issueForUser(user, amr, clock)` (none of these pass workspace `extra`). Concretely, replace each `issueFor(user, ['pwd'])` → `issueForUser(user, ['pwd'], clock)`, `issueFor(existing, [\`oauth:${provider}\`])` → `issueForUser(existing, [\`oauth:${provider}\`], clock)`, `issueFor(user, [\`oauth:${provider}\`])` → `issueForUser(user, [\`oauth:${provider}\`], clock)`. Remove the entire `workspace: { listInvitations, select }` block from the returned object (it moves to Step 4). The returned object now has exactly `signIn`, `signUp`, `reset`, `twoFactor`.

- [ ] **Step 4: Add `createWorkspaceApi` + exports to `authApi.ts`**

After `export type AuthApi = ReturnType<typeof createAuthApi>;` and `export const authApi: AuthApi = createAuthApi();`, add the workspace surface. Add a `WorkspaceContextResult` import to the type import block at the top (`import type { …, WorkspaceContextResult, WorkspaceInvitation, WorkspaceRole } from '../types';`):

```ts
/**
 * Workspace API — the surface split off `authApi` in WS09e, mirroring the
 * backend module boundary (Phase C can point it at a separate base URL). The
 * mock resolves everything from the same deterministic fixtures.
 */
export const createWorkspaceApi = (clock: Clock = frozenClock) => ({
  /** Open invitations for the current user (copies, so callers can't mutate the fixture). */
  listInvitations: (): Promise<WorkspaceInvitation[]> => settle(INVITATIONS.map((i) => ({ ...i }))),

  /**
   * Resolve the active workspace and mint the FINAL token with the `wsp` scope
   * pointer only. Role/invite are NOT stamped — the app reads them from
   * {@link getContext}. An unknown invite is rejected; no invite → the
   * self-serve default workspace.
   */
  select: ({ userId, invitationId }: SelectWorkspaceRequest): Promise<
    | { status: 'ok'; tokens: TokenSet }
    | { status: 'invalid_invitation' }
  > => {
    const user = Object.values(USERS_BY_EMAIL).find((u) => u.id === userId)
      ?? { ...USER_STANDARD, id: userId };
    if (invitationId != null) {
      const invite = INVITATIONS.find((i) => i.id === invitationId);
      if (invite == null) return settle({ status: 'invalid_invitation' });
      return settle({ status: 'ok', tokens: issueForUser(user, ['pwd'], clock, { wsp: invite.workspaceId }) });
    }
    return settle({ status: 'ok', tokens: issueForUser(user, ['pwd'], clock, { wsp: 'ws_default' }) });
  },

  /**
   * The caller's authorization context for a workspace (mirrors the backend
   * `GET /workspaces/:id/me`). `ws_default` is the self-serve owner workspace;
   * a workspace matching an open invite reports that invite's role as a pending
   * (not-yet-accepted) grant; anything else is no access.
   */
  getContext: (workspaceId: string): Promise<WorkspaceContextResult> => {
    if (workspaceId === 'ws_default') {
      return settle({ wspRole: 'owner', membership: { role: 'owner' }, pendingInvite: null });
    }
    const invite = INVITATIONS.find((i) => i.workspaceId === workspaceId);
    if (invite != null) {
      return settle({ wspRole: invite.role, membership: null, pendingInvite: { id: invite.id, role: invite.role } });
    }
    return settle({ wspRole: null, membership: null, pendingInvite: null });
  },
});

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>;

/** Default workspace-API instance every screen imports — frozen clock, deterministic. */
export const workspaceApi: WorkspaceApi = createWorkspaceApi();
```

Confirm the `SelectWorkspaceRequest` interface, the `INVITATIONS` fixture, `USERS_BY_EMAIL`, and `USER_STANDARD` remain declared in this file (they do — they were already module-level; only the `workspace` methods moved). Remove any now-unused `WorkspaceRole` value usage from `createAuthApi` (the `extra` type there is gone). `WorkspaceRole` is still imported for `issueForUser`? No — `issueForUser`'s extra is `{ wsp?: string }`; `WorkspaceRole` is used by `getContext`'s return type via `WorkspaceContextResult` (imported from types) and by `WorkspaceInvitation`. Keep the `WorkspaceRole` import only if still referenced; if lint flags it unused, remove it.

- [ ] **Step 5: Run check-types — expect consumer errors (RED for Step 6/7)**

Run: `bunx turbo run check-types --filter=@open-tomato/auth-app`
Expected: FAIL — `flows/workspace.ts` and `pages/WorkspaceFlow.tsx` still reference `authApi.workspace` / `api.workspace`, and `authApi.test.ts`/`flows.test.ts` still assert `wspRole`/`inv`. Steps 6-9 fix them. (This is the RED anchor.)

- [ ] **Step 6: Update `flows/workspace.ts` to the `WorkspaceApi` surface**

In `auth-app/src/auth/flows/workspace.ts`:
- Change the imports:
```ts
import type { WorkspaceApi } from '../api/authApi';
import type { TokenSet, WorkspaceInvitation } from '../types';

import { workspaceApi as defaultApi } from '../api/authApi';
```
- Change the reducer's `api` param type + calls:
```ts
export const workspaceReduce = async (
  state: WorkspaceState,
  event: WorkspaceEvent,
  api: WorkspaceApi = defaultApi,
): Promise<WorkspaceState> => {
```
- In the `loadInvites` case: `const invitations = await api.listInvitations();`
- In the `select` case: `const result = await api.select({ userId: state.userId, invitationId: event.invitationId });`

- [ ] **Step 7: Update `pages/WorkspaceFlow.tsx`**

In `auth-app/src/pages/WorkspaceFlow.tsx`, change the import of `authApi` to `workspaceApi` (from the same `'../auth'` barrel) and update the call:
- Import: replace `authApi,` in the `from '../auth'` import list with `workspaceApi,`.
- Line ~43: `void workspaceApi.listInvitations().then((invitations) => {`

(`auth/index.ts` already does `export * from './api/authApi'`, so `workspaceApi` is exported from the `'../auth'` barrel automatically — no index change needed.)

- [ ] **Step 8: Move the workspace tests out of `authApi.test.ts` into `workspaceApi.test.ts`**

Delete the entire `describe('authApi — workspace (claims at token level)', ...)` block (lines ~161-191) from `auth-app/src/auth/api/authApi.test.ts`.

Create `auth-app/src/auth/api/workspaceApi.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { AUTH_FIXTURES } from './authApi';
import { workspaceApi } from './authApi';

const { USER_STANDARD } = AUTH_FIXTURES;

describe('workspaceApi', () => {
  test('lists invitations as copies', async () => {
    const a = await workspaceApi.listInvitations();
    const b = await workspaceApi.listInvitations();
    expect(a.map((i) => i.id)).toEqual(['inv_og', 'inv_tm', 'inv_sd']);
    expect(a[0]).not.toBe(b[0]);
  });

  test('selecting an invite stamps wsp only — role/inv are no longer token claims', async () => {
    const result = await workspaceApi.select({ userId: USER_STANDARD.id, invitationId: 'inv_og' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    const { claims } = result.tokens;
    expect(claims.wsp).toBe('ws_open_garden');
    expect((claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
    expect((claims as unknown as Record<string, unknown>)['inv']).toBeUndefined();
  });

  test('an unknown invitation is rejected', async () => {
    expect((await workspaceApi.select({ userId: USER_STANDARD.id, invitationId: 'inv_bogus' })).status)
      .toBe('invalid_invitation');
  });

  test('the self-serve default mints a wsp-only token (no role claim)', async () => {
    const result = await workspaceApi.select({ userId: USER_STANDARD.id });
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.tokens.claims.wsp).toBe('ws_default');
    expect((result.tokens.claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
  });

  test('getContext reports the owner role for the self-serve default workspace', async () => {
    await expect(workspaceApi.getContext('ws_default')).resolves.toEqual({
      wspRole: 'owner', membership: { role: 'owner' }, pendingInvite: null,
    });
  });

  test('getContext reports a pending invite role for an invited workspace', async () => {
    await expect(workspaceApi.getContext('ws_open_garden')).resolves.toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  test('getContext reports no access for an unrelated workspace', async () => {
    await expect(workspaceApi.getContext('ws_stranger')).resolves.toEqual({
      wspRole: null, membership: null, pendingInvite: null,
    });
  });
});
```

- [ ] **Step 9: Update the workspace-machine assertions in `flows.test.ts`**

In `auth-app/src/auth/flows/flows.test.ts`, in the `describe('workspace machine', ...)` block, update the two assertions that reference removed claims:

Replace the `'selecting an invite finishes with a workspace-scoped token'` test body's assertions (lines ~189-190):
```ts
    expect(s.tokens?.claims.wsp).toBe('ws_open_garden');
    expect((s.tokens?.claims as unknown as Record<string, unknown>)['inv']).toBeUndefined();
```

Replace the `'self-serve default finishes with the owner default workspace'` test body's assertions (lines ~202-203):
```ts
    expect(s.tokens?.claims.wsp).toBe('ws_default');
    expect((s.tokens?.claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
```

- [ ] **Step 10: Run the auth-app suite + check-types — verify GREEN**

Run: `bunx turbo run check-types --filter=@open-tomato/auth-app`
Expected: PASS — no `authApi.workspace` references remain.

Run: `bunx vitest run` (cwd `auth-app`)
Expected: PASS — `authApi.test.ts` (workspace block gone), new `workspaceApi.test.ts` (7 tests), `flows.test.ts` (updated workspace assertions), and all other suites.

- [ ] **Step 11: Commit**

```bash
git add auth-app/src/auth/types.ts auth-app/src/auth/api/authApi.ts auth-app/src/auth/api/authApi.test.ts auth-app/src/auth/api/workspaceApi.test.ts auth-app/src/auth/flows/workspace.ts auth-app/src/auth/flows/flows.test.ts auth-app/src/pages/WorkspaceFlow.tsx
git commit -m "refactor(ws09e): split workspaceApi off authApi + drop wspRole/inv from token claims"
```

---

## Task 2: Update the contract doc + full gate + PR

**Files:**
- Modify: `auth-app/docs/auth-api-contract.md`

- [ ] **Step 1: Grep-audit for stale `wspRole`/`inv` references in auth-app**

Run (from repo root):
```bash
grep -rn "wspRole\|\.inv\b" auth-app/src auth-app/docs --include="*.ts" --include="*.tsx" --include="*.md" | grep -v "node_modules"
```
Expected: only the intentional `toBeUndefined` test assertions and doc prose describing the removal. No production code or contract text still claims the token carries `wspRole`/`inv` as an active claim. If a stale active-claim reference appears, fix it.

- [ ] **Step 2: Update `auth-app/docs/auth-api-contract.md`**

- In the **Access-token claims** table, remove the `wspRole` and `inv` rows; change the `wsp` row note to: `**Active workspace SCOPE pointer** — presence is not proof of access; role/invite resolve via workspace context (see below).`
- Under **Workspace**, change the `POST /workspaces/select` result note so it stamps **`wsp` only** (no `wspRole`/`inv`), and add a new entry:
  `#### \`GET /workspaces/:id/me\` — \`workspaceApi.getContext\`` → `{ wspRole, membership, pendingInvite }` — the caller's authorization for a workspace, resolved on demand (bearer-authed). `wspRole` is the effective role (membership, else pending invite, else null). This is where authorization moved when it left the identity token (WS09e).
- In the intro/"source of truth" note, mention that the workspace surface is now `workspaceApi` (split off `authApi`), pointing at `src/auth/api/authApi.ts` (`createWorkspaceApi`).

- [ ] **Step 3: Run the full phase gate — verify GREEN**

Run (from repo root):
```bash
bunx turbo run build check-types test lint --filter=@open-tomato/auth-app
```
Expected: PASS — build, check-types, test, lint all green.

- [ ] **Step 4: Commit the docs**

```bash
git add auth-app/docs/auth-api-contract.md
git commit -m "docs(ws09e): auth-app contract — wsp-only token + workspaceApi/getContext"
```

- [ ] **Step 5: Open the phase PR**

```bash
git push -u origin ws09e-phase-b-frontend-contract
gh pr create --base main --title "WS09e Phase B — frontend contract (workspaceApi split, wsp-only token)" --body "$(cat <<'EOF'
Brings the auth-app mock contract in line with the WS09e backend (Phase A, merged).

- Drops `wspRole`/`inv` from `AccessTokenClaims` (token keeps `wsp` scope only).
- Splits the workspace surface off `authApi` into `workspaceApi` (`listInvitations`/`select`/new `getContext`), mirroring the backend module boundary so Phase C can point it at a separate base URL.
- `workspaceApi.select` mints a `wsp`-only token; role/pending-invite resolve via `getContext` (mirrors backend `GET /workspaces/:id/me`).
- Consumers + tests + contract doc updated. Still on the in-app mock (no HTTP yet — that's Phase C).

Full auth-app gate green. Part of WS09e (spec: docs/superpowers/specs/2026-07-24-ws09e-auth-http-wiring-workspace-extraction-design.md).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Squash-merge once green (CI disabled — local turbo gate is the gate).

---

## Self-Review

**Spec coverage (Phase B rows of the spec):** `types.ts` drops `wspRole`/`inv`, keeps `wsp?` (Task 1 Step 1) ✓; split `workspaceApi` off `AuthApi` with `listInvitations`/`select`/`getContext` (Steps 2-4) ✓; `select` returns `wsp`-only tokens (Step 4) ✓; consumers updated (Steps 6-7) ✓; tests moved/updated + new getContext tests (Steps 8-9) ✓; contract doc updated (Task 2 Step 2) ✓; still on mock (no HTTP) ✓; local gate + PR (Task 2) ✓.

**Placeholder scan:** no TBD/TODO; all code blocks complete.

**Type consistency:** `WorkspaceContextResult` shape identical in `types.ts`, `authApi.ts` `getContext`, and `workspaceApi.test.ts`. `issueForUser(user, amr, clock, extra?)` signature consistent across `createAuthApi` call sites and `createWorkspaceApi`. `WorkspaceApi = ReturnType<typeof createWorkspaceApi>` consumed by `flows/workspace.ts`. `select({ userId, invitationId? })` request shape unchanged from the pre-split `SelectWorkspaceRequest`.
</content>
