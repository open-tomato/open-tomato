import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer } from '../../tokens/issuer.js';

vi.mock('../../store/users.js', () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  normalizeEmail: (email: string): string => email.trim().toLowerCase(),
}));
vi.mock('../../store/reset-codes.js', () => ({
  createResetCode: vi.fn(),
  consumeResetCode: vi.fn(),
}));
vi.mock('../../store/credentials.js', () => ({ setPassword: vi.fn() }));
vi.mock('../../store/sessions.js', () => ({
  createSession: vi.fn(),
  revokeUserSessions: vi.fn(),
}));
vi.mock('../../auth/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$hashed'),
  verifyPassword: vi.fn().mockResolvedValue(false),
  getDecoyHash: vi.fn().mockResolvedValue('$argon2id$decoy'),
}));

const { getUserByEmail } = await import('../../store/users.js');
const { createResetCode, consumeResetCode } = await import('../../store/reset-codes.js');
const { setPassword } = await import('../../store/credentials.js');
const { createSession, revokeUserSessions } = await import('../../store/sessions.js');
const { hashPassword, verifyPassword } = await import('../../auth/password.js');
const { resetRouter } = await import('../reset.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const SAM = { id: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin' };

let sendPasswordResetCode: ReturnType<typeof vi.fn>;

function buildApp(): express.Express {
  sendPasswordResetCode = vi.fn();
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer: createTokenIssuer('test-secret'),
    mail: { sendPasswordResetCode },
  };
  const app = express();
  app.use(express.json());
  app.use('/reset', resetRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(getUserByEmail).mockReset();
  vi.mocked(createResetCode).mockReset();
  vi.mocked(consumeResetCode).mockReset();
  vi.mocked(setPassword).mockReset();
  vi.mocked(createSession).mockReset();
  vi.mocked(revokeUserSessions).mockReset();
  vi.mocked(hashPassword).mockClear();
  vi.mocked(verifyPassword).mockClear();
  app = buildApp();
});

describe('POST /reset/request', () => {
  it('mints + mails a code for a known email and returns sent', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(createResetCode).mockResolvedValue({ code: '424242', expiresInMinutes: 15 });

    const res = await request(app).post('/reset/request')
      .send({ email: SAM.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'sent', channel: 'email', maskedEmail: 's••@open-tomato.dev' });
    expect(vi.mocked(createResetCode)).toHaveBeenCalledWith(expect.anything(), SAM.id);
    expect(sendPasswordResetCode).toHaveBeenCalledWith({
      to: SAM.email,
      code: '424242',
      expiresInMinutes: 15,
    });
  });

  it('returns the same sent shape for an unknown email — no code, no mail, decoy hash (no enumeration)', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const res = await request(app).post('/reset/request')
      .send({ email: 'nobody@open-tomato.dev' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sent');
    expect(vi.mocked(createResetCode)).not.toHaveBeenCalled();
    expect(sendPasswordResetCode).not.toHaveBeenCalled();
    // Timing-equalizing decoy hash still runs so latency doesn't leak existence.
    expect(vi.mocked(hashPassword)).toHaveBeenCalledTimes(1);
  });
});

describe('POST /reset/confirm', () => {
  it('sets the password, revokes sessions, and signs in on a valid code', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(consumeResetCode).mockResolvedValue('ok');
    vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });

    const res = await request(app)
      .post('/reset/confirm')
      .send({ email: SAM.email, code: '424242', newPassword: 'a-new-strong-password' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.claims.amr).toEqual(['pwd']);
    expect(vi.mocked(setPassword)).toHaveBeenCalledWith(expect.anything(), SAM.id, '$argon2id$hashed');
    expect(vi.mocked(revokeUserSessions)).toHaveBeenCalledWith(expect.anything(), SAM.id);
  });

  it('returns invalid_code for an unknown email and never consumes a code (no default-user fallback)', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    const res = await request(app)
      .post('/reset/confirm')
      .send({ email: 'nobody@open-tomato.dev', code: '424242', newPassword: 'whatever-strong' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(consumeResetCode)).not.toHaveBeenCalled();
    expect(vi.mocked(setPassword)).not.toHaveBeenCalled();
    // The timing-equalizing decoy verify runs so unknown-email latency matches
    // a real account's reset-code check (no enumeration oracle).
    expect(vi.mocked(verifyPassword)).toHaveBeenCalledTimes(1);
  });

  it('returns expired for a matched-but-expired code and mints nothing', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(consumeResetCode).mockResolvedValue('expired');

    const res = await request(app)
      .post('/reset/confirm')
      .send({ email: SAM.email, code: '424242', newPassword: 'whatever-strong' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'expired' });
    expect(vi.mocked(setPassword)).not.toHaveBeenCalled();
  });

  it('returns invalid_code for a wrong code', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(SAM);
    vi.mocked(consumeResetCode).mockResolvedValue('invalid');

    const res = await request(app)
      .post('/reset/confirm')
      .send({ email: SAM.email, code: '999999', newPassword: 'whatever-strong' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
  });

  it('returns 422 when newPassword is missing', async () => {
    const res = await request(app).post('/reset/confirm')
      .send({ email: SAM.email, code: '424242' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
