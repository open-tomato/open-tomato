/**
 * Auth domain + token contracts.
 *
 * These types are the typed face of the draft backend contract documented in
 * `docs/auth-api-contract.md`. Every screen talks to the mock `authApi`
 * (`src/auth/api/authApi.ts`) using exactly these shapes; a real backend must
 * serve the same semantics over the wire.
 */

export type OAuthProvider = 'google' | 'github';

/** Second-factor methods a user can enroll / be challenged with. */
export type TwoFactorMethod = 'totp' | 'passkey';

/** Authentication Methods References — what proofs the session was minted on
 *  (mirrors the OIDC `amr` claim). `pwd` password, `otp` TOTP, `webauthn`
 *  passkey, `oauth:<provider>` a federated sign-in. */
export type Amr = 'pwd' | 'otp' | 'webauthn' | `oauth:${OAuthProvider}`;

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceInvitation {
  /** Invitation token id — validated server-side before the claim is minted. */
  id: string;
  workspaceId: string;
  workspaceName: string;
  /** Human blurb shown on the WorkspacePick screen. */
  description: string;
  members: number;
  /** Role the invite grants once accepted. */
  role: WorkspaceRole;
  /** Who sent it (display only). */
  invitedBy: string;
  tone: 'accent' | 'primary' | 'gold';
}

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

/**
 * Claims carried inside the access token — identity plus a `wsp` workspace
 * SCOPE pointer. Authorization (`wspRole`) and invite-acceptance state (`inv`)
 * left the token in WS09e: they are no longer readable off the verified token
 * and are resolved on demand via `workspaceApi.getContext` (backend
 * `GET /workspaces/:id/me`). `wsp` alone is not proof of access.
 */
export interface AccessTokenClaims {
  /** Subject — the user id. */
  sub: string;
  email: string;
  name: string;
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
}

export interface RefreshTokenClaims {
  sub: string;
  /** Session id this refresh token is bound to. */
  sid: string;
  iat: number;
  exp: number;
}

/**
 * The token set returned on every successful authentication step. `accessToken`
 * is a short-lived JWT-shaped string (`header.payload.sig`); `refreshToken` is
 * opaque to the client. `claims` is the decoded access-token payload, surfaced
 * for convenience so the client need not decode it to route.
 */
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
  claims: AccessTokenClaims;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
}
