import { describe, it, expect } from 'vitest';

import { ConfigError } from './errors.js';

describe('ConfigError', () => {
  it('is an Error carrying a name, code, and message', () => {
    const err = new ConfigError('VALIDATION_FAILED', 'something is wrong');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ConfigError');
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.message).toBe('something is wrong');
    expect(err.file).toBeUndefined();
    expect(err.key).toBeUndefined();
  });

  it('captures optional file and key context', () => {
    const err = new ConfigError('SCHEMA_MISMATCH', 'unknown key in overlay', {
      file: 'config.staging.yaml',
      key: 'env.redis.extra',
    });

    expect(err.code).toBe('SCHEMA_MISMATCH');
    expect(err.file).toBe('config.staging.yaml');
    expect(err.key).toBe('env.redis.extra');
  });
});
