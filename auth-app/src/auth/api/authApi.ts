/**
 * The mock auth backend — a deterministic, in-memory stand-in for the real
 * service. **This module's surface IS the draft API contract** (documented in
 * `docs/auth-api-contract.md`): every auth screen interacts only through it,
 * so its method set, request shapes, and result unions define exactly what the
 * backend must implement.
 *
 * All results are discriminated unions (`status` tag) rather than thrown
 * errors, so flow state machines can branch on every outcome — including the
 * expected "failures" (bad code, expired reset, OAuth denial) that are normal
 * control flow, not exceptions.
 *
 * Determinism: fixed fixtures, an injected frozen clock, and input-derived ids
 * (no counters, no `Date.now()`, no `Math.random()`) — identical calls yield
 * identical results regardless of order.
 */

import type { Clock } from '../clock';
import type {
  OAuthProvider,
  TokenSet,
  TwoFactorMethod,
  UserProfile,
  WorkspaceContextResult,
  WorkspaceInvitation,
} from '../types';

import { frozenClock } from '../clock';

import { issueTokens, makeId } from './tokens';

/* ------------------------------------------------------------------ *
 * Deterministic fixtures
 * ------------------------------------------------------------------ */

/** Ordinary user — password sign-in, no second factor. */
const USER_STANDARD: UserProfile = {
  id: 'usr_sam',
  email: 'sam@open-tomato.dev',
  name: 'Sam Lin',
  handle: 'sam',
};

/** User with TOTP enabled — password sign-in triggers a 2FA challenge. */
const USER_2FA: UserProfile = {
  id: 'usr_ren',
  email: 'secure@open-tomato.dev',
  name: 'Ren Ohara',
  handle: 'ren',
};

const USERS_BY_EMAIL: Record<string, UserProfile> = {
  [USER_STANDARD.email]: USER_STANDARD,
  [USER_2FA.email]: USER_2FA,
};

/** Existing accounts keyed by OAuth provider (federated identity already linked). */
const OAUTH_EXISTING: Partial<Record<OAuthProvider, UserProfile>> = {
  github: { id: 'usr_kai', email: 'kai@open-tomato.dev', name: 'Kai Mercer', handle: 'kai' },
};

/** Handles already linked to an account — chosen at OAuth completion, they
 *  collide and yield `email_taken`. */
const TAKEN_HANDLES = new Set(['sam', 'ren', 'kai']);

/** Password that deterministically fails, for exercising the error path. */
const WRONG_PASSWORD = 'wrong';
/** The only code the mock TOTP accepts (enroll + challenge). */
const VALID_TOTP_CODE = '123456';
/** Reset codes: one valid, one that reads as expired; all others invalid. */
const VALID_RESET_CODE = '424242';
const EXPIRED_RESET_CODE = '000000';

/** Open invitations for the WorkspacePick "invited" branch (mirrors the
 *  template's visual fixture so the screen and the data agree). */
const INVITATIONS: WorkspaceInvitation[] = [
  {
    id: 'inv_og', workspaceId: 'ws_open_garden', workspaceName: 'open-garden',
    description: 'Main workspace · invited by sam', members: 12, role: 'member',
    invitedBy: 'sam', tone: 'accent',
  },
  {
    id: 'inv_tm', workspaceId: 'ws_tomato_mainline', workspaceName: 'tomato-mainline',
    description: 'Maintainers · invited by ren', members: 6, role: 'admin',
    invitedBy: 'ren', tone: 'primary',
  },
  {
    id: 'inv_sd', workspaceId: 'ws_seed_bank', workspaceName: 'seed-bank',
    description: 'Experiments · invited by kai', members: 3, role: 'viewer',
    invitedBy: 'kai', tone: 'gold',
  },
];

/** Deterministic recovery codes handed back after 2FA enrollment. */
const RECOVERY_CODES = [
  '4F8X-K2QM', '9P3R-LZN7', 'BV6T-W1HD', 'X4M9-QY2L',
  'JC7H-RP8K', 'DT5N-BX3F', 'WK6V-2GL9', 'P9Q4-HMTC',
];

const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

/* ------------------------------------------------------------------ *
 * Result unions (the contract's response shapes)
 * ------------------------------------------------------------------ */

export interface TwoFactorChallenge {
  challengeId: string;
  methods: TwoFactorMethod[];
}

export type SignInResult =
  | { status: 'ok'; tokens: TokenSet }
  | { status: 'two_factor_required'; challenge: TwoFactorChallenge; user: UserProfile }
  | { status: 'invalid_credentials' };

export type OAuthResult =
  | { status: 'ok'; tokens: TokenSet }
  | { status: 'needs_profile'; provider: OAuthProvider; suggested: UserProfile }
  | { status: 'denied'; reason: string };

export type VerifyTwoFactorResult =
  | { status: 'ok'; tokens: TokenSet }
  | { status: 'invalid_code' };

