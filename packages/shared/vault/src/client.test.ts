import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultAuthError, VaultIOError } from './errors.js';

interface MockSecret {
  key: string;
  value: string;
}

const sdkState = vi.hoisted(() => ({
  loginError: undefined as Error | undefined,
  syncError: undefined as Error | undefined,
  secrets: [] as MockSecret[],
  organizationId: 'org-test-123',
  stateFilePayload: undefined as string | undefined,
  loginCalls: 0,
  syncCalls: 0,
}));

vi.mock('@bitwarden/sdk-napi', () => {
  class BitwardenClient {
    auth() {
      return {
        async loginAccessToken(token: string, stateFile?: string): Promise<void> {
          void token;
          sdkState.loginCalls += 1;
          if (sdkState.loginError) {
            throw sdkState.loginError;
          }
          if (stateFile) {
            const { writeFile } = await import('node:fs/promises');
            const payload =
              sdkState.stateFilePayload ??
              JSON.stringify({ organization_id: sdkState.organizationId });
            await writeFile(stateFile, payload, 'utf8');
          }
        },
      };
    }
    secrets() {
      return {
        async sync(organizationId: string): Promise<{ secrets: MockSecret[] }> {
          void organizationId;
          sdkState.syncCalls += 1;
          if (sdkState.syncError) {
            throw sdkState.syncError;
          }
          return { secrets: sdkState.secrets };
        },
      };
    }
  }
  return { BitwardenClient };
});

const { createClient } = await import('./client.js');

beforeEach(() => {
  sdkState.loginError = undefined;
  sdkState.syncError = undefined;
  sdkState.secrets = [];
  sdkState.organizationId = 'org-test-123';
  sdkState.stateFilePayload = undefined;
  sdkState.loginCalls = 0;
  sdkState.syncCalls = 0;
});

describe('createClient (SDK transport)', () => {
  it('returns the secret value on a successful fetch', async () => {
    sdkState.secrets = [
      { key: 'db-password-staging', value: 'super-secret-value' },
      { key: 'api-key', value: 'k-12345' },
    ];

    const client = createClient('valid-token');
    const result = await client.getSecret('db-password-staging');

    expect(result).toBe('super-secret-value');
  });

  it('returns null when the requested key is not in the BWS response', async () => {
    sdkState.secrets = [
      { key: 'some-other-key', value: 'value' },
    ];

    const client = createClient('valid-token');
    const result = await client.getSecret('missing-key');

    expect(result).toBeNull();
  });

  it('returns null when the BWS response has no secrets at all', async () => {
    sdkState.secrets = [];

    const client = createClient('valid-token');
    const result = await client.getSecret('any-key');

    expect(result).toBeNull();
  });

  it('reuses the populated cache across subsequent getSecret calls', async () => {
    sdkState.secrets = [
      { key: 'k1', value: 'v1' },
      { key: 'k2', value: 'v2' },
    ];

    const client = createClient('valid-token');
    await client.getSecret('k1');
    await client.getSecret('k2');
    await client.getSecret('missing');

    expect(sdkState.loginCalls).toBe(1);
    expect(sdkState.syncCalls).toBe(1);
  });

  it('throws VaultIOError when the SDK sync (network) call fails', async () => {
    sdkState.syncError = new Error('ECONNREFUSED: connect to bws failed');

    const client = createClient('valid-token');

    await expect(client.getSecret('any-key')).rejects.toBeInstanceOf(VaultIOError);
    await expect(client.getSecret('any-key')).rejects.toMatchObject({
      code: 'IO_ERROR',
      message: expect.stringContaining('sync'),
    });
  });

  it('preserves the underlying network error on cause', async () => {
    const networkErr = new Error('ECONNREFUSED');
    sdkState.syncError = networkErr;

    const client = createClient('valid-token');

    await expect(client.getSecret('any-key')).rejects.toMatchObject({
      cause: networkErr,
    });
  });

  it('throws VaultAuthError when the SDK rejects the access token', async () => {
    sdkState.loginError = new Error('invalid access token');

    const client = createClient('bad-token');

    await expect(client.getSecret('any-key')).rejects.toBeInstanceOf(VaultAuthError);
    await expect(client.getSecret('any-key')).rejects.toMatchObject({
      code: 'AUTH_FAILED',
      message: expect.stringContaining('BWS_ACCESS_TOKEN'),
    });
  });

  it('preserves the underlying SDK rejection on cause when the token is rejected', async () => {
    const sdkErr = new Error('401 Unauthorized');
    sdkState.loginError = sdkErr;

    const client = createClient('bad-token');

    await expect(client.getSecret('any-key')).rejects.toMatchObject({
      cause: sdkErr,
    });
  });

  it('throws VaultIOError when the state file cannot be parsed', async () => {
    sdkState.stateFilePayload = 'not valid json at all';

    const client = createClient('valid-token');

    await expect(client.getSecret('any-key')).rejects.toBeInstanceOf(VaultIOError);
    await expect(client.getSecret('any-key')).rejects.toMatchObject({
      code: 'IO_ERROR',
      message: expect.stringContaining('organizationId'),
    });
  });

  it('resets the cache after a failure so the next call retries the SDK', async () => {
    sdkState.syncError = new Error('transient network blip');

    const client = createClient('valid-token');

    await expect(client.getSecret('k')).rejects.toBeInstanceOf(VaultIOError);

    sdkState.syncError = undefined;
    sdkState.secrets = [{ key: 'k', value: 'v' }];

    const result = await client.getSecret('k');

    expect(result).toBe('v');
    expect(sdkState.loginCalls).toBe(2);
    expect(sdkState.syncCalls).toBe(2);
  });
});
