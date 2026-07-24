import type { ServiceLogger } from '@open-tomato/service-core';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOptionalAuth, buildRequireAuth, getSession } from './auth';

const INTROSPECT_URL = 'http://auth.test/introspect';
const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as ServiceLogger;

/** Fake an introspect HTTP response. */
function mockIntrospect(body: unknown, ok = true): void {
  vi.mocked(fetch).mockResolvedValue({ ok, json: async () => body } as Response);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.mocked(logger.warn).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function requireApp(): express.Express {
  const app = express();
  app.use(buildRequireAuth(INTROSPECT_URL, logger));
  app.get('/', (_req, res) => res.json({ sub: getSession(res)?.sub ?? null }));
  return app;
}

describe('buildRequireAuth', () => {
  it('401s a request with no bearer token, without calling introspect', async () => {
    const res = await request(requireApp()).get('/');
    expect(res.status).toBe(401);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('attaches claims and continues for an active token', async () => {
    mockIntrospect({ active: true, sub: 'usr_1', email: 'a@b.dev', amr: ['pwd'] });

    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer good');

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe('usr_1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(INTROSPECT_URL, expect.objectContaining({ method: 'POST' }));
  });

  it('401s when introspect reports the token inactive', async () => {
    mockIntrospect({ active: false });
    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer stale');
    expect(res.status).toBe(401);
  });

  it('401s (fails closed) and warns when introspect is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(requireApp()).get('/')
      .set('Authorization', 'Bearer good');
    expect(res.status).toBe(401);
    expect(vi.mocked(logger.warn)).toHaveBeenCalled();
  });
});

describe('buildOptionalAuth', () => {
  function optionalApp(): express.Express {
    const app = express();
    app.use(buildOptionalAuth(INTROSPECT_URL, logger));
    app.get('/', (_req, res) => res.json({ sub: getSession(res)?.sub ?? null }));
    return app;
  }

  it('continues without claims when no token is present', async () => {
    const res = await request(optionalApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.body.sub).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('attaches claims when a valid token is present', async () => {
    mockIntrospect({ active: true, sub: 'usr_9' });
    const res = await request(optionalApp()).get('/')
      .set('Authorization', 'Bearer good');
    expect(res.body.sub).toBe('usr_9');
  });

  it('continues without claims (never 401) for an invalid token', async () => {
    mockIntrospect({ active: false });
    const res = await request(optionalApp()).get('/')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(200);
    expect(res.body.sub).toBeNull();
  });
});