export type SignUpResult =
  | { status: 'ok'; user: UserProfile; tokens: TokenSet }
  | { status: 'email_taken' };

export type RequestResetResult = { status: 'sent'; channel: 'email'; maskedEmail: string };

export type ResetPasswordResult =
  | { status: 'ok'; tokens: TokenSet }
  | { status: 'invalid_code' }
  | { status: 'expired' };

export interface TotpEnrollment {
  secret: string;
  /** otpauth:// URI the QR encodes. */
  otpauthUri: string;
}

export type EnrollTotpVerifyResult =
  | { status: 'ok'; recoveryCodes: string[] }
  | { status: 'invalid_code' };

/** WebAuthn registration options — the shape passed to `navigator.credentials
 *  .create({ publicKey })`. Challenge/user.id are base64url in the real
 *  ceremony; the mock uses stable placeholders. Marked PoC-optional (D5). */
export interface PasskeyRegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  timeout: number;
  attestation: 'none' | 'direct' | 'indirect';
}

export type PasskeyRegisterResult =
  | { status: 'ok'; recoveryCodes: string[] }
  | { status: 'failed'; reason: string };

/* ------------------------------------------------------------------ *
 * Requests
 * ------------------------------------------------------------------ */

export interface EmailSignInRequest { email: string; password: string; remember?: boolean }
export interface EmailSignUpRequest { email: string; username: string; password: string }
export interface OAuthSignInRequest { provider: OAuthProvider; simulate?: 'denied' }
export interface CompleteOAuthRequest { provider: OAuthProvider; username: string; displayName: string }
export interface VerifyTwoFactorRequest { challengeId: string; code: string }
export interface RequestResetRequest { email: string }
export interface ResetPasswordRequest { email: string; code: string; newPassword: string }
export interface EnrollTotpVerifyRequest { code: string }
export interface SelectWorkspaceRequest {
  userId: string;
  /** Present when dropping into an invite; absent for the self-serve default. */
  invitationId?: string;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Stable non-crypto hash → base36, for deterministic ids from inputs. */
const stableHash = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (domain == null || local == null || local.length === 0) return email;
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
};

/** Simulate network latency without a real timer in tests. */
const settle = <T>(value: T): Promise<T> => Promise.resolve(value);

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

/* ------------------------------------------------------------------ *
 * Factory (clock-injectable for tests; default export uses the frozen clock)
 * ------------------------------------------------------------------ */

