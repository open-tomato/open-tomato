/**
 * Sign-up flow state machine (account creation half).
 *
 * account   --submitEmail(ok)------> workspace   (hand off userId)
 * account   --submitEmail(taken)---> account + error
 * oauth     --completeOAuth-------->  workspace
 *
 * Workspace selection + the Done splash are separate concerns: the workspace
 * pick is shared with sign-in (`flows/workspace.ts`) and the Done screen is a
 * terminal render whose CTA triggers the redirect.
 */

import type { AuthApi } from '../api/authApi';
import type { OAuthProvider, TokenSet, UserProfile } from '../types';

import { authApi as defaultApi } from '../api/authApi';

export type SignUpStep = 'account' | 'workspace';

export interface SignUpState {
  step: SignUpStep;
  error?: string;
  user?: UserProfile;
  tokens?: TokenSet;
}

export type SignUpEvent =
  | { kind: 'submitEmail'; email: string; username: string; password: string }
  | { kind: 'completeOAuth'; provider: OAuthProvider; username: string; displayName: string };

export const initialSignUp = (): SignUpState => ({ step: 'account' });

export const signUpReduce = async (
  state: SignUpState,
  event: SignUpEvent,
  api: AuthApi = defaultApi,
): Promise<SignUpState> => {
  switch (event.kind) {
    case 'submitEmail': {
      const result = await api.signUp.withEmail({
        email: event.email, username: event.username, password: event.password,
      });
      if (result.status === 'email_taken') {
        return { step: 'account', error: 'That email already has an account. Try signing in instead.' };
      }
      return { step: 'workspace', user: result.user, tokens: result.tokens };
    }

    case 'completeOAuth': {
      const result = await api.signUp.completeOAuth({
        provider: event.provider, username: event.username, displayName: event.displayName,
      });
      if (result.status === 'email_taken') {
        return { step: 'account', error: 'That account is already linked. Sign in instead.' };
      }
      return { step: 'workspace', user: result.user, tokens: result.tokens };
    }

    default:
      return state;
  }
};
