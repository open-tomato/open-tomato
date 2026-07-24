import type { RouteDeps } from '../context.js';

import { errorHandler } from '@open-tomato/errors';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFederationSigner } from '../../oauth/pending-federation.js';
import { createTokenIssuer } from '../../tokens/issuer.js';

vi.mock('../../store/invitations.js', () => ({
  listOpenInvitationsForEmail: vi.fn(),
  getInvitationById: vi.fn(),
  countWorkspaceMembers: vi.fn(),
  getMembershipRole: vi.fn(),
}));
vi.mock('../../store/users.js', () => ({
  getUserById: vi.fn(),
  normalizeEmail: (email: string): string => email.trim().toLowerCase(),
}));
vi.mock('../../store/sessions.js', () => ({ createSession: vi.fn() }));

const { listOpenInvitationsForEmail, getInvitationById, countWorkspaceMembers, getMembershipRole } = await import('../../store/invitations.js');
const { getUserById } = await import('../../store/users.js');
const { createSession } = await import('../../store/sessions.js');
const { workspaceRouter } = await import('../workspace.js');

const testLogger = { warn: (): void => {}, error: (): void => {} };
const issuer = createTokenIssuer('test-secret');
const SAM = { id: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam Lin' };

async function bearer(): Promise<string> {
  const { token } = await issuer.mintAccessToken({ sub: SAM.id, email: SAM.email, name: SAM.name, amr: ['pwd'] });
  return `Bearer ${token}`;
}

function buildApp(): express.Express {
  const deps: RouteDeps = {
    db: {} as RouteDeps['db'],
    redis: {} as RouteDeps['redis'],
    issuer,
    mail: { sendPasswordResetCode: vi.fn() },
  };
  const app = express();
  app.use(express.json());
  app.use('/workspaces', workspaceRouter(deps));
  app.use(errorHandler(testLogger));
  return app;
}

const OPEN_INVITE = {
  id: 'inv_og', workspaceId: 'ws_open_garden', workspaceName: 'open-garden',
  email: 'sam@open-tomato.dev', role: 'member' as const, invitedBy: 'usr_ren',
  expiresAt: null, acceptedAt: null,
};

let app: express.Express;

beforeEach(() => {
  vi.mocked(listOpenInvitationsForEmail).mockReset();
  vi.mocked(getInvitationById).mockReset();
  vi.mocked(countWorkspaceMembers).mockReset();
  vi.mocked(getMembershipRole).mockReset();
  vi.mocked(getUserById).mockReset();
  vi.mocked(createSession).mockReset();
  vi.mocked(createSession).mockResolvedValue({ sid: 'sid_x', refreshToken: 'rt_seed' });
  app = buildApp();
});

describe('GET /workspaces/invitations', () => {
  it('returns the caller’s open invites mapped to the contract shape', async () => {
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([OPEN_INVITE]);
    vi.mocked(countWorkspaceMembers).mockResolvedValue(12);
    vi.mocked(getUserById).mockResolvedValue({ id: 'usr_ren', email: 'ren@open-tomato.dev', name: 'Ren Ohara' });

    const res = await request(app).get('/workspaces/invitations')
      .set('Authorization', await bearer());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'inv_og', workspaceId: 'ws_open_garden', workspaceName: 'open-garden',
      members: 12, role: 'member', invitedBy: 'Ren Ohara',
    });
    expect(res.body[0].tone).toMatch(/^(accent|primary|gold)$/);
    expect(typeof res.body[0].description).toBe('string');
    // The lookup is scoped to the token's email — never a client-supplied one.
    expect(vi.mocked(listOpenInvitationsForEmail)).toHaveBeenCalledWith(expect.anything(), SAM.email);
  });

  it('requires auth', async () => {
    const res = await request(app).get('/workspaces/invitations');
    expect(res.status).toBe(401);
  });

  it('rejects an OAuth pending-federation token used as a bearer (no token confusion)', async () => {
    // Regression: the pending-fed token shares the JWT secret/issuer but a
    // different `typ` (+ derived key). It must NOT authenticate as an access token.
    const federation = createFederationSigner('test-secret'); // same secret as the issuer
    const pendingFed = await federation.sign({
      provider: 'google', providerUid: 'g1', email: SAM.email, name: SAM.name, emailVerified: true,
    });

    const res = await request(app).get('/workspaces/invitations')
      .set('Authorization', `Bearer ${pendingFed}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /workspaces/select', () => {
  it('stamps wsp only for a valid invite and preserves amr (no role/inv in token)', async () => {
    vi.mocked(getInvitationById).mockResolvedValue(OPEN_INVITE);

    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({ invitationId: 'inv_og' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.tokens.claims).toMatchObject({ wsp: 'ws_open_garden', amr: ['pwd'] });
    expect(res.body.tokens.claims.wspRole).toBeUndefined();
    expect(res.body.tokens.claims.inv).toBeUndefined();
  });

  it('mints the self-serve default (wsp only) when no invite is chosen', async () => {
    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.tokens.claims.wsp).toBe('ws_default');
    expect(res.body.tokens.claims.wspRole).toBeUndefined();
    expect(res.body.tokens.claims.inv).toBeUndefined();
    expect(vi.mocked(getInvitationById)).not.toHaveBeenCalled();
  });

  it('rejects an unknown invitation', async () => {
    vi.mocked(getInvitationById).mockResolvedValue(null);
    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({ invitationId: 'inv_ghost' });
    expect(res.body).toEqual({ status: 'invalid_invitation' });
  });

  it('rejects an invite addressed to a different user (not just any valid id)', async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ ...OPEN_INVITE, email: 'someone-else@open-tomato.dev' });
    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({ invitationId: 'inv_og' });
    expect(res.body).toEqual({ status: 'invalid_invitation' });
  });

  it('rejects an expired invite', async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ ...OPEN_INVITE, expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post('/workspaces/select')
      .set('Authorization', await bearer())
      .send({ invitationId: 'inv_og' });
    expect(res.body).toEqual({ status: 'invalid_invitation' });
  });

  it('requires auth', async () => {
    const res = await request(app).post('/workspaces/select')
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /workspaces/:id/me', () => {
  it('reports the caller’s membership role', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue('admin');
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const res = await request(app).get('/workspaces/ws_open_garden/me')
      .set('Authorization', await bearer());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ wspRole: 'admin', membership: { role: 'admin' }, pendingInvite: null });
  });

  it('falls back to a pending invite when not yet a member', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([OPEN_INVITE]);

    const res = await request(app).get('/workspaces/ws_open_garden/me')
      .set('Authorization', await bearer());

    expect(res.body).toEqual({
      wspRole: 'member', membership: null, pendingInvite: { id: 'inv_og', role: 'member' },
    });
  });

  it('returns a null role for a workspace the caller cannot access', async () => {
    vi.mocked(getMembershipRole).mockResolvedValue(null);
    vi.mocked(listOpenInvitationsForEmail).mockResolvedValue([]);

    const res = await request(app).get('/workspaces/ws_stranger/me')
      .set('Authorization', await bearer());

    expect(res.body).toEqual({ wspRole: null, membership: null, pendingInvite: null });
  });

  it('requires auth', async () => {
    const res = await request(app).get('/workspaces/ws_open_garden/me');
    expect(res.status).toBe(401);
  });
});
