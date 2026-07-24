import { describe, expect, test } from 'vitest';

import { AUTH_FIXTURES } from '../api/authApi';

import { initialReset, resetReduce } from './reset';
import { initialSignIn, signInReduce } from './signIn';
import { initialSignUp, signUpReduce } from './signUp';
import { enrollReduce, initialEnroll } from './twoFactor';
import { initialWorkspace, workspaceReduce } from './workspace';

const {
  USER_STANDARD, USER_2FA, WRONG_PASSWORD, VALID_TOTP_CODE, VALID_RESET_CODE, EXPIRED_RESET_CODE,
} = AUTH_FIXTURES;

/* ----------------------------- sign in ----------------------------- */

describe('signIn machine', () => {
  test('happy path: credentials → authenticated with a session', async () => {
    const s = await signInReduce(initialSignIn(), {
      kind: 'submitEmail', email: USER_STANDARD.email, password: 'pw',
    });
    expect(s.step).toBe('authenticated');
    expect(s.userId).toBe(USER_STANDARD.id);
    expect(s.tokens?.claims.amr).toEqual(['pwd']);
  });

  test('bad credentials stay on the screen with an inline error', async () => {
    const s = await signInReduce(initialSignIn(), {
      kind: 'submitEmail', email: USER_STANDARD.email, password: WRONG_PASSWORD,
    });
    expect(s.step).toBe('credentials');
    expect(s.errorKind).toBe('credentials');
    expect(s.error).toBeTruthy();
  });

  test('2FA path: challenge then a valid code authenticates', async () => {
    const challenged = await signInReduce(initialSignIn(), {
      kind: 'submitEmail', email: USER_2FA.email, password: 'pw',
    });
    expect(challenged.step).toBe('twoFactor');
    expect(challenged.challengeId).toBeTruthy();

    const done = await signInReduce(challenged, { kind: 'submitCode', code: VALID_TOTP_CODE });
    expect(done.step).toBe('authenticated');
    expect(done.tokens?.claims.amr).toEqual(['pwd', 'otp']);
  });

  test('a wrong 2FA code keeps the challenge and flags it', async () => {
    const challenged = await signInReduce(initialSignIn(), {
      kind: 'submitEmail', email: USER_2FA.email, password: 'pw',
    });
    const bad = await signInReduce(challenged, { kind: 'submitCode', code: '000000' });
    expect(bad.step).toBe('twoFactor');
    expect(bad.errorKind).toBe('twofa');
  });

  test('OAuth existing → authenticated, new → profile, denied → error banner', async () => {
    expect((await signInReduce(initialSignIn(), { kind: 'oauth', provider: 'github' })).step)
      .toBe('authenticated');

    const fresh = await signInReduce(initialSignIn(), { kind: 'oauth', provider: 'google' });
    expect(fresh.step).toBe('oauthProfile');
    expect(fresh.provider).toBe('google');

    const denied = await signInReduce(initialSignIn(), { kind: 'oauth', provider: 'google', simulate: 'denied' });
    expect(denied.step).toBe('credentials');
    expect(denied.errorKind).toBe('oauth');
  });

  test('submitting a code with no active challenge is a no-op error', async () => {
    const s = await signInReduce(initialSignIn(), { kind: 'submitCode', code: VALID_TOTP_CODE });
    expect(s.step).toBe('credentials');
    expect(s.error).toBeTruthy();
  });
});

/* ----------------------------- sign up ----------------------------- */

describe('signUp machine', () => {
  test('account creation advances to workspace pick', async () => {
    const s = await signUpReduce(initialSignUp(), {
      kind: 'submitEmail', email: 'fresh@grower.dev', username: 'fresh', password: 'pw',
    });
    expect(s.step).toBe('workspace');
    expect(s.user?.handle).toBe('fresh');
  });

  test('a taken email keeps the account step with an error', async () => {
    const s = await signUpReduce(initialSignUp(), {
      kind: 'submitEmail', email: USER_STANDARD.email, username: 'sam', password: 'pw',
    });
    expect(s.step).toBe('account');
    expect(s.error).toBeTruthy();
  });

  test('OAuth completion advances to workspace pick', async () => {
    const s = await signUpReduce(initialSignUp(), {
      kind: 'completeOAuth', provider: 'github', username: 'octo', displayName: 'Octo Cat',
    });
    expect(s.step).toBe('workspace');
    expect(s.tokens?.claims.amr).toEqual(['oauth:github']);
  });
});

/* ------------------------------ reset ------------------------------ */

