/**
 * Outbound destinations for the marketing homepage (WS10 milestone 3).
 *
 * These are the only links that leave the page: the product itself (auth /
 * dashboard), the docs site (WS11), and the community/funding channels. All
 * are overridable at build time via `VITE_*` env vars so WS12 can point them
 * at the deployed origins per environment without a code change.
 */
const env = import.meta.env;

export const links = {
  /** Sign-in / dashboard — the auth app (WS08). */
  auth: env.VITE_AUTH_URL ?? 'https://auth.opentomato.io',
  /** Documentation + API reference site (WS11). */
  docs: env.VITE_DOCS_URL ?? 'https://docs.opentomato.io',
  /** Source repository. */
  github: env.VITE_GITHUB_URL ?? 'https://github.com/open-tomato/open-tomato',
  /** Funding. */
  patreon: env.VITE_PATREON_URL ?? 'https://www.patreon.com/opentomato',
  /** Community chat. */
  discord: env.VITE_DISCORD_URL ?? 'https://discord.gg/opentomato',
} as const;
