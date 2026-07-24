# Auth API contract — draft backend requirements

**Status:** WS08 (auth gateway frontend). This document is the second WS08
deliverable and the input to WS09 (auth backend). It is **derived from exactly
what the auth screens need** — the UI drives the backend definition, per
`docs/plans/poc-release/reference/POC-RELEASE-PLANS.md`.

The source of truth for the shapes is the in-app mock, which every screen talks
to and nothing else:

- Types: [`auth-app/src/auth/types.ts`](../src/auth/types.ts)
- Provider surface (the contract): [`auth-app/src/auth/api/authApi.ts`](../src/auth/api/authApi.ts)
- Token minting/decoding: [`auth-app/src/auth/api/tokens.ts`](../src/auth/api/tokens.ts)

Since WS09e, the workspace surface is its own provider, `workspaceApi`, split
off `authApi` (same file: [`auth-app/src/auth/api/authApi.ts`](../src/auth/api/authApi.ts),
`createWorkspaceApi`) so it can eventually point at a separate base URL.

Today these run against deterministic fixtures; a real backend must serve the
same method set, request shapes, and result semantics over the wire. Screen
wiring lives in `auth-app/src/pages/*` and the flow state machines in
`auth-app/src/auth/flows/*`.

## Conventions

- Transport: JSON over HTTPS. Suggested base path `/// auth/v1`; the frontend
  reads the origin from `VITE_AUTH_API_URL` (env-driven for standalone hosting).
- Every operation returns a **discriminated result** keyed on a `status` string
  rather than throwing on expected outcomes. Expected "failures" — wrong code,
  expired reset, OAuth denial, invalid invitation — are normal control flow the
  screens branch on, not HTTP 5xx. Reserve non-2xx for transport/again-later
  errors; carry business outcomes in the `status` field (mirrored by an HTTP
  4xx where a status code is also meaningful, e.g. `401` for
  `invalid_credentials`).
- Timestamps: seconds since epoch in token claims (JWT convention); ISO-8601
  UTC elsewhere.
- Ids are opaque strings; fixture ids use readable prefixes (`usr_`, `chl_`,
  `sid_`, `inv_`, `ws_`) purely for debuggability.
- **No account enumeration**: reset-code requests always report `sent`; sign-in
  failures never distinguish "no such user" from "wrong password".

## Token model

Two tokens are minted on every successful authentication step
([`tokens.ts`](../src/auth/api/tokens.ts)):

| Token | Shape | TTL | Purpose |
|---|---|---|---|
| **Access** (session) | JWT `header.payload.sig` | **15 min** (`ACCESS_TTL_SECONDS`) | Bearer credential the webapp sends on every request |
| **Refresh** | opaque, bound to a session id (`sid`) | **30 days** (`REFRESH_TTL_SECONDS`) | Rotates the access token without re-auth |

The client only ever **reads** access-token claims (never verifies — that is the
backend's job). Access-token claims (`AccessTokenClaims`):

| Claim | Type | Notes |
|---|---|---|
| `sub` | string | User id |
| `email`, `name` | string | Profile basics for the app chrome |
| `amr` | `Amr[]` | Authentication Methods References — how the session was proven: `pwd`, `otp`, `webauthn`, `oauth:google`, `oauth:github`. A password + TOTP sign-in carries `['pwd','otp']`. |
| `wsp` | string? | **Active workspace SCOPE pointer** — presence is not proof of access; role/invite resolve via workspace context (see below). Absent until workspace pick resolves. |
| `iat`, `exp` | number | Issued-at / expiry (seconds). |

Rationale: `wsp` only tells downstream services *which* workspace the session
is scoped to; it carries no authorization by itself. Role (`wspRole`) and
pending-invite state left the token in WS09e — a caller resolves them on
demand via `workspaceApi.getContext` (`GET /workspaces/:id/me`, bearer-authed)
instead of reading them off the verified token. This avoids baking
authorization into a 15-minute-TTL credential that can't be revoked mid-flight,
and keeps invite/membership changes effective immediately rather than only
after the next token refresh.

## Endpoints

### Sign in

#### `POST /sign-in/email` — `signIn.withEmail`
Request: `{ email, password, remember? }`
Result:
- `{ status: 'ok', tokens }` — password-only account (`amr: ['pwd']`).
- `{ status: 'two_factor_required', challenge: { challengeId, methods }, user }` — account has a second factor; proceed to the challenge.
- `{ status: 'invalid_credentials' }` — wrong/empty password or unknown email (indistinguishable, by design). → HTTP 401.

#### `POST /sign-in/2fa` — `signIn.verifyTwoFactor`
Request: `{ challengeId, code }`
Result: `{ status: 'ok', tokens }` (`amr: ['pwd','otp']`) | `{ status: 'invalid_code' }`.

The `challengeId` is issued by step 1 (`sign-in/email` → `two_factor_required`)
and **bound to that step-1 user**; it is short-lived (single sign-in attempt,
e.g. a few minutes) and single-use. The backend must resolve the challenge to
its user and reject an expired, already-consumed, or foreign challenge — do not
trust a `sub` from the client. (The mock ignores `challengeId` for simplicity;
the binding + expiry are a real-backend requirement.)

#### `GET /sign-in/oauth/:provider` — `signIn.withOAuth` (OAuth/OIDC initiation)
Redirects the browser to the provider's authorization endpoint (see the redirect
flow below). The backend generates and stores `state` (CSRF) + `nonce` (OIDC)
bound to the browser session before redirecting.

