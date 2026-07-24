import { describe, expect, test } from 'vitest';

import { AUTH_FIXTURES, authApi, createAuthApi } from './authApi';
import { ACCESS_TTL_SECONDS, decodeAccessToken } from './tokens';

const {
  USER_STANDARD, USER_2FA, WRONG_PASSWORD, VALID_TOTP_CODE,
  VALID_RESET_CODE, EXPIRED_RESET_CODE, RECOVERY_CODES, TOTP_SECRET,
} = AUTH_FIXTURES;

describe('authApi — token model', () => {
  test('a password sign-in mints a Bearer token with pwd amr and a bounded TTL', async () => {
    const result = await authApi.signIn.withEmail({ email: USER_STANDARD.email, password: 'hunter2' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    const { claims } = result.tokens;
    expect(result.tokens.tokenType).toBe('Bearer');
    expect(claims.sub).toBe(USER_STANDARD.id);
    expect(claims.amr).toEqual(['pwd']);
    expect(claims.exp - claims.iat).toBe(ACCESS_TTL_SECONDS);
    // No workspace yet — that claim only lands after workspace pick.
    expect(claims.wsp).toBeUndefined();
  });

  test('the access token decodes back to the same claims', async () => {
    const result = await authApi.signIn.withEmail({ email: USER_STANDARD.email, password: 'hunter2' });
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(decodeAccessToken(result.tokens.accessToken)).toEqual(result.tokens.claims);
  });

  test('token minting is deterministic across instances (frozen clock)', async () => {
    const a = await createAuthApi().signIn.withEmail({ email: USER_STANDARD.email, password: 'x' });
    const b = await createAuthApi().signIn.withEmail({ email: USER_STANDARD.email, password: 'x' });
    if (a.status !== 'ok' || b.status !== 'ok') throw new Error('expected ok');
    expect(a.tokens.accessToken).toBe(b.tokens.accessToken);
    expect(a.tokens.refreshToken).toBe(b.tokens.refreshToken);
  });
});

describe('authApi — sign in', () => {
  test('rejects a wrong password', async () => {
    const result = await authApi.signIn.withEmail({ email: USER_STANDARD.email, password: WRONG_PASSWORD });
    expect(result.status).toBe('invalid_credentials');
  });

  test('rejects an empty password and an unknown email', async () => {
    expect((await authApi.signIn.withEmail({ email: USER_STANDARD.email, password: '   ' })).status)
      .toBe('invalid_credentials');
    expect((await authApi.signIn.withEmail({ email: 'nobody@example.com', password: 'x' })).status)
      .toBe('invalid_credentials');
  });

  test('escalates a 2FA-enabled account to a challenge', async () => {
    const result = await authApi.signIn.withEmail({ email: USER_2FA.email, password: 'x' });
    expect(result.status).toBe('two_factor_required');
    if (result.status !== 'two_factor_required') return;
    expect(result.challenge.methods).toEqual(['totp', 'passkey']);
    expect(result.challenge.challengeId).toMatch(/^chl_/);
  });

  test('verifies a 2FA code — valid lands otp amr, wrong is rejected', async () => {
    const ok = await authApi.signIn.verifyTwoFactor({ challengeId: 'chl_x', code: VALID_TOTP_CODE });
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') expect(ok.tokens.claims.amr).toEqual(['pwd', 'otp']);
    expect((await authApi.signIn.verifyTwoFactor({ challengeId: 'chl_x', code: '000111' })).status)
      .toBe('invalid_code');
  });

  test('OAuth: existing identity signs straight in, new identity needs a profile, denial is surfaced', async () => {
    const existing = await authApi.signIn.withOAuth({ provider: 'github' });
    expect(existing.status).toBe('ok');
    if (existing.status === 'ok') expect(existing.tokens.claims.amr).toEqual(['oauth:github']);

    const fresh = await authApi.signIn.withOAuth({ provider: 'google' });
    expect(fresh.status).toBe('needs_profile');
    if (fresh.status === 'needs_profile') expect(fresh.provider).toBe('google');

    const denied = await authApi.signIn.withOAuth({ provider: 'google', simulate: 'denied' });
    expect(denied.status).toBe('denied');
  });
});

describe('authApi — sign up', () => {
  test('creates a new account and rejects a taken email', async () => {
    const created = await authApi.signUp.withEmail({ email: 'new@grower.dev', username: 'grower', password: 'pw' });
    expect(created.status).toBe('ok');
    if (created.status === 'ok') expect(created.user.handle).toBe('grower');

    const taken = await authApi.signUp.withEmail({ email: USER_STANDARD.email, username: 'sam', password: 'pw' });
    expect(taken.status).toBe('email_taken');
  });

  test('completes an OAuth sign-up with the chosen handle', async () => {
    const result = await authApi.signUp.completeOAuth({ provider: 'google', username: 'alex', displayName: 'Alex Rivera' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.user.handle).toBe('alex');
    expect(result.tokens.claims.amr).toEqual(['oauth:google']);
  });

  test('OAuth completion with an already-linked handle returns email_taken', async () => {
    const result = await authApi.signUp.completeOAuth({ provider: 'github', username: 'kai', displayName: 'Kai' });
    expect(result.status).toBe('email_taken');
  });
});

describe('authApi — reset', () => {
  test('always reports sent (no account enumeration) and masks the address', async () => {
    const result = await authApi.reset.requestCode({ email: USER_STANDARD.email });
    expect(result.status).toBe('sent');
    expect(result.maskedEmail).toMatch(/^s•+@open-tomato\.dev$/);
  });

  test('reset distinguishes valid, expired, and wrong codes', async () => {
    const ok = await authApi.reset.resetPassword({ email: USER_STANDARD.email, code: VALID_RESET_CODE, newPassword: 'new-pw' });
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') expect(ok.tokens.claims.sub).toBe(USER_STANDARD.id);

    expect((await authApi.reset.resetPassword({ email: USER_STANDARD.email, code: EXPIRED_RESET_CODE, newPassword: 'x' })).status)
      .toBe('expired');
    expect((await authApi.reset.resetPassword({ email: USER_STANDARD.email, code: '999999', newPassword: 'x' })).status)
      .toBe('invalid_code');
  });

  test('the reset code is bound to an account — an unknown email never authenticates', async () => {
    // A valid-looking code + an email with no account must NOT fall back to a
    // default user (account-takeover shape). It returns invalid_code, no token.
    const unknown = await authApi.reset.resetPassword({ email: 'stranger@nowhere.dev', code: VALID_RESET_CODE, newPassword: 'x' });
    expect(unknown.status).toBe('invalid_code');
    expect('tokens' in unknown).toBe(false);

    const empty = await authApi.reset.resetPassword({ email: '', code: VALID_RESET_CODE, newPassword: 'x' });
    expect(empty.status).toBe('invalid_code');
  });
});

describe('authApi — two-factor enrollment', () => {
  test('TOTP enrollment: start yields the secret, a valid code returns recovery codes', async () => {
    const enrollment = await authApi.twoFactor.enrollTotpStart();
    expect(enrollment.secret).toBe(TOTP_SECRET);
    expect(enrollment.otpauthUri).toContain(TOTP_SECRET);

    const ok = await authApi.twoFactor.enrollTotpVerify({ code: VALID_TOTP_CODE });
    expect(ok.status).toBe('ok');
    if (ok.status === 'ok') expect(ok.recoveryCodes).toEqual(RECOVERY_CODES);

    expect((await authApi.twoFactor.enrollTotpVerify({ code: '111222' })).status).toBe('invalid_code');
  });

  test('passkey: start returns WebAuthn options; finish accepts a credential and rejects none', async () => {
    const options = await authApi.twoFactor.enrollPasskeyStart();
    expect(options.challenge).toBeTruthy();
    expect(options.pubKeyCredParams.length).toBeGreaterThan(0);
    expect(options.rp.id).toBe('open-tomato.dev');

    expect((await authApi.twoFactor.enrollPasskeyFinish({ id: 'cred' })).status).toBe('ok');
    expect((await authApi.twoFactor.enrollPasskeyFinish(null)).status).toBe('failed');
  });
});
