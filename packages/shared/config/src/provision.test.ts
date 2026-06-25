import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';

import { coerceProvision } from './provision.js';

describe('coerceProvision', () => {
  it('coerces `true` to an empty object (default allowance)', () => {
    expect(coerceProvision(true)).toEqual({});
  });

  it('coerces `false` to `{ disabled: true }` (explicit opt-out)', () => {
    expect(coerceProvision(false)).toEqual({ disabled: true });
  });

  it('returns `undefined` when the input is `undefined` (field absent stays absent)', () => {
    expect(coerceProvision(undefined)).toBeUndefined();
  });

  it('passes a valid object through unchanged', () => {
    const input = {
      disabled: false,
      caps: ['network', 'storage'],
      metadata: { region: 'us-east-1' },
    };

    expect(coerceProvision(input)).toEqual(input);
  });

  it('throws a ZodError when the input is an invalid object shape', () => {
    expect(() => coerceProvision({ disabled: 'nope' })).toThrow(ZodError);
  });

  it('throws a ZodError when the input is the string "yes" (not a supported shorthand)', () => {
    expect(() => coerceProvision('yes')).toThrow(ZodError);
  });
});
