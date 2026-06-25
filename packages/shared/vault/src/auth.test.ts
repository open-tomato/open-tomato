import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

describe('resolveAuth (\'file\' strategy)', () => {
  it('returns the token read from the given path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'token');
      await writeFile(tokenPath, 'bws-token-from-file\n');

      const result = await resolveAuth('file', { tokenPath });

      expect(result).toEqual({ token: 'bws-token-from-file' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('trims whitespace and trailing newlines from the file contents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'token');
      await writeFile(tokenPath, '   bws-token-padded   \n\n');

      const result = await resolveAuth('file', { tokenPath });

      expect(result).toEqual({ token: 'bws-token-padded' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws VaultAuthError when the file is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'does-not-exist');

      await expect(resolveAuth('file', { tokenPath })).rejects.toBeInstanceOf(
        VaultAuthError,
      );
      await expect(resolveAuth('file', { tokenPath })).rejects.toMatchObject({
        code: 'AUTH_FAILED',
        message: expect.stringContaining(tokenPath),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('preserves the underlying fs error as the cause', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'does-not-exist');

      await expect(resolveAuth('file', { tokenPath })).rejects.toMatchObject({
        cause: expect.objectContaining({ code: 'ENOENT' }),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws VaultAuthError when the file is empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'token');
      await writeFile(tokenPath, '');

      await expect(resolveAuth('file', { tokenPath })).rejects.toBeInstanceOf(
        VaultAuthError,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws VaultAuthError when the file contains only whitespace', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-'));
    try {
      const tokenPath = join(dir, 'token');
      await writeFile(tokenPath, '   \n\t\n');

      await expect(resolveAuth('file', { tokenPath })).rejects.toBeInstanceOf(
        VaultAuthError,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('defaults to ~/.bws/token when tokenPath is omitted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vault-auth-home-'));
    try {
      const bwsDir = join(dir, '.bws');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(bwsDir, { recursive: true });
      await writeFile(join(bwsDir, 'token'), 'bws-token-from-home');

      vi.stubEnv('HOME', dir);
      try {
        const result = await resolveAuth('file');

        expect(result).toEqual({ token: 'bws-token-from-home' });
      } finally {
        vi.unstubAllEnvs();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
