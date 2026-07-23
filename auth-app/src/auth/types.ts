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
 * Claims carried inside the access token. Workspace + invitation are flagged
 * HERE, at the token level, per the PoC plan: downstream services read the
 * active workspace and (for a not-yet-accepted invite) the pending
 * invitation straight off the verified token, no extra lookup.
 */
export interface AccessTokenClaims {
  /** Subject — the user id. */
  sub: string;
  email: string;
  name: string;
  /** How this session was authenticated. */
  amr: Amr[];
  /** Active workspace, once selected. Absent until WorkspacePick resolves. */
  wsp?: string;
  /** Role within the active workspace. */
  wspRole?: WorkspaceRole;
  /** Pending invitation id — present when the session entered via an invite
   *  that has not been formally accepted yet. */
  inv?: string;
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
