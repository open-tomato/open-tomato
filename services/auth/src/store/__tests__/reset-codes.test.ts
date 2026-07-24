import { beforeEach, describe, expect, it } from 'vitest';

import { nowSeconds } from '../../tokens/issuer.js';
import { consumeResetCode, createResetCode } from '../reset-codes.js';

import { createFakeRedis, type FakeRedis } from './fake-redis.js';

/** Force the single stored reset record to be past its window. */
function expireStoredRecord(fake: FakeRedis): void {
  const [key] = Object.keys(fake.dump());
  if (key == null) throw new Error('no reset record stored');
  const record = JSON.parse(fake.dump()[key]!) as { codeHash: string; expiresAt: number };
  record.expiresAt = nowSeconds() - 1;
  void fake.client.set(key, JSON.stringify(record));
}

describe('reset-codes store', () => {
  let fake: FakeRedis;

  beforeEach(() => {
    fake = createFakeRedis();
  });

  it('mints a 6-digit code, stores only its hash, and consumes it as ok', async () => {
    const issued = await createResetCode(fake.client, 'usr_1');
    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.expiresInMinutes).toBe(15);

    // The plaintext code is never stored.
    const stored = Object.values(fake.dump())[0] ?? '';
    expect(stored).not.toContain(issued.code);

    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('ok');
  });

  it('is single-use — a consumed code cannot be replayed', async () => {
    const issued = await createResetCode(fake.client, 'usr_1');
    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('ok');
    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('invalid');
  });

  it('returns invalid for an unknown user and for a wrong code (no enumeration)', async () => {
    expect(await consumeResetCode(fake.client, 'ghost', '000000')).toBe('invalid');

    const issued = await createResetCode(fake.client, 'usr_1');
    const wrong = issued.code === '000000'
      ? '111111'
      : '000000';
    expect(await consumeResetCode(fake.client, 'usr_1', wrong)).toBe('invalid');
    // A wrong guess must NOT consume the live code.
    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('ok');
  });

  it('is account-bound — a code minted for one user is invalid for another', async () => {
    const issued = await createResetCode(fake.client, 'usr_1');
    expect(await consumeResetCode(fake.client, 'usr_2', issued.code)).toBe('invalid');
  });

  it('reports a matched-but-expired code as expired, then evicts it', async () => {
    const issued = await createResetCode(fake.client, 'usr_1');
    expireStoredRecord(fake);

    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('expired');
    // Consumed on expiry — a retry looks unknown.
    expect(await consumeResetCode(fake.client, 'usr_1', issued.code)).toBe('invalid');
  });

  it('a new request replaces the prior code (only one live code per user)', async () => {
    await createResetCode(fake.client, 'usr_1');
    const second = await createResetCode(fake.client, 'usr_1');

    // The second write overwrites the first — a single record remains, so the
    // prior code's hash is gone and only the latest code can succeed.
    expect(Object.keys(fake.dump())).toHaveLength(1);
    expect(await consumeResetCode(fake.client, 'usr_1', second.code)).toBe('ok');
  });
});
