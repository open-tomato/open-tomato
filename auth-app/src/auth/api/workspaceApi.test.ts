import { describe, expect, test } from 'vitest';

import { AUTH_FIXTURES, workspaceApi } from './authApi';

const { USER_STANDARD } = AUTH_FIXTURES;

describe('workspaceApi', () => {
  test('lists invitations as copies', async () => {
    const a = await workspaceApi.listInvitations();
    const b = await workspaceApi.listInvitations();
    expect(a.map((i) => i.id)).toEqual(['inv_og', 'inv_tm', 'inv_sd']);
    expect(a[0]).not.toBe(b[0]);
  });

  test('selecting an invite stamps wsp only — role/inv are no longer token claims', async () => {
    const result = await workspaceApi.select({ userId: USER_STANDARD.id, invitationId: 'inv_og' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    const { claims } = result.tokens;
    expect(claims.wsp).toBe('ws_open_garden');
    expect((claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
    expect((claims as unknown as Record<string, unknown>)['inv']).toBeUndefined();
  });

  test('an unknown invitation is rejected', async () => {
    expect((await workspaceApi.select({ userId: USER_STANDARD.id, invitationId: 'inv_bogus' })).status)
      .toBe('invalid_invitation');
  });

  test('the self-serve default mints a wsp-only token (no role claim)', async () => {
    const result = await workspaceApi.select({ userId: USER_STANDARD.id });
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.tokens.claims.wsp).toBe('ws_default');
    expect((result.tokens.claims as unknown as Record<string, unknown>)['wspRole']).toBeUndefined();
  });

  test('getContext reports the owner role for the self-serve default workspace', async () => {
    await expect(workspaceApi.getContext('ws_default')).resolves.toEqual({
      wspRole: 'owner', membership: { role: 'owner' }, pendingInvite: null,
    });
  });

  test('getContext reports a pending invite role for an invited workspace', async () => {
    await expect(workspaceApi.getContext('ws_open_garden')).resolves.toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  test('getContext reports no access for an unrelated workspace', async () => {
    await expect(workspaceApi.getContext('ws_stranger')).resolves.toEqual({
      wspRole: null, membership: null, pendingInvite: null,
    });
  });
});
