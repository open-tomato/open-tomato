import { describe, expect, it, vi } from 'vitest';

import { createMailTransport, StubMailTransport } from '../transport.js';

describe('mail transport', () => {
  it('factory returns the stub transport when MAIL_URL is unset', () => {
    expect(createMailTransport(undefined)).toBeInstanceOf(StubMailTransport);
    expect(createMailTransport('')).toBeInstanceOf(StubMailTransport);
  });

  it('stub logs the reset code to the console and never throws', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const transport = new StubMailTransport();

    await transport.sendPasswordResetCode({
      to: 'sam@open-tomato.dev',
      code: '424242',
      expiresInMinutes: 15,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = String(spy.mock.calls[0]?.[0] ?? '');
    expect(logged).toContain('sam@open-tomato.dev');
    expect(logged).toContain('424242');
    spy.mockRestore();
  });
});
