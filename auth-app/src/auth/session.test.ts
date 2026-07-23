import type { TokenSet } from './types';

import { beforeEach, describe, expect, test } from 'vitest';

import {
  completeSignIn, goToWebapp, persistSession, readSession, resolveRedirectTarget, webappUrl,
} from './session';

const TOKENS: TokenSet = {
  accessToken: 'a.b.c',
  refreshToken: 'r.e.f',
  expiresIn: 900,
  tokenType: 'Bearer',
  claims: {
    sub: 'usr_sam', email: 'sam@open-tomato.dev', name: 'Sam', amr: ['pwd'], iat: 0, exp: 900,
  },
};

beforeEach(() => {
  sessionStorage.clear();
});

describe('redirect-back-to-webapp', () => {
  test('with no redirect param, targets the configured webapp root', () => {
    expect(resolveRedirectTarget('')).toBe(webappUrl());
  });

  test('honors a same-origin redirect deep link', () => {
    const target = resolveRedirectTarget('?redirect=/overview');
    expect(target).toBe(`${webappUrl()}/overview`);
  });

  test('rejects an off-origin redirect (no open redirect)', () => {
    expect(resolveRedirectTarget('?redirect=https://evil.example/steal')).toBe(webappUrl());
    expect(resolveRedirectTarget('?redirect=%2F%2Fevil.example')).toBe(webappUrl());
  });
});

describe('session hand-off', () => {
  test('completeSignIn persists the session and redirects to the resolved target', () => {
    let redirectedTo = '';
    const target = completeSignIn(TOKENS, '?redirect=/overview', (url) => { redirectedTo = url; });
    expect(target).toBe(`${webappUrl()}/overview`);
    expect(redirectedTo).toBe(target);
    expect(readSession()?.accessToken).toBe(TOKENS.accessToken);
  });

  test('goToWebapp redirects without minting or requiring a session', () => {
    let redirectedTo = '';
    goToWebapp('', (url) => { redirectedTo = url; });
    expect(redirectedTo).toBe(webappUrl());
    expect(readSession()).toBeNull();
  });

  test('persist/read round-trips the token set', () => {
    persistSession(TOKENS);
    expect(readSession()).toEqual(TOKENS);
  });
});
