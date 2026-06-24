import type { ServiceHandle } from '@open-tomato/express';

import process from 'node:process';

import { createService } from '@open-tomato/express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

process.env['NODE_ENV'] = 'test';

describe('GET /health', () => {
  let handle: ServiceHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.stop();
      handle = undefined;
    }
  });

  it('returns 200 with { status: "ok" }', async () => {
    handle = await createService({
      serviceId: '@open-tomato/template-service-express',
      register() {},
    });

    const response = await request(handle.app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});
