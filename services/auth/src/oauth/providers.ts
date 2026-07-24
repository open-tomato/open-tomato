/**
 * OAuth/OIDC provider configuration — provider-agnostic, env-driven, Google as
 * the default (decision D-OAUTH). Endpoints default to Google's but every one
 * is overridable, so tests point the token/JWKS endpoints at a local mock and
 * real Google is a matter of setting `OAUTH_GOOGLE_CLIENT_ID/SECRET`.
 *
 * A provider with no client id/secret is **unconfigured** → the routes answer
 * `501` (this is how `github` stays deferred, per D-OAUTH).
 */
import type { OAuthProvider } from '../tokens/types.js';

export interface OidcProviderConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  /** Absolute callback URL registered with the provider. */
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  /** Expected `iss` on the id_token. */
  issuer: string;
  jwksUri: string;
  scopes: string[];
}

type Env = Record<string, string | undefined>;

const GOOGLE_DEFAULTS = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  issuer: 'https://accounts.google.com',
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  scopes: ['openid', 'email', 'profile'],
};

/** The callback path a provider redirects back to (mounted under `/sign-in`). */
export const callbackPath = (provider: OAuthProvider): string => `/sign-in/oauth/${provider}/callback`;

function loadGoogle(env: Env, publicBaseUrl: string): OidcProviderConfig | null {
  const clientId = env['OAUTH_GOOGLE_CLIENT_ID'];
  const clientSecret = env['OAUTH_GOOGLE_CLIENT_SECRET'];
  if (clientId == null || clientId === '' || clientSecret == null || clientSecret === '') return null;

  return {
    provider: 'google',
    clientId,
    clientSecret,
    redirectUri: `${publicBaseUrl}${callbackPath('google')}`,
    authorizationEndpoint: env['OAUTH_GOOGLE_AUTH_URL'] ?? GOOGLE_DEFAULTS.authorizationEndpoint,
    tokenEndpoint: env['OAUTH_GOOGLE_TOKEN_URL'] ?? GOOGLE_DEFAULTS.tokenEndpoint,
    issuer: env['OAUTH_GOOGLE_ISSUER'] ?? GOOGLE_DEFAULTS.issuer,
    jwksUri: env['OAUTH_GOOGLE_JWKS_URI'] ?? GOOGLE_DEFAULTS.jwksUri,
    scopes: GOOGLE_DEFAULTS.scopes,
  };
}

/** A registry resolving a provider to its config, or `null` when unconfigured. */
export interface OAuthProviderRegistry {
  get(provider: string): OidcProviderConfig | null;
}

/**
 * Build the provider registry from env + this service's public base URL (used
 * to derive the callback URL). Only `google` is wired; every other provider is
 * unconfigured (→ 501).
 */
export function loadOAuthProviders(env: Env, publicBaseUrl: string): OAuthProviderRegistry {
  const google = loadGoogle(env, publicBaseUrl);
  return {
    get(provider: string): OidcProviderConfig | null {
      return provider === 'google'
        ? google
        : null;
    },
  };
}
