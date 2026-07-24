import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer } from '../../tokens/issuer.js';

vi.mock('../../store/users.js', () => ({
  createUser: vi.fn(),
  normalizeEmail: (email: string): string => email.trim().toLowerCase(),
}));
vi.mock('../../store/credentials.js', () => ({ setPassword: vi.fn() }));
vi.mock('../../auth/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$hashed'),
}));
vi.mock('../../store/sessions.js', () => ({ createSession: vi.fn() }));

const { createUser } = await import('../../store/users.js');
const { setPassword } = await import('../../store/credentials.js');
const { createSession } = await import('../../store/sessions.js');
const { signUpRouter } = await import('../sign-up.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer: createTokenIssuer('test-secret'),
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/sign-up', signUpRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(createUser).mockReset();
  vi.mocked(setPassword).mockReset();
  vi.mocked(createSession).mockReset();
  app = buildApp();
});

describe('POST /sign-up/email', () => {
  it('creates the account, sets the password, and signs in', async () => {
    vi.mocked(createUser).mockResolvedValue({ id: 'usr_new', email: 'pat@open-tomato.dev', name: 'pat' });
    vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });

    const res = await request(app)
      .post('/sign-up/email')
      .send({ email: 'pat@open-tomato.dev', username: 'pat', password: 'a-strong-password' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.user).toEqual({
      id: 'usr_new', email: 'pat@open-tomato.dev', name: 'pat', handle: 'pat',
    });
    expect(res.body.tokens.claims.amr).toEqual(['pwd']);
    expect(vi.mocked(setPassword)).toHaveBeenCalledWith(expect.anything(), 'usr_new', '$argon2id$hashed');
  });

  it('returns email_taken (200) when the email already exists, minting nothing', async () => {
    vi.mocked(createUser).mockResolvedValue(null);

    const res = await request(app)
      .post('/sign-up/email')
      .send({ email: 'sam@open-tomato.dev', username: 'sam2', password: 'a-strong-password' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'email_taken' });
    expect(vi.mocked(setPassword)).not.toHaveBeenCalled();
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it('returns 422 for a malformed email or missing field', async () => {
    const bad = await request(app).post('/sign-up/email')
      .send({ email: 'not-an-email', username: 'x', password: 'y' });
    expect(bad.status).toBe(422);

    const missing = await request(app).post('/sign-up/email')
      .send({ email: 'a@b.com', username: 'x' });
    expect(missing.status).toBe(422);
  });

  it('returns 422 for a too-short password', async () => {
    const res = await request(app).post('/sign-up/email')
      .send({ email: 'pat@open-tomato.dev', username: 'pat', password: 'short' });
    expect(res.status).toBe(422);
    expect(vi.mocked(createUser)).not.toHaveBeenCalled();
  });
});
