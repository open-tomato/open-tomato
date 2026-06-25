import type { EmitTarget, ProvisionAllowance } from './types';

import { describe, expectTypeOf, it } from 'vitest';

describe('ProvisionAllowance.reasons', () => {
  it('is a readonly array of strings', () => {
    expectTypeOf<ProvisionAllowance['reasons']>().toEqualTypeOf<readonly string[]>();
  });

  it('is not a mutable string array', () => {
    expectTypeOf<ProvisionAllowance['reasons']>().not.toEqualTypeOf<string[]>();
  });
});

describe('EmitTarget.content', () => {
  it('is the union of string and Uint8Array', () => {
    expectTypeOf<EmitTarget['content']>().toEqualTypeOf<string | Uint8Array>();
  });

  it('accepts a string value', () => {
    expectTypeOf<string>().toMatchTypeOf<EmitTarget['content']>();
  });

  it('accepts a Uint8Array value', () => {
    expectTypeOf<Uint8Array>().toMatchTypeOf<EmitTarget['content']>();
  });
});
