/**
 * Session persistence + redirect-back-to-webapp.
 *
 * On a terminal success the auth app hands the minted token set to the webapp
 * and sends the browser there. Where the webapp lives is env-driven
 * (`VITE_WEBAPP_URL`) so the same build runs standalone in any environment
 * (WS12 prebuilt image). An optional `?redirect=` param lets the webapp ask to
 * return to a specific deep link — but it is validated against the configured
 * origin so it can never become an open redirect.
 */

import type { TokenSet } from './types';

const STORAGE_KEY = 'open-tomato.auth.session';

/** Configured webapp origin — the only host we will ever redirect to. */
export const webappUrl = (): string => import.meta.env.VITE_WEBAPP_URL ?? 'http://localhost:5173';

/** Persist the token set for the webapp to pick up (mock hand-off; a real
 *  deployment would set an httpOnly cookie server-side instead). */
export const persistSession = (tokens: TokenSet): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Storage can be unavailable (private mode, SSR). The redirect still
    // carries enough for the webapp to re-auth; persistence is best-effort.
  }
};

export const readSession = (): TokenSet | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw == null
      ? null
      : (JSON.parse(raw) as TokenSet);
  } catch {
    return null;
  }
};

/**
 * Resolve the safe post-auth destination from the current query string. A
 * `redirect` param is honored ONLY when it resolves to the configured webapp
 * origin; anything else (other host, malformed) falls back to the webapp root.
 */
export const resolveRedirectTarget = (search: string): string => {
  const base = webappUrl();
  const requested = new URLSearchParams(search).get('redirect');
  if (requested == null || requested === '') return base;
  try {
    const url = new URL(requested, base);
    if (url.origin === new URL(base).origin) return url.toString();
  } catch {
    // fall through to base
  }
  return base;
};

export type Redirector = (url: string) => void;

const defaultRedirector: Redirector = (url) => {
  window.location.assign(url);
};

/**
 * Terminal hand-off: persist the session and send the browser to the webapp.
 * The redirector is injectable so flows and tests can observe the target
 * without a real navigation.
 */
export const completeSignIn = (
  tokens: TokenSet,
  search: string,
  redirect: Redirector = defaultRedirector,
): string => {
  persistSession(tokens);
  const target = resolveRedirectTarget(search);
  redirect(target);
  return target;
};

/**
 * Send the browser to the webapp WITHOUT minting a new session — used by
 * post-login flows (2FA enrollment) that already hold a session and just need
 * to hand back to the app once they finish.
 */
export const goToWebapp = (
  search: string,
  redirect: Redirector = defaultRedirector,
): string => {
  const target = resolveRedirectTarget(search);
  redirect(target);
  return target;
};
