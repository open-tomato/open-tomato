import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveAuth } from './auth.js';
import { VaultAuthError } from './errors.js';

describe('resolveAuth (\'env\' strategy)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the token from BWS_ACCESS_TOKEN when set', async () => {
    vi.stubEnv('BWS_ACCESS_TOKEN', 'bws-token-abc');

    const result = await resolveAuth('env');

    expect(result).toEqual({ token: 'bws-token-abc' });
  });

  it('throws VaultAuthError when BWS_ACCESS_TOKEN is not set', async () => {
    vi.stubEnv('BWS_ACCESS_TOKEN', '');

    await expect(resolveAuth('env')).rejects.toBeInstanceOf(VaultAuthError);
    await expect(resolveAuth('env')).rejects.toMatchObject({
      code: 'AUTH_FAILED',
      message: expect.stringContaining('BWS_ACCESS_TOKEN'),
    });
  });

  it('throws VaultAuthError when BWS_ACCESS_TOKEN is whitespace only', async () => {
    vi.stubEnv('BWS_ACCESS_TOKEN', '   ');

    await expect(resolveAuth('env')).rejects.toBeInstanceOf(VaultAuthError);
  });
});
