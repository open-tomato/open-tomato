import type { FederatedIdentity } from '../../oauth/oidc.js';
import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFederationSigner, PENDING_FED_COOKIE } from '../../oauth/pending-federation.js';
import { loadOAuthProviders } from '../../oauth/providers.js';
import { createTokenIssuer } from '../../tokens/issuer.js';

// Mock ONLY the network exchange; the pure OIDC helpers (URL/PKCE/state) stay real.
vi.mock('../../oauth/oidc.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../oauth/oidc.js')>()),
  exchangeCodeForIdentity: vi.fn(),
}));
vi.mock('../../store/oauth-state.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../store/oauth-state.js')>()),
  putOAuthState: vi.fn(),
  consumeOAuthState: vi.fn(),
}));
vi.mock('../../store/oauth-accounts.js', () => ({
  getOAuthAccountUserId: vi.fn(),
  linkOAuthAccount: vi.fn(),
}));
vi.mock('../../store/users.js', () => ({
  getUserById: vi.fn(),
  createUser: vi.fn(),
  normalizeEmail: (e: string): string => e.trim().toLowerCase(),
}));
vi.mock('../../store/sessions.js', () => ({ createSession: vi.fn() }));

const { exchangeCodeForIdentity } = await import('../../oauth/oidc.js');
const { putOAuthState, consumeOAuthState } = await import('../../store/oauth-state.js');
const { getOAuthAccountUserId, linkOAuthAccount } = await import('../../store/oauth-accounts.js');
const { getUserById, createUser } = await import('../../store/users.js');
const { createSession } = await import('../../store/sessions.js');
const { oauthRouter } = await import('../oauth.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const issuer = createTokenIssuer('test-secret');
const federation = createFederationSigner('test-secret');
const providers = loadOAuthProviders(
  { OAUTH_GOOGLE_CLIENT_ID: 'cid', OAUTH_GOOGLE_CLIENT_SECRET: 'sec' },
  'https://auth.test',
);

const IDENTITY: FederatedIdentity = {
  provider: 'google', providerUid: 'google-sub-1', email: 'alex@gmail.com', name: 'Alex Rivera', emailVerified: true,
};

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer,
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/', oauthRouter(deps, { providers, federation, secureCookies: false }));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(exchangeCodeForIdentity).mockReset();
  vi.mocked(putOAuthState).mockReset();
  vi.mocked(consumeOAuthState).mockReset();
  vi.mocked(getOAuthAccountUserId).mockReset();
  vi.mocked(linkOAuthAccount).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(createUser).mockReset();
  vi.mocked(createSession).mockReset();
  vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });
  app = buildApp();
});

describe('GET /sign-in/oauth/:provider (initiate)', () => {
  it('redirects to Google with PKCE + state and stashes the flow', async () => {
    const res = await request(app).get('/sign-in/oauth/google');

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location!);
    expect(location.searchParams.get('client_id')).toBe('cid');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('state')).toMatch(/^st_/);
    expect(vi.mocked(putOAuthState)).toHaveBeenCalledOnce();
  });

  it('returns 501 for an unconfigured provider (github)', async () => {
    const res = await request(app).get('/sign-in/oauth/github');
    expect(res.status).toBe(501);
  });
});