#### `GET /sign-in/oauth/:provider/callback?code&state` — provider callback
The provider redirects back here after consent. The backend:
1. Validates `state` matches the value it stored for this session (reject on
   mismatch/absence — CSRF guard); validates the OIDC `nonce` on the id_token.
2. Exchanges `code` (+ its PKCE verifier) server-side for the provider's
   tokens — the frontend never sees `code` or any client secret.
3. Resolves or provisions the local identity and returns the same result union
   `signIn.withOAuth` yields to the screens:
   - `{ status: 'ok', tokens }` — provider identity already linked (`amr: ['oauth:<provider>']`).
   - `{ status: 'needs_profile', provider, suggested }` — first sign-in with this provider; collect a handle (OAuth confirm screen) then create the account.
   - `{ status: 'denied', reason }` — provider returned `error=access_denied` (user rejected consent).

### Sign up

#### `POST /sign-up/email` — `signUp.withEmail`
Request: `{ email, username, password }`
Result: `{ status: 'ok', user, tokens }` | `{ status: 'email_taken' }`.

#### `POST /sign-up/oauth/:provider/complete` — `signUp.completeOAuth`
Request: `{ provider, username, displayName }` (after the OAuth confirm screen).
Result: `{ status: 'ok', user, tokens }` | `{ status: 'email_taken' }`.
`email_taken` is returned when the chosen handle (or the resolved federated
identity/email) is already linked to an account — the client re-prompts for a
different handle. (The mock triggers this for handles already in use.)

Both land the user on workspace pick before the account is fully "in".

### Password reset

#### `POST /reset/request` — `reset.requestCode`
Request: `{ email }`
Result: `{ status: 'sent', channel: 'email', maskedEmail }` — **always** (no enumeration).

#### `POST /reset/confirm` — `reset.resetPassword`
Request: `{ email, code, newPassword }` — the single ResetCode screen verifies the
code and sets the password together.

**The reset code is bound server-side to a single account.** The backend looks
the code up by `(account, code)` and validates it identifies that exact account;
a code presented with a different or unknown email is a mismatch. There is **no
default-user fallback** — an unbound code must never authenticate an arbitrary
account (that is an account-takeover shape). Result:
- `{ status: 'ok', tokens }` — code valid **and** bound to this email; signs the user in and (per the screen) revokes other sessions.
- `{ status: 'expired' }` — code was issued for this account but is past its 15-minute window; offer resend.
- `{ status: 'invalid_code' }` — wrong code, **or a code↔email mismatch, or an unknown email**. Mints nothing. (Intentionally indistinguishable from a wrong code — no account enumeration.)

### Two-factor enrollment (security setup, post-login)

#### `POST /2fa/totp/start` — `twoFactor.enrollTotpStart`
Result: `{ secret, otpauthUri }` — the client renders `otpauthUri` as a QR.

#### `POST /2fa/totp/verify` — `twoFactor.enrollTotpVerify`
Request: `{ code }`
Result: `{ status: 'ok', recoveryCodes }` (8 codes to display once) | `{ status: 'invalid_code' }`.

#### WebAuthn / passkey registration ceremony — **PoC-optional for the backend (D5)**