describe('reset machine', () => {
  test('request → sent → code → done signs the user in', async () => {
    const sent = await resetReduce(initialReset(), { kind: 'requestCode', email: USER_STANDARD.email });
    expect(sent.step).toBe('sent');
    expect(sent.maskedEmail).toBeTruthy();

    const code = await resetReduce(sent, { kind: 'advance' });
    expect(code.step).toBe('code');

    const done = await resetReduce(code, { kind: 'resetPassword', code: VALID_RESET_CODE, newPassword: 'new-pw' });
    expect(done.step).toBe('done');
    expect(done.tokens?.claims.sub).toBe(USER_STANDARD.id);
  });

  test('an expired code is flagged distinctly from a wrong one', async () => {
    const sent = await resetReduce(initialReset(), { kind: 'requestCode', email: USER_STANDARD.email });
    const code = await resetReduce(sent, { kind: 'advance' });

    const expired = await resetReduce(code, { kind: 'resetPassword', code: EXPIRED_RESET_CODE, newPassword: 'x' });
    expect(expired.step).toBe('code');
    expect(expired.expired).toBe(true);

    const wrong = await resetReduce(code, { kind: 'resetPassword', code: '123123', newPassword: 'x' });
    expect(wrong.step).toBe('code');
    expect(wrong.expired).toBe(false);
    expect(wrong.error).toBeTruthy();
  });
});

/* --------------------------- 2FA enroll ---------------------------- */

describe('twoFactor enrollment machine', () => {
  test('TOTP: pick → scan → confirm → done with recovery codes', async () => {
    const picked = await enrollReduce(initialEnroll(), { kind: 'pickMethod', method: 'totp' });
    const scan = await enrollReduce(picked, { kind: 'continue' });
    expect(scan.step).toBe('scan');
    expect(scan.enrollment?.secret).toBeTruthy();

    const confirm = await enrollReduce(scan, { kind: 'scanned' });
    expect(confirm.step).toBe('confirm');

    const done = await enrollReduce(confirm, { kind: 'submitCode', code: VALID_TOTP_CODE });
    expect(done.step).toBe('done');
    expect(done.recoveryCodes?.length).toBe(8);
  });

  test('a wrong TOTP code keeps the confirm step with an error', async () => {
    const confirm = { step: 'confirm' as const, method: 'totp' as const };
    const bad = await enrollReduce(confirm, { kind: 'submitCode', code: '000000' });
    expect(bad.step).toBe('confirm');
    expect(bad.error).toBeTruthy();
  });

  test('Passkey: pick → passkey; a returned credential finishes, none fails, cancel returns to pick', async () => {
    const picked = await enrollReduce(initialEnroll(), { kind: 'pickMethod', method: 'passkey' });
    const prompt = await enrollReduce(picked, { kind: 'continue' });
    expect(prompt.step).toBe('passkey');

    const done = await enrollReduce(prompt, { kind: 'registerPasskey', credential: { id: 'cred' } });
    expect(done.step).toBe('done');
    expect(done.recoveryCodes?.length).toBe(8);

    const failed = await enrollReduce(prompt, { kind: 'registerPasskey', credential: null });
    expect(failed.step).toBe('passkey');
    expect(failed.error).toBeTruthy();

    const cancelled = await enrollReduce(prompt, { kind: 'cancelPasskey' });
    expect(cancelled.step).toBe('pick');
  });
});

/* ---------------------------- workspace ---------------------------- */

describe('workspace machine', () => {
  test('loads invitations', async () => {
    const s = await workspaceReduce(initialWorkspace('usr_sam'), { kind: 'loadInvites' });
    expect(s.invitations).toHaveLength(3);
  });

  test('selecting an invite finishes with a workspace-scoped token', async () => {
    const s = await workspaceReduce(initialWorkspace('usr_sam'), { kind: 'select', invitationId: 'inv_og' });
    expect(s.step).toBe('done');
    expect(s.tokens?.claims.wsp).toBe('ws_open_garden');
    expect((s.tokens?.claims as unknown as Record<string, unknown>)['inv']).toBeUndefined();
  });

  test('an invalid invitation keeps the pick step with an error', async () => {
    const s = await workspaceReduce(initialWorkspace('usr_sam'), { kind: 'select', invitationId: 'nope' });
    expect(s.step).toBe('picking');
    expect(s.error).toBeTruthy();
  });

  test('self-serve default finishes with the owner default workspace', async () => {
    const s = await workspaceReduce(initialWorkspace('usr_sam', 'fresh'), { kind: 'select' });
    expect(s.step).toBe('done');
    expect(s.tokens?.claims.wsp).toBe('ws_default');
    expect((s.tokens?.claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
  });
});
