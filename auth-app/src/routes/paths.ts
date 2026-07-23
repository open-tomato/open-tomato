import type { OAuthProvider } from '../auth';

/**
 * Route table for the standalone auth gateway. Each flow has an entry URL;
 * multi-step flows advance in place (internal state), so the entry URL is the
 * deep-link target. Reset also exposes `/reset` as the emailed deep-link
 * landing for code entry.
 */
export const PATHS = {
  login: '/login',
  signup: '/signup',
  signupOAuth: '/signup/oauth/:provider',
  signupDone: '/signup/done',
  workspace: '/workspace',
  forgot: '/forgot',
  reset: '/reset',
  twoFactor: '/2fa',
} as const;

export const oauthConfirmPath = (provider: OAuthProvider): string => `/signup/oauth/${provider}`;

/** react-router `location.state` carried between flow routes (in-memory only —
 *  never tokens in the URL). */
export interface FlowNavState {
  userId?: string;
  intent?: 'signin' | 'signup';
  kind?: 'invited' | 'fresh';
  email?: string;
}
