import { describe, expect, it } from 'vitest';

import {
  buildAuthorizationUrl,
  codeChallengeS256,
  generateCodeVerifier,
  generateNonce,
  generateState,
  identityFromClaims,
} from '../oidc.js';
import { loadOAuthProviders } from '../providers.js';

const CONFIG = {
  provider: 'google' as const,
  clientId: 'client-123.apps',
  clientSecret: 'secret',
  redirectUri: 'https://auth.example/sign-in/oauth/google/callback',
  authorizationEndpoint: 'https://accounts.google.test/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.google.test/token',
  issuer: 'https://accounts.google.test',
  jwksUri: 'https://jwks.google.test/certs',
  scopes: ['openid', 'email', 'profile'],
};

describe('PKCE + state/nonce', () => {
  it('produces an RFC 7636 verifier and the matching S256 challenge (known vector)', () => {
    // RFC 7636 Appendix B test vector.
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))
      .toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');

    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it('state and nonce are unguessable and unique per call', () => {
    expect(generateState()).toMatch(/^st_[A-Za-z0-9_-]+$/);
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe('buildAuthorizationUrl', () => {
  it('carries client_id, redirect_uri, S256 PKCE, state, nonce, and scopes', () => {
    const url = new URL(buildAuthorizationUrl(CONFIG, {
      state: 'st_abc', nonce: 'nonce-1', codeChallenge: 'chal-1',
    }));

    expect(url.origin + url.pathname).toBe('https://accounts.google.test/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-123.apps');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('st_abc');
    expect(url.searchParams.get('nonce')).toBe('nonce-1');
    expect(url.searchParams.get('code_challenge')).toBe('chal-1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });
});

describe('identityFromClaims', () => {
  const base = { sub: 'google-sub-1', email: 'Alex@Gmail.com', name: 'Alex Rivera', email_verified: true, nonce: 'n1' };

  it('maps verified claims, lowercasing the email', () => {
    const id = identityFromClaims('google', base, 'n1');
    expect(id).toEqual({
      provider: 'google', providerUid: 'google-sub-1', email: 'alex@gmail.com',
      name: 'Alex Rivera', emailVerified: true,
    });
  });

  it('rejects a nonce mismatch (replay guard)', () => {
    expect(identityFromClaims('google', base, 'different-nonce')).toBeNull();
  });

  it('rejects missing sub or email', () => {
    expect(identityFromClaims('google', { ...base, sub: undefined }, 'n1')).toBeNull();
    expect(identityFromClaims('google', { ...base, email: undefined }, 'n1')).toBeNull();
  });

  it('rejects an unverified email (email_verified !== true)', () => {
    expect(identityFromClaims('google', { ...base, email_verified: false }, 'n1')).toBeNull();
    expect(identityFromClaims('google', { ...base, email_verified: undefined }, 'n1')).toBeNull();
  });

  it('falls back to email for a missing name', () => {
    const id = identityFromClaims('google', { ...base, name: undefined }, 'n1');
    expect(id?.name).toBe('alex@gmail.com');
  });
});

describe('loadOAuthProviders', () => {
  it('configures google from env and derives the callback URL', () => {
    const reg = loadOAuthProviders(
      { OAUTH_GOOGLE_CLIENT_ID: 'cid', OAUTH_GOOGLE_CLIENT_SECRET: 'csec' },
      'https://auth.example',
    );
    const google = reg.get('google');
    expect(google?.clientId).toBe('cid');
    expect(google?.redirectUri).toBe('https://auth.example/sign-in/oauth/google/callback');
    expect(google?.issuer).toBe('https://accounts.google.com');
  });

  it('honors endpoint overrides (so tests can point at a mock)', () => {
    const reg = loadOAuthProviders(
      { OAUTH_GOOGLE_CLIENT_ID: 'cid', OAUTH_GOOGLE_CLIENT_SECRET: 'csec', OAUTH_GOOGLE_TOKEN_URL: 'https://mock/token' },
      'https://auth.example',
    );
    expect(reg.get('google')?.tokenEndpoint).toBe('https://mock/token');
  });

  it('leaves google unconfigured without credentials, and github always unconfigured', () => {
    const reg = loadOAuthProviders({ OAUTH_GOOGLE_CLIENT_ID: 'cid' }, 'https://auth.example'); // no secret
    expect(reg.get('google')).toBeNull();
    expect(loadOAuthProviders({ OAUTH_GOOGLE_CLIENT_ID: 'c', OAUTH_GOOGLE_CLIENT_SECRET: 's' }, 'https://auth.example').get('github')).toBeNull();
  });
});
