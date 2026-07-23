/**
 * Sign-in flow state machine.
 *
 * Pure async reducer: `(state, event) -> Promise<state>`, all outcomes routed
 * through the mock `authApi`. No React, no navigation — fully unit-testable.
 * The hook layer maps the resulting `step` onto routes.
 *
 * Happy path:   credentials --submitEmail(ok)--> authenticated
 * 2FA path:     credentials --submitEmail(2fa)--> twoFactor --submitCode(ok)--> authenticated
 * OAuth path:   credentials --oauth(existing)--> authenticated
 *               credentials --oauth(new)------> oauthProfile
 * Failure:      credentials --submitEmail(bad)--> credentials + error
 *               twoFactor   --submitCode(bad)---> twoFactor + error
 *               credentials --oauth(denied)-----> credentials + error
 */

import type { AuthApi } from '../api/authApi';
import type {
  OAuthProvider, TokenSet, UserProfile,
} from '../types';

import { authApi as defaultApi } from '../api/authApi';

export type SignInStep = 'credentials' | 'twoFactor' | 'oauthProfile' | 'authenticated';

export interface SignInState {
  step: SignInStep;
  error?: string;
  /** Which surface the error belongs to — drives inline vs banner rendering. */
  errorKind?: 'credentials' | 'twofa' | 'oauth';
  /** Present on the twoFactor step. */
  challengeId?: string;
  /** The authenticated subject id, once known. */
  userId?: string;
  tokens?: TokenSet;
  /** Present on the oauthProfile step. */
  provider?: OAuthProvider;
  suggested?: UserProfile;
}

export type SignInEvent =
  | { kind: 'submitEmail'; email: string; password: string; remember?: boolean }
  | { kind: 'submitCode'; code: string }
  | { kind: 'oauth'; provider: OAuthProvider; simulate?: 'denied' };

export const initialSignIn = (): SignInState => ({ step: 'credentials' });

export const signInReduce = async (
  state: SignInState,
  event: SignInEvent,
  api: AuthApi = defaultApi,
): Promise<SignInState> => {
  switch (event.kind) {
    case 'submitEmail': {
      const result = await api.signIn.withEmail({
        email: event.email, password: event.password, remember: event.remember,
      });
      if (result.status === 'invalid_credentials') {
        return { step: 'credentials', errorKind: 'credentials', error: 'That email and password don\'t match. Try again or reset it.' };
      }
      if (result.status === 'two_factor_required') {
        return {
          step: 'twoFactor',
          challengeId: result.challenge.challengeId,
          userId: result.user.id,
        };
      }
      return { step: 'authenticated', userId: result.tokens.claims.sub, tokens: result.tokens };
    }

    case 'submitCode': {
      if (state.challengeId == null) {
        return { ...state, error: 'This challenge has expired. Sign in again.' };
      }
      const result = await api.signIn.verifyTwoFactor({ challengeId: state.challengeId, code: event.code });
      if (result.status === 'invalid_code') {
        return {
          ...state, step: 'twoFactor', errorKind: 'twofa', error: 'That code isn\'t right. Check your authenticator and try again.',
        };
      }
      return { step: 'authenticated', userId: result.tokens.claims.sub, tokens: result.tokens };
    }

    case 'oauth': {
      const result = await api.signIn.withOAuth({ provider: event.provider, simulate: event.simulate });
      if (result.status === 'denied') {
        return { step: 'credentials', errorKind: 'oauth', error: result.reason };
      }
      if (result.status === 'needs_profile') {
        return { step: 'oauthProfile', provider: result.provider, suggested: result.suggested };
      }
      return { step: 'authenticated', userId: result.tokens.claims.sub, tokens: result.tokens };
    }

    default:
      return state;
  }
};