export const createAuthApi = (clock: Clock = frozenClock) => ({
  signIn: {
    /** Email + password. May escalate to a 2FA challenge. */
    withEmail: ({ email, password }: EmailSignInRequest): Promise<SignInResult> => {
      const user = USERS_BY_EMAIL[email.trim().toLowerCase()];
      if (user == null || password === WRONG_PASSWORD || password.trim() === '') {
        return settle({ status: 'invalid_credentials' });
      }
      if (user.id === USER_2FA.id) {
        return settle({
          status: 'two_factor_required',
          user,
          challenge: {
            challengeId: makeId('chl', stableHash(`${user.id}:signin`)),
            methods: ['totp', 'passkey'],
          },
        });
      }
      return settle({ status: 'ok', tokens: issueForUser(user, ['pwd'], clock) });
    },

    /** Complete a pending 2FA challenge from sign-in. */
    verifyTwoFactor: ({ challengeId, code }: VerifyTwoFactorRequest): Promise<VerifyTwoFactorResult> => {
      void challengeId;
      if (code !== VALID_TOTP_CODE) return settle({ status: 'invalid_code' });
      return settle({ status: 'ok', tokens: issueForUser(USER_2FA, ['pwd', 'otp'], clock) });
    },

    /** Federated sign-in. `github` maps to an existing account (straight in);
       *  `google` is a new identity that must pick a handle (needs_profile).
       *  `simulate:'denied'` models the user rejecting the consent screen. */
    withOAuth: ({ provider, simulate }: OAuthSignInRequest): Promise<OAuthResult> => {
      if (simulate === 'denied') {
        return settle({ status: 'denied', reason: 'The sign-in was cancelled at the provider.' });
      }
      const existing = OAUTH_EXISTING[provider];
      if (existing != null) {
        return settle({ status: 'ok', tokens: issueForUser(existing, [`oauth:${provider}`], clock) });
      }
      return settle({
        status: 'needs_profile',
        provider,
        suggested: {
          id: makeId('usr', stableHash(`${provider}:new`)),
          email: `new-user@${provider}.example`,
          name: provider === 'google'
            ? 'Alex Rivera'
            : 'New User',
          handle: '',
        },
      });
    },
  },

  signUp: {
    /** Email sign-up, step 1. Rejects an address that already has an account. */
    withEmail: ({ email, username, password }: EmailSignUpRequest): Promise<SignUpResult> => {
      void password;
      if (USERS_BY_EMAIL[email.trim().toLowerCase()] != null) {
        return settle({ status: 'email_taken' });
      }
      const user: UserProfile = {
        id: makeId('usr', stableHash(email)), email, name: username, handle: username,
      };
      return settle({ status: 'ok', user, tokens: issueForUser(user, ['pwd'], clock) });
    },

    /**
       * Finish an OAuth sign-up once the user has chosen a handle. A handle
       * already linked to an account returns `email_taken` (the federated
       * identity collides) — so the contract's `email_taken` result is
       * reachable here, not just from `withEmail`.
       */
    completeOAuth: ({ provider, username, displayName }: CompleteOAuthRequest): Promise<SignUpResult> => {
      if (TAKEN_HANDLES.has(username.trim().toLowerCase())) {
        return settle({ status: 'email_taken' });
      }
      const user: UserProfile = {
        id: makeId('usr', stableHash(`${provider}:${username}`)),
        email: `${username}@${provider}.example`,
        name: displayName,
        handle: username,
      };
      return settle({ status: 'ok', user, tokens: issueForUser(user, [`oauth:${provider}`], clock) });
    },
  },

  reset: {
    /** Send a one-time reset code. Always 'sent' (no account enumeration). */
    requestCode: ({ email }: RequestResetRequest): Promise<RequestResetResult> => settle({ status: 'sent', channel: 'email', maskedEmail: maskEmail(email) }),

    /**
       * Verify the code and set a new password in one step. The code is bound
       * to a single account: an unknown email — or a code that wasn't issued
       * for that email — returns `invalid_code` and mints NOTHING. There is no
       * default-user fallback (that would be an account-takeover shape). A real
       * backend looks the code up by (account, code) and rejects any mismatch.
       */
    resetPassword: ({ email, code, newPassword }: ResetPasswordRequest): Promise<ResetPasswordResult> => {
      void newPassword;
      const user = USERS_BY_EMAIL[email.trim().toLowerCase()];
      // No account for this email → the code cannot have been issued for it.
      if (user == null) return settle({ status: 'invalid_code' });
      if (code === EXPIRED_RESET_CODE) return settle({ status: 'expired' });
      if (code !== VALID_RESET_CODE) return settle({ status: 'invalid_code' });
      // Password reset signs the user in and (per the screen) revokes other
      // sessions — the fresh token is minted on `pwd`.
      return settle({ status: 'ok', tokens: issueForUser(user, ['pwd'], clock) });
    },
  },

  twoFactor: {
    /** Begin TOTP enrollment — hand back the secret + otpauth URI to render
       *  as a QR. */
    enrollTotpStart: (): Promise<TotpEnrollment> => settle({
      secret: TOTP_SECRET,
      otpauthUri: `otpauth://totp/Open%20Tomato:${USER_STANDARD.email}?secret=${TOTP_SECRET}&issuer=Open%20Tomato`,
    }),

    /** Verify the first TOTP code to finish enrollment. */
    enrollTotpVerify: ({ code }: EnrollTotpVerifyRequest): Promise<EnrollTotpVerifyResult> => {
      if (code !== VALID_TOTP_CODE) return settle({ status: 'invalid_code' });
      return settle({ status: 'ok', recoveryCodes: RECOVERY_CODES });
    },

    /** WebAuthn registration options for the passkey ceremony (D5,
       *  PoC-optional for the backend). The client passes these to
       *  `navigator.credentials.create({ publicKey })`. */
    enrollPasskeyStart: (): Promise<PasskeyRegistrationOptions> => settle({
      challenge: 'bW9jay1jaGFsbGVuZ2U',
      rp: { name: 'Open Tomato', id: 'open-tomato.dev' },
      user: { id: 'dXNyX3NhbQ', name: USER_STANDARD.email, displayName: USER_STANDARD.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      timeout: 60000,
      attestation: 'none',
    }),

    /** Finish passkey registration. Backend verification is mocked — any
       *  credential the browser returns is accepted (D5). */
    enrollPasskeyFinish: (credential: unknown): Promise<PasskeyRegisterResult> => {
      if (credential == null) return settle({ status: 'failed', reason: 'No credential returned by the browser.' });
      return settle({ status: 'ok', recoveryCodes: RECOVERY_CODES });
    },
  },
});

export type AuthApi = ReturnType<typeof createAuthApi>;

/** Default instance every screen imports — frozen clock, deterministic. */
export const authApi: AuthApi = createAuthApi();

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

/** Test/fixture constants, exported so specs assert against the same source. */
export const AUTH_FIXTURES = {
  USER_STANDARD,
  USER_2FA,
  OAUTH_EXISTING,
  INVITATIONS,
  RECOVERY_CODES,
  TOTP_SECRET,
  WRONG_PASSWORD,
  VALID_TOTP_CODE,
  VALID_RESET_CODE,
  EXPIRED_RESET_CODE,
} as const;
