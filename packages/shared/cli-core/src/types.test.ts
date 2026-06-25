
import type { CliEvent } from './events';
import type { CliContext } from './types';

import { describe, expectTypeOf, it } from 'vitest';

describe('CliContext.outputMode', () => {
  it('is the string literal union "text" | "json"', () => {
    expectTypeOf<CliContext['outputMode']>().toEqualTypeOf<'text' | 'json'>();
  });

  it('does not accept arbitrary strings', () => {
    expectTypeOf<CliContext['outputMode']>().not.toEqualTypeOf<string>();
    expectTypeOf<'text'>().toMatchTypeOf<CliContext['outputMode']>();
    expectTypeOf<'json'>().toMatchTypeOf<CliContext['outputMode']>();
  });
});

describe('CliEvent narrowing', () => {
  it('narrows to the log variant inside `if (e.type === "log")`', () => {
    const handle = (e: CliEvent): void => {
      if (e.type === 'log') {
        expectTypeOf(e).toEqualTypeOf<{
          type: 'log';
          level: 'debug' | 'info' | 'warn' | 'error';
          message: string;
          ts: string;
        }>();
        expectTypeOf(e.level).toEqualTypeOf<'debug' | 'info' | 'warn' | 'error'>();
        expectTypeOf(e.message).toEqualTypeOf<string>();
      }
    };
    expectTypeOf(handle).toBeFunction();
  });

  it('narrows each non-log variant by its discriminator', () => {
    const handle = (e: CliEvent): void => {
      if (e.type === 'start') {
        expectTypeOf(e.command).toEqualTypeOf<string>();
      } else if (e.type === 'step') {
        expectTypeOf(e.name).toEqualTypeOf<string>();
      } else if (e.type === 'result') {
        expectTypeOf(e.ok).toEqualTypeOf<boolean>();
      }
    };
    expectTypeOf(handle).toBeFunction();
  });

  it('exposes `type` as the union of all variant discriminators', () => {
    expectTypeOf<CliEvent['type']>().toEqualTypeOf<'start' | 'step' | 'log' | 'result'>();
  });
});
