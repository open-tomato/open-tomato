import type { Db } from '../../db/index.js';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../store/invitations.js', () => ({
  getMembershipRole: vi.fn(),
  listOpenInvitationsForEmail: vi.fn(),
}));

const { getMembershipRole, listOpenInvitationsForEmail } = await import('../../store/invitations.js');
const { createWorkspaceContext } = await import('../context.js');

const db = {} as Db;
const params = { sub: 'usr_sam', email: 'sam@open-tomato.dev', workspaceId: 'ws_open_garden' };
const INVITE = {
  id: 'inv_og', workspaceId: 'ws_open_garden', workspaceName: 'open-garden',
  email: 'sam@open-tomato.dev', role: 'member' as const, invitedBy: null,
  expiresAt: null, acceptedAt: null,
};

beforeEach(() => {
  vi.mocked(getMembershipRole).mockReset();
  vi.mocked(listOpenInvitationsForEmail).mockReset();
});

describe('createWorkspaceContext.resolveContext', () => {
  it('reports membership role when the caller is a confirmed member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('admin');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: 'admin', membership: { role: 'admin' }, pendingInvite: null,
    });
  });

  it('falls back to a pending invite role when not a member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([INVITE]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  it('prefers the membership role over a pending invite', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('owner');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([INVITE]);

    const ctx = createWorkspaceContext(db);
    const result = await ctx.resolveContext(params);
    expect(result.wspRole).toBe('owner');
    expect(result.membership).toEqual({ role: 'owner' });
    expect(result.pendingInvite).toEqual({ id: 'inv_og', role: 'member' });
  });

  it('ignores invites addressed to a different workspace', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([{ ...INVITE, workspaceId: 'ws_other' }]);

    const ctx = createWorkspaceContext(db);
    await expect(ctx.resolveContext(params)).resolves.toEqual({
      wspRole: null, membership: null, pendingInvite: null,
    });
  });
});
