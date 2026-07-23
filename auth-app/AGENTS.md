# AGENTS — auth-app/

The Open-Tomato authentication gateway — a standalone-hosted SPA
(Vite + React 19 + TypeScript + react-router 7). Workspace member
`@open-tomato/app-auth`; consumes `@open-tomato/ui-components` (`workspace:*`).

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow)
and the WS08 plan: [`../docs/plans/poc-release/08-auth-frontend.md`](../docs/plans/poc-release/08-auth-frontend.md).

## Status

WS08 sessions 1 + 2 done: the 10 published auth page templates + AuthShell +
PasskeyPrompt wired into real flow state machines against a mocked auth API,
plus the `auth-api-contract.md` deliverable and unit/route tests.

## Layout

- `src/auth/` — the auth core:
  - `api/authApi.ts` — the mock backend. **Its surface IS the draft contract**
    (see `docs/auth-api-contract.md`). Deterministic fixtures, frozen clock,
    input-derived ids — no `Date.now()`/`Math.random()`.
  - `api/tokens.ts` — JWT-shaped access/refresh minting; `types.ts` — domain +
    token claims (workspace/invitation flagged at the token level).
  - `flows/*.ts` — one pure async state machine per flow
    (`(state, event) -> Promise<state>`), fully unit-testable; the page
    containers map `step` onto routes.
  - `FlowScreen.tsx` + `harvest.ts` — the integration seam (see gap note below).
  - `webauthn.ts` — the `navigator.credentials.create` call shape (D5).
  - `session.ts` — token persistence + env-driven redirect-back-to-webapp.
- `src/pages/` — one container per flow (`SignInFlow`, `SignUpFlow`,
  `OAuthConfirmFlow`, `WorkspaceFlow`, `ResetFlow`, `EnrollFlow`, `SignupDoneRoute`).
- `src/routes/` — route table (one entry URL per flow; `/reset` is the emailed
  deep-link landing).
- `src/theme/` — light-default ThemeProvider stamping `data-theme` + a floating
  toggle (the standalone app has no chrome to host a switcher).

## Library gap (IMPORTANT — read before wiring a new screen)

The published `@open-tomato/ui-components` auth page templates are
**presentational only**: they own their form state internally and expose **no
submit / value / OAuth callbacks** (only `LoginPage` has `onForgot`/`onSignup`),
and the `Button` atom renders `type="button"` (so a wrapping `<form>` won't
submit). The app therefore drives flows via **DOM-level click delegation**
(`FlowScreen`): a capture-phase handler maps the primary CTA (`bg-primary`) and
OAuth rows to flow events and harvests field values from the rendered inputs
(`harvest.ts`), reading the user's in-template selection via `aria-pressed`.

This is a documented workaround, not the desired end state. **Recommended
library fix:** give the auth pages controlled inputs / an `onSubmit`
(+ `onProviderSelect`, exposed selection) so the app can wire props directly and
delete the delegation seam. Do **not** fork or copy template source in.

## Conventions when active

- App code, not library code: compose `@open-tomato/ui-components`; never copy
  component source in, never import from the pre-publish repos.
- Screens interact only through `src/auth/api/authApi.ts` so real transport can
  swap in without touching pages. Keep `docs/auth-api-contract.md` in sync — it
  is the WS09 backend-requirements artifact.
- Determinism: no `Date.now()`/`new Date()`/`Math.random()` in fixtures.
- Gate: `bunx turbo run build check-types test lint --filter=@open-tomato/app-auth`
