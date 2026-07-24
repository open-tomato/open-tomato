import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer } from '../../tokens/issuer.js';

// ---------------------------------------------------------------------------
// Mock every persistence module — no live Postgres or Redis. The token issuer
// stays real so we assert the emitted JWT shape end-to-end.
// ---------------------------------------------------------------------------

vi.mock('../../store/users.js', () => ({
  getUserByEmail: vi.fn(),
  hasConfirmedTotp: vi.fn(),
  normalizeEmail: (email: string): string => email.trim().toLowerCase(),
}));
vi.mock('../../store/credentials.js', () => ({
  getCredentialByUserId: vi.fn(),
}));
vi.mock('../../store/challenges.js', () => ({
  createSignInChallenge: vi.fn(),
}));
vi.mock('../../auth/password.js', () => ({
  verifyPassword: vi.fn(),
  getDecoyHash: vi.fn().mockResolvedValue('$argon2id$v=19$decoy'),
  PASSWORD_ALGO: 'argon2id',
}));
vi.mock('../../store/sessions.js', () => ({
  createSession: vi.fn(),
  getSessionByRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

const { getUserByEmail, hasConfirmedTotp } = await import('../../store/users.js');
const { getCredentialByUserId } = await import('../../store/credentials.js');
const { createSignInChallenge } = await import('../../store/challenges.js');
const { verifyPassword } = await import('../../auth/password.js');
const { createSession } = await import('../../store/sessions.js');
const { signInRouter } = await import('../sign-in.js');

// ---------------------------------------------------------------------------
// App under test
// ---------------------------------------------------------------------------

const testLogger = { warn: (): void => {}, error: (): void => {} };

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer: createTokenIssuer('test-secret'),
  };
  const app = express();
  app.use(express.json());
  app.use('/sign-in', signInRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

const SAM = { id: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin' };
const REN = { id: 'usr_ren', email: 'secure@open-tomato.dev', name: 'Ren Ohara' };
const CREDENTIAL = { userId: SAM.id, passwordHash: '$argon2id$stub', algo: 'argon2id' as const };

let app: express.Express;

beforeEach(() => {
  vi.mocked(getUserByEmail).mockReset();
  vi.mocked(hasConfirmedTotp).mockReset();
  vi.mocked(getCredentialByUserId).mockReset();
  vi.mocked(createSignInChallenge).mockReset();
  vi.mocked(verifyPassword).mockReset();
  vi.mocked(createSession).mockReset();
  app = buildApp();
});

describe('POST /sign-in/email', () => {
  it('returns ok + a pwd token set for a valid password-only sign-in', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(getCredentialByUserId).mockResolvedValue(CREDENTIAL);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(hasConfirmedTotp).mockResolvedValue(false);
    vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: SAM.email, password: 'tomato-dev-password' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.tokenType).toBe('Bearer');
    expect(res.body.tokens.expiresIn).toBe(900);
    expect(res.body.tokens.refreshToken).toBe('rt_seed');
    expect(res.body.tokens.accessToken.split('.')).toHaveLength(3);
    expect(res.body.tokens.claims.amr).toEqual(['pwd']);
    expect(res.body.tokens.claims.sub).toBe(SAM.id);
  });

  it('returns two_factor_required for an account with a confirmed TOTP secret', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(REN);
    vi.mocked(getCredentialByUserId).mockResolvedValue({ ...CREDENTIAL, userId: REN.id });
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(hasConfirmedTotp).mockResolvedValue(true);
    vi.mocked(createSignInChallenge).mockResolvedValue({
      challengeId: 'chl_1', userId: REN.id, methods: ['totp'],
    });

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: REN.email, password: 'tomato-dev-password' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('two_factor_required');
    expect(res.body.challenge.challengeId).toBe('chl_1');
    expect(res.body.challenge.methods).toEqual(['totp']);
    expect(res.body.user.id).toBe(REN.id);
    expect(res.body.user.handle).toBe('secure');
    // No token set is minted before the second factor is proven.
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it('returns invalid_credentials (401) for an unknown email — no enumeration', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: 'nobody@open-tomato.dev', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'invalid_credentials' });
  });

  it('returns invalid_credentials (401) for a wrong password — indistinguishable from unknown email', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(getCredentialByUserId).mockResolvedValue(CREDENTIAL);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: SAM.email, password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'invalid_credentials' });
  });

  it('returns invalid_credentials (401) when the account has no password credential', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(getCredentialByUserId).mockResolvedValue(null);

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: SAM.email, password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'invalid_credentials' });
  });

  it('returns invalid_credentials (401) for an empty password', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(getCredentialByUserId).mockResolvedValue(CREDENTIAL);

    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: SAM.email, password: '   ' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: 'invalid_credentials' });
  });

  it('returns 422 when a required field is missing', async () => {
    const res = await request(app)
      .post('/sign-in/email')
      .send({ email: SAM.email });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
