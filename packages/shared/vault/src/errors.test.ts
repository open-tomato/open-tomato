import { describe, it, expect } from 'vitest';

import {
  VaultAuthError,
  VaultError,
  VaultIOError,
  VaultRefNotFoundError,
} from './errors.js';

describe('VaultError', () => {
  it('is an Error carrying name, code, and message', () => {
    const err = new VaultError({ message: 'something failed', code: 'GENERIC' });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VaultError);
    expect(err.name).toBe('VaultError');
    expect(err.code).toBe('GENERIC');
    expect(err.message).toBe('something failed');
  });

  it('forwards cause to Error.cause', () => {
    const cause = new Error('root cause');
    const err = new VaultError({ message: 'wrapped', code: 'GENERIC', cause });

    expect(err.cause).toBe(cause);
  });
});

describe('VaultAuthError', () => {
  it('sets name to VaultAuthError, code to AUTH_FAILED, and includes remediation in message', () => {
    const err = new VaultAuthError({ reason: 'BWS_ACCESS_TOKEN is not set' });

    expect(err.name).toBe('VaultAuthError');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.message).toMatch(/^BWS_ACCESS_TOKEN is not set\. /);
    expect(err.message).toContain('BWS_ACCESS_TOKEN');
    expect(err.message).toContain('file auth strategy');
    expect(err.message).toContain('interactively on a TTY');
  });

  it('is an instance of VaultError and Error', () => {
    const err = new VaultAuthError({ reason: 'token rejected' });

    expect(err).toBeInstanceOf(VaultError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VaultAuthError);
  });

  it('forwards cause to Error.cause', () => {
    const cause = new Error('ENOENT');
    const err = new VaultAuthError({ reason: 'token file missing', cause });

    expect(err.cause).toBe(cause);
  });
});

describe('VaultRefNotFoundError', () => {
  it('sets name, code, message, ref, and triedKeys correctly', () => {
    const triedKeys = ['db-password-staging-us-east-1', 'db-password-staging', 'db-password'];
    const err = new VaultRefNotFoundError({
      ref: '{{vault.db-password}}',
      triedKeys,
    });

    expect(err.name).toBe('VaultRefNotFoundError');
    expect(err.code).toBe('REF_NOT_FOUND');
    expect(err.ref).toBe('{{vault.db-password}}');
    expect(err.triedKeys).toEqual(triedKeys);
    expect(err.message).toContain('{{vault.db-password}}');
    expect(err.message).toContain('db-password-staging-us-east-1');
    expect(err.message).toContain('db-password-staging');
    expect(err.message).toContain('db-password');
  });

  it('is an instance of VaultError and Error', () => {
    const err = new VaultRefNotFoundError({
      ref: '{{vault.api-key}}',
      triedKeys: ['api-key'],
    });

    expect(err).toBeInstanceOf(VaultError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VaultRefNotFoundError);
  });

  it('forwards cause to Error.cause', () => {
    const cause = new Error('network down');
    const err = new VaultRefNotFoundError({
      ref: '{{vault.api-key}}',
      triedKeys: ['api-key'],
      cause,
    });

    expect(err.cause).toBe(cause);
  });
});

describe('VaultIOError', () => {
  it('sets name to VaultIOError, code to IO_ERROR, and uses reason as message', () => {
    const err = new VaultIOError({ reason: 'BWS SDK request failed' });

    expect(err.name).toBe('VaultIOError');
    expect(err.code).toBe('IO_ERROR');
    expect(err.message).toBe('BWS SDK request failed');
  });

  it('is an instance of VaultError and Error', () => {
    const err = new VaultIOError({ reason: 'subprocess exited with status 1' });

    expect(err).toBeInstanceOf(VaultError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VaultIOError);
  });

  it('forwards cause to Error.cause', () => {
    const cause = new Error('ECONNREFUSED');
    const err = new VaultIOError({ reason: 'BWS SDK request failed', cause });

    expect(err.cause).toBe(cause);
  });
});
