/**
 * Wire token shapes — a server-side mirror of the auth-app contract
 * (`auth-app/src/auth/types.ts` + `tokens.ts`). Kept structurally identical so
 * the auth-app can point at this live service without changing a line: the
 * over-the-wire `TokenSet`/`AccessTokenClaims` this service emits must match
 * exactly what the app already decodes.
 */

export type OAuthProvider = 'google' | 'github';

/** Authentication Methods References — how the session was proven. */
export type Amr = 'pwd' | 'otp' | 'webauthn' | `oauth:${OAuthProvider}`;

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

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

/** The claim inputs a caller supplies; `iat`/`exp` are stamped at mint time. */
export type AccessTokenInput = Omit<AccessTokenClaims, 'iat' | 'exp'>;

/** The token set returned on every successful authentication step. */
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
  /** Decoded access-token payload, surfaced so the client need not decode to route. */
  claims: AccessTokenClaims;
}

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
