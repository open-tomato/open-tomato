import type { Db } from '../../db/index.js';

import { authenticator } from 'otplib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../store/totp.js', () => ({ getConfirmedTotpSecret: vi.fn() }));
vi.mock('../../store/recovery-codes.js', () => ({
  listUnusedRecoveryCodes: vi.fn(),
  markRecoveryCodeUsed: vi.fn(),
}));

const { getConfirmedTotpSecret } = await import('../../store/totp.js');
const { listUnusedRecoveryCodes, markRecoveryCodeUsed } = await import('../../store/recovery-codes.js');
const { generateTotpSecret } = await import('../totp.js');
const { generateRecoveryCodes, hashRecoveryCode } = await import('../recovery.js');
const { verifySecondFactor } = await import('../second-factor.js');

const db = {} as Db;

beforeEach(() => {
  vi.mocked(getConfirmedTotpSecret).mockReset();
  vi.mocked(listUnusedRecoveryCodes).mockReset();
  vi.mocked(markRecoveryCodeUsed).mockReset();
});

describe('verifySecondFactor — TOTP path', () => {
  it('accepts a live TOTP code and never touches recovery codes', async () => {
    const secret = generateTotpSecret();
    vi.mocked(getConfirmedTotpSecret).mockResolvedValue({ id: 'totp_1', secret });

    const ok = await verifySecondFactor(db, 'usr_1', authenticator.generate(secret));

    expect(ok).toBe(true);
    expect(vi.mocked(listUnusedRecoveryCodes)).not.toHaveBeenCalled();
  });

  it('rejects a wrong TOTP code', async () => {
    const secret = generateTotpSecret();
    vi.mocked(getConfirmedTotpSecret).mockResolvedValue({ id: 'totp_1', secret });
    const good = authenticator.generate(secret);
    const bad = good === '000000'
      ? '111111'
      : '000000';

    expect(await verifySecondFactor(db, 'usr_1', bad)).toBe(false);
  });

  it('rejects when the user has no confirmed secret', async () => {
    vi.mocked(getConfirmedTotpSecret).mockResolvedValue(null);
    expect(await verifySecondFactor(db, 'usr_1', '123456')).toBe(false);
  });
});

describe('verifySecondFactor — recovery path', () => {
  it('redeems a matching recovery code and marks it used', async () => {
    const code = generateRecoveryCodes()[0]!;
    const hash = await hashRecoveryCode(code);
    vi.mocked(listUnusedRecoveryCodes).mockResolvedValue([{ id: 'rc_1', codeHash: hash }]);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(true); // won the atomic claim

    const ok = await verifySecondFactor(db, 'usr_1', code);

    expect(ok).toBe(true);
    expect(vi.mocked(markRecoveryCodeUsed)).toHaveBeenCalledWith(db, 'rc_1');
    // A recovery code never triggers a TOTP lookup.
    expect(vi.mocked(getConfirmedTotpSecret)).not.toHaveBeenCalled();
  });

  it('rejects a matched code whose atomic claim is lost to a concurrent redemption', async () => {
    const code = generateRecoveryCodes()[0]!;
    const hash = await hashRecoveryCode(code);
    vi.mocked(listUnusedRecoveryCodes).mockResolvedValue([{ id: 'rc_1', codeHash: hash }]);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(false); // already spent — lost the race

    expect(await verifySecondFactor(db, 'usr_1', code)).toBe(false);
  });

  it('rejects an unknown recovery code and marks nothing used', async () => {
    const known = generateRecoveryCodes()[0]!;
    const hash = await hashRecoveryCode(known);
    vi.mocked(listUnusedRecoveryCodes).mockResolvedValue([{ id: 'rc_1', codeHash: hash }]);

    expect(await verifySecondFactor(db, 'usr_1', 'ZZZZ-ZZZZ')).toBe(false);
    expect(vi.mocked(markRecoveryCodeUsed)).not.toHaveBeenCalled();
  });
});
