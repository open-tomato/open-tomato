import { describe, expect, it } from 'vitest';

import { resolveVaultId } from './mapping.js';

describe('resolveVaultId', () => {
  it('returns env+region, env, and bare id when both env and region are provided', () => {
    expect(resolveVaultId('db-password', 'staging', 'us-east-1')).toEqual([
      'db-password-staging-us-east-1',
      'db-password-staging',
      'db-password',
    ]);
  });

  it('returns env and bare id when only env is provided', () => {
    expect(resolveVaultId('db-password', 'staging')).toEqual([
      'db-password-staging',
      'db-password',
    ]);
  });

  it('omits any region-only segment when env is empty but region is provided', () => {
    expect(resolveVaultId('db-password', '', 'us-east-1')).toEqual(['db-password']);
  });

  it('returns a single-element list with the bare id when neither env nor region is provided', () => {
    expect(resolveVaultId('db-password', '')).toEqual(['db-password']);
  });

  it('returns a de-duplicated single-element list when env and region are empty strings', () => {
    const keys = resolveVaultId('db-password', '', '');

    expect(keys).toEqual(['db-password']);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
