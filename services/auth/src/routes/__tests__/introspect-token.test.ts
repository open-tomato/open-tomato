import type { SessionRecord } from '../../tokens/types.js';
import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenIssuer, nowSeconds, ACCESS_TTL_SECONDS } from '../../tokens/issuer.js';

// The refresh path reaches Redis only through store/sessions — mock it.
vi.mock('../../store/sessions.js', () => ({
  createSession: vi.fn(),
  getSessionByRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

const { getSessionByRefreshToken, rotateRefreshToken } = await import('../../store/sessions.js');
const { introspectRouter } = await import('../introspect.js');
const { tokenRouter } = await import('../token.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const issuer = createTokenIssuer('introspect-secret');

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer,
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/introspect', introspectRouter(deps));
  app.use('/token', tokenRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

let app: express.Express;

beforeEach(() => {
  vi.mocked(getSessionByRefreshToken).mockReset();
  vi.mocked(rotateRefreshToken).mockReset();
  app = buildApp();
});

describe('POST /introspect', () => {
  it('returns active:true with the claims for a valid token', async () => {
    const { token } = await issuer.mintAccessToken({
      sub: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin', amr: ['pwd'],
    });

    const res = await request(app).post('/introspect')
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.sub).toBe('usr_sam');
    expect(res.body.amr).toEqual(['pwd']);
    expect(res.body.exp).toBeTypeOf('number');
  });

  it('returns active:false for a malformed token', async () => {
    const res = await request(app).post('/introspect')
      .send({ token: 'not-a-jwt' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false });
  });

  it('returns active:false for an expired token', async () => {
    const { token } = await issuer.mintAccessToken(
      { sub: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin', amr: ['pwd'] },
      nowSeconds() - ACCESS_TTL_SECONDS - 60,
    );
    const res = await request(app).post('/introspect')
      .send({ token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ active: false });
  });

  it('returns 422 when token is missing', async () => {
    const res = await request(app).post('/introspect')
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /token/refresh', () => {
  const session: SessionRecord = {
    sid: 'sid_x', sub: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin', amr: ['pwd'],
  };

  it('rotates and returns a fresh token set for a valid refresh token', async () => {
    vi.mocked(getSessionByRefreshToken).mockResolvedValue(session);
    vi.mocked(rotateRefreshToken).mockResolvedValue('rt_new');

    const res = await request(app).post('/token/refresh')
      .send({ refreshToken: 'rt_old' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.refreshToken).toBe('rt_new');
    expect(res.body.tokens.claims.sub).toBe('usr_sam');
    expect(res.body.tokens.accessToken.split('.')).toHaveLength(3);
  });

  it('returns 401 for an unknown or already-rotated refresh token', async () => {
    vi.mocked(getSessionByRefreshToken).mockResolvedValue(null);

    const res = await request(app).post('/token/refresh')
      .send({ refreshToken: 'rt_gone' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 when refreshToken is missing', async () => {
    const res = await request(app).post('/token/refresh')
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
