import type { ChallengeRecord } from '../../store/challenges.js';
import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer } from '../../tokens/issuer.js';

// Persistence + the second-factor verifier are mocked; the token issuer is real
// so we assert the emitted JWT shape (amr) end-to-end.
vi.mock('../../store/challenges.js', () => ({
  createSignInChallenge: vi.fn(),
  getSignInChallenge: vi.fn(),
  consumeSignInChallenge: vi.fn(),
}));
vi.mock('../../auth/second-factor.js', () => ({ verifySecondFactor: vi.fn() }));
vi.mock('../../store/users.js', () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  hasConfirmedTotp: vi.fn(),
  normalizeEmail: (email: string): string => email.trim().toLowerCase(),
}));
vi.mock('../../store/credentials.js', () => ({ getCredentialByUserId: vi.fn() }));
vi.mock('../../auth/password.js', () => ({
  verifyPassword: vi.fn(),
  getDecoyHash: vi.fn().mockResolvedValue('$argon2id$decoy'),
}));
vi.mock('../../store/sessions.js', () => ({
  createSession: vi.fn(),
  getSessionByRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

const { getSignInChallenge, consumeSignInChallenge } = await import('../../store/challenges.js');
const { verifySecondFactor } = await import('../../auth/second-factor.js');
const { getUserById } = await import('../../store/users.js');
const { createSession } = await import('../../store/sessions.js');
const { signInRouter } = await import('../sign-in.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const REN = { id: 'usr_ren', email: 'secure@open-tomato.dev', name: 'Ren Ohara' };
const CHALLENGE: ChallengeRecord = { challengeId: 'chl_1', userId: REN.id, methods: ['totp'] };

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer: createTokenIssuer('test-secret'),
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/sign-in', signInRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(getSignInChallenge).mockReset();
  vi.mocked(consumeSignInChallenge).mockReset();
  vi.mocked(verifySecondFactor).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(createSession).mockReset();
  app = buildApp();
});

describe('POST /sign-in/2fa', () => {
  it('mints a pwd+otp token set and consumes the challenge on a valid code', async () => {
    vi.mocked(getSignInChallenge).mockResolvedValue({ ...CHALLENGE });
    vi.mocked(verifySecondFactor).mockResolvedValue(true);
    vi.mocked(consumeSignInChallenge).mockResolvedValue(true); // won the single-use gate
    vi.mocked(getUserById).mockResolvedValue(REN);
    vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });

    const res = await request(app).post('/sign-in/2fa')
      .send({ challengeId: 'chl_1', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.claims.amr).toEqual(['pwd', 'otp']);
    expect(res.body.tokens.claims.sub).toBe(REN.id);
    expect(vi.mocked(verifySecondFactor)).toHaveBeenCalledWith(expect.anything(), REN.id, '123456');
    expect(vi.mocked(consumeSignInChallenge)).toHaveBeenCalledWith(expect.anything(), 'chl_1');
  });

  it('returns invalid_code (200) for an unknown/expired challenge without verifying a code', async () => {
    vi.mocked(getSignInChallenge).mockResolvedValue(null);

    const res = await request(app).post('/sign-in/2fa')
      .send({ challengeId: 'chl_gone', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(verifySecondFactor)).not.toHaveBeenCalled();
  });

  it('returns invalid_code and does NOT consume the challenge on a wrong code (retry allowed)', async () => {
    vi.mocked(getSignInChallenge).mockResolvedValue({ ...CHALLENGE });
    vi.mocked(verifySecondFactor).mockResolvedValue(false);

    const res = await request(app).post('/sign-in/2fa')
      .send({ challengeId: 'chl_1', code: '000000' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(consumeSignInChallenge)).not.toHaveBeenCalled();
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it('mints nothing when the single-use gate is lost to a concurrent request', async () => {
    vi.mocked(getSignInChallenge).mockResolvedValue({ ...CHALLENGE });
    vi.mocked(verifySecondFactor).mockResolvedValue(true);
    vi.mocked(consumeSignInChallenge).mockResolvedValue(false); // a concurrent request already consumed it

    const res = await request(app).post('/sign-in/2fa')
      .send({ challengeId: 'chl_1', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it('returns 422 when a required field is missing', async () => {
    const res = await request(app).post('/sign-in/2fa')
      .send({ challengeId: 'chl_1' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
