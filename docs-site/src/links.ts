/**
 * Outbound destinations for the docs site. Overridable at build time via
 * `VITE_*` env vars so WS12 can point them at the deployed origins per
 * environment without a code change.
 */
const env = import.meta.env;

export const links = {
  /** Marketing homepage (WS10). */
  home: env.VITE_HOME_URL ?? 'https://opentomato.io',
  /** Sign-in / dashboard — the auth app (WS08). */
  auth: env.VITE_AUTH_URL ?? 'https://auth.opentomato.io',
  /** Source repository. */
  github: env.VITE_GITHUB_URL ?? 'https://github.com/open-tomato/open-tomato',
} as const;