describe('GET /sign-in/oauth/:provider/callback', () => {
  const flow = { provider: 'google' as const, nonce: 'n1', codeVerifier: 'v1' };

  it('signs in an already-linked identity (amr oauth:google)', async () => {
    vi.mocked(consumeOAuthState).mockResolvedValue(flow);
    vi.mocked(exchangeCodeForIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getOAuthAccountUserId).mockResolvedValue('usr_alex');
    vi.mocked(getUserById).mockResolvedValue({ id: 'usr_alex', email: IDENTITY.email, name: IDENTITY.name });

    const res = await request(app).get('/sign-in/oauth/google/callback?code=abc&state=st_1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.claims.amr).toEqual(['oauth:google']);
  });

  it('returns needs_profile + a pending-federation cookie for a new identity', async () => {
    vi.mocked(consumeOAuthState).mockResolvedValue(flow);
    vi.mocked(exchangeCodeForIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getOAuthAccountUserId).mockResolvedValue(null);

    const res = await request(app).get('/sign-in/oauth/google/callback?code=abc&state=st_1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('needs_profile');
    expect(res.body.suggested).toMatchObject({ email: 'alex@gmail.com', name: 'Alex Rivera', handle: '' });
    const setCookie = String(res.headers['set-cookie'] ?? '');
    expect(setCookie).toContain(`${PENDING_FED_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('returns denied when the user refused consent at the provider', async () => {
    const res = await request(app).get('/sign-in/oauth/google/callback?error=access_denied&state=st_1');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('denied');
    expect(vi.mocked(consumeOAuthState)).not.toHaveBeenCalled();
  });

  it('rejects an invalid/expired state (CSRF guard) with 400', async () => {
    vi.mocked(consumeOAuthState).mockResolvedValue(null);
    const res = await request(app).get('/sign-in/oauth/google/callback?code=abc&state=st_forged');
    expect(res.status).toBe(400);
    expect(vi.mocked(exchangeCodeForIdentity)).not.toHaveBeenCalled();
  });

  it('returns denied when the code+PKCE exchange cannot be verified', async () => {
    vi.mocked(consumeOAuthState).mockResolvedValue(flow);
    vi.mocked(exchangeCodeForIdentity).mockResolvedValue(null);
    const res = await request(app).get('/sign-in/oauth/google/callback?code=abc&state=st_1');
    expect(res.body).toEqual({ status: 'denied', reason: 'Could not verify the sign-in.' });
  });

  it('returns denied for an unverified provider email (defense in depth)', async () => {
    vi.mocked(consumeOAuthState).mockResolvedValue(flow);
    vi.mocked(exchangeCodeForIdentity).mockResolvedValue({ ...IDENTITY, emailVerified: false });
    const res = await request(app).get('/sign-in/oauth/google/callback?code=abc&state=st_1');
    expect(res.body.status).toBe('denied');
    expect(vi.mocked(getOAuthAccountUserId)).not.toHaveBeenCalled();
  });
});

describe('POST /sign-up/oauth/:provider/complete', () => {
  async function pendingCookie(identity: FederatedIdentity = IDENTITY): Promise<string> {
    return `${PENDING_FED_COOKIE}=${await federation.sign(identity)}`;
  }

  it('provisions the account from the cookie identity + chosen handle', async () => {
    vi.mocked(getOAuthAccountUserId).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: 'usr_new', email: IDENTITY.email, name: 'Alex R' });
    vi.mocked(linkOAuthAccount).mockResolvedValue(true);

    const res = await request(app)
      .post('/sign-up/oauth/google/complete')
      .set('Cookie', await pendingCookie())
      .send({ provider: 'google', username: 'alexr', displayName: 'Alex R' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.user).toMatchObject({ id: 'usr_new', email: IDENTITY.email, handle: 'alexr' });
    expect(res.body.tokens.claims.amr).toEqual(['oauth:google']);
    expect(vi.mocked(linkOAuthAccount)).toHaveBeenCalledWith(expect.anything(), {
      userId: 'usr_new', provider: 'google', providerUid: 'google-sub-1',
    });
  });

  it('rejects a request with no pending-federation cookie (400) — never trusts the body', async () => {
    const res = await request(app)
      .post('/sign-up/oauth/google/complete')
      .send({ provider: 'google', username: 'alexr', displayName: 'Alex R' });
    expect(res.status).toBe(400);
    expect(vi.mocked(createUser)).not.toHaveBeenCalled();
  });

  it('returns email_taken when the identity is already linked', async () => {
    vi.mocked(getOAuthAccountUserId).mockResolvedValue('usr_existing');
    const res = await request(app)
      .post('/sign-up/oauth/google/complete')
      .set('Cookie', await pendingCookie())
      .send({ username: 'alexr', displayName: 'Alex R' });
    expect(res.body).toEqual({ status: 'email_taken' });
    expect(vi.mocked(createUser)).not.toHaveBeenCalled();
  });

  it('returns email_taken when the email already has an account', async () => {
    vi.mocked(getOAuthAccountUserId).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue(null);
    const res = await request(app)
      .post('/sign-up/oauth/google/complete')
      .set('Cookie', await pendingCookie())
      .send({ username: 'alexr', displayName: 'Alex R' });
    expect(res.body).toEqual({ status: 'email_taken' });
  });
});