`POST /2fa/passkey/start` — `twoFactor.enrollPasskeyStart`
Result: `PasskeyRegistrationOptions` — the server-issued
`PublicKeyCredentialCreationOptions` payload (`challenge`, `rp`, `user`,
`pubKeyCredParams`, `timeout`, `attestation`). `challenge` and `user.id` are
base64url. The **browser** owns credential creation via
`navigator.credentials.create({ publicKey })`; the app only shapes the call
([`webauthn.ts`](../src/auth/webauthn.ts)) and surfaces the waiting state
(`PasskeyPrompt`), which stays cancellable (`NotAllowedError` → cancel).

`POST /2fa/passkey/finish` — `twoFactor.enrollPasskeyFinish`
Request: the `PublicKeyCredential` attestation from the browser.
Result: `{ status: 'ok', recoveryCodes }` | `{ status: 'failed', reason }`.
Backend attestation verification is **mocked** for the PoC (D5) — implement when
passkeys graduate from optional.

### Workspace

Served by `workspaceApi` (split off `authApi` in WS09e — see the intro note).

#### `GET /workspaces/invitations` — `workspaceApi.listInvitations`
Result: `WorkspaceInvitation[]` — open invites for the current user
(`id, workspaceId, workspaceName, description, members, role, invitedBy, tone`).

#### `POST /workspaces/select` — `workspaceApi.select`
Request: `{ userId, invitationId? }`
Result:
- `{ status: 'ok', tokens }` — mints the **final** session token with **`wsp`
  only** stamped in (no `wspRole`/`inv` — those are resolved on demand via
  `getContext` below).
  - With `invitationId`: the invite is **validated**; a valid one stamps `wsp`
    to the invite's workspace.
  - Without: the self-serve default workspace (`wsp: ws_default`).
- `{ status: 'invalid_invitation' }` — unknown/expired invite; pick another or start fresh.

#### `GET /workspaces/:id/me` — `workspaceApi.getContext`
Bearer-authed. Result: `{ wspRole, membership, pendingInvite }` — the caller's
authorization context for the given workspace, resolved on demand instead of
being read off the token. `wspRole` is the **effective role**: the member's
role if `membership` is set, else a `pendingInvite`'s role, else `null` (no
access). This is where authorization moved when it left the identity token
(WS09e) — call it after `select` (or whenever the active workspace changes) to
learn what the session is actually allowed to do.

## OAuth / OIDC redirect flow

1. The auth app sends the browser to the provider's authorization endpoint with
   the app's redirect URI, `state` (CSRF), and (OIDC) `nonce`.
2. On consent, the provider redirects back with `code` + `state`.
3. The backend exchanges `code` for provider tokens, resolves/creates the local
   identity, and returns one of the `signIn.withOAuth` results above.
4. Denial (`error=access_denied`) surfaces as `{ status: 'denied' }`.

The frontend never sees provider client secrets; the code exchange is
server-side.

## Redirect-back-to-webapp

On any terminal success the app hands the session to the webapp and navigates
there ([`session.ts`](../src/auth/session.ts)):

- Target origin is env-driven: `VITE_WEBAPP_URL`.
- An optional `?redirect=<path>` is honored **only** when it resolves to the
  configured webapp origin — off-origin values are dropped (no open redirect).
- PoC hand-off persists the token set to `sessionStorage`; a production backend
  should instead set an `httpOnly`, `Secure`, `SameSite` session cookie on the
  shared parent domain server-side.

## Rate-limit expectations

Per-endpoint throttling the backend should enforce (the screens assume it):

| Surface | Expectation |
|---|---|
| `sign-in/email`, `sign-in/2fa` | Per-account + per-IP attempt limit with backoff/lockout after repeated `invalid_credentials`/`invalid_code`. |
| `reset/request` | Per-email + per-IP cap; codes expire in 15 min; new request invalidates prior codes. |
| `reset/confirm`, `2fa/totp/verify` | Small fixed attempt budget per code/challenge before invalidation. |
| `sign-up/email` | Per-IP cap; pair with a honeypot/light anti-abuse control rather than a CAPTCHA by default. |
| `2fa/passkey/*` | Bounded by the WebAuthn `timeout`; one in-flight ceremony per session. |

Rate-limit responses should be distinguishable (e.g. HTTP 429 + `retry-after`)
so the UI can show a "try again shortly" state rather than a generic error.
