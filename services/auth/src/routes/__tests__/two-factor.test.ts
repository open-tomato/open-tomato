import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import { authenticator } from 'otplib';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer } from '../../tokens/issuer.js';

// TOTP secret + recovery persistence mocked; TOTP/recovery crypto stays real so
// the enroll → verify round-trip exercises a genuine code.
vi.mock('../../store/totp.js', () => ({
  startTotpEnrollment: vi.fn(),
  getPendingTotpSecret: vi.fn(),
  confirmTotpSecret: vi.fn(),
}));
vi.mock('../../store/recovery-codes.js', () => ({ replaceRecoveryCodes: vi.fn() }));

const { startTotpEnrollment, getPendingTotpSecret, confirmTotpSecret } = await import('../../store/totp.js');
const { replaceRecoveryCodes } = await import('../../store/recovery-codes.js');
const { twoFactorRouter } = await import('../two-factor.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const issuer = createTokenIssuer('test-secret');
const SAM = { id: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin' };

/** A valid bearer for the enrollee, minted by the same issuer requireAuth uses. */
async function bearer(): Promise<string> {
  const { token } = await issuer.mintAccessToken({ sub: SAM.id, email: SAM.email, name: SAM.name, amr: ['pwd'] });
  return `Bearer ${token}`;
}

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer,
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/2fa', twoFactorRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(startTotpEnrollment).mockReset();
  vi.mocked(getPendingTotpSecret).mockReset();
  vi.mocked(confirmTotpSecret).mockReset();
  vi.mocked(replaceRecoveryCodes).mockReset();
  app = buildApp();
});

describe('POST /2fa/totp/start', () => {
  it('returns a secret + otpauth URI and stores a pending secret for the token user', async () => {
    const res = await request(app).post('/2fa/totp/start')
      .set('Authorization', await bearer());

    expect(res.status).toBe(200);
    expect(res.body.secret).toMatch(/^[A-Z2-7]+$/);
    expect(res.body.otpauthUri.startsWith('otpauth://totp/')).toBe(true);
    expect(res.body.otpauthUri).toContain(encodeURIComponent(SAM.email));
    expect(vi.mocked(startTotpEnrollment)).toHaveBeenCalledWith(expect.anything(), SAM.id, res.body.secret);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/2fa/totp/start');
    expect(res.status).toBe(401);
    expect(vi.mocked(startTotpEnrollment)).not.toHaveBeenCalled();
  });
});

describe('POST /2fa/totp/verify', () => {
  it('confirms the secret and returns 8 recovery codes on a valid first code', async () => {
    const secret = authenticator.generateSecret();
    vi.mocked(getPendingTotpSecret).mockResolvedValue({ id: 'totp_1', secret });

    const res = await request(app)
      .post('/2fa/totp/verify')
      .set('Authorization', await bearer())
      .send({ code: authenticator.generate(secret) });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.recoveryCodes).toHaveLength(8);
    for (const code of res.body.recoveryCodes) expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(vi.mocked(confirmTotpSecret)).toHaveBeenCalledWith(expect.anything(), SAM.id, 'totp_1');
    // Exactly one hashed set is persisted.
    const [, , hashes] = vi.mocked(replaceRecoveryCodes).mock.calls[0]!;
    expect(hashes).toHaveLength(8);
  });

  it('returns invalid_code when no enrollment is pending', async () => {
    vi.mocked(getPendingTotpSecret).mockResolvedValue(null);

    const res = await request(app)
      .post('/2fa/totp/verify')
      .set('Authorization', await bearer())
      .send({ code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(confirmTotpSecret)).not.toHaveBeenCalled();
  });

  it('returns invalid_code for a wrong code and confirms nothing', async () => {
    const secret = authenticator.generateSecret();
    vi.mocked(getPendingTotpSecret).mockResolvedValue({ id: 'totp_1', secret });
    const good = authenticator.generate(secret);
    const bad = good === '000000'
      ? '111111'
      : '000000';

    const res = await request(app)
      .post('/2fa/totp/verify')
      .set('Authorization', await bearer())
      .send({ code: bad });

    expect(res.body).toEqual({ status: 'invalid_code' });
    expect(vi.mocked(confirmTotpSecret)).not.toHaveBeenCalled();
    expect(vi.mocked(replaceRecoveryCodes)).not.toHaveBeenCalled();
  });

  it('returns 401 without a bearer token', async () => {
    const res = await request(app).post('/2fa/totp/verify')
      .send({ code: '123456' });
    expect(res.status).toBe(401);
  });
});

describe('passkey enrollment (deferred, D5)', () => {
  it('returns 501 for start and finish', async () => {
    const start = await request(app).post('/2fa/passkey/start')
      .set('Authorization', await bearer());
    const finish = await request(app).post('/2fa/passkey/finish')
      .set('Authorization', await bearer());
    expect(start.status).toBe(501);
    expect(finish.status).toBe(501);
  });
});
