/**
 * Password-reset flow state machine.
 *
 * email --request--> sent --> code --resetPassword(ok)--> done (+ tokens)
 * code  --resetPassword(expired)--> code + expired error
 * code  --resetPassword(bad)------> code + invalid error
 *
 * The Sent screen is purely informational; `advance` moves it to the code
 * entry step. Reset verifies the code AND sets the new password in one call
 * (matching the single ResetCode screen), then signs the user in.
 */

import type { AuthApi } from '../api/authApi';
import type { TokenSet } from '../types';

import { authApi as defaultApi } from '../api/authApi';

export type ResetStep = 'email' | 'sent' | 'code' | 'done';

export interface ResetState {
  step: ResetStep;
  email: string;
  maskedEmail?: string;
  error?: string;
  /** Distinguishes an expired code (offer resend) from a wrong one (retry). */
  expired?: boolean;
  tokens?: TokenSet;
}

export type ResetEvent =
  | { kind: 'requestCode'; email: string }
  | { kind: 'advance' }
  | { kind: 'resetPassword'; code: string; newPassword: string };

export const initialReset = (): ResetState => ({ step: 'email', email: '' });

export const resetReduce = async (
  state: ResetState,
  event: ResetEvent,
  api: AuthApi = defaultApi,
): Promise<ResetState> => {
  switch (event.kind) {
    case 'requestCode': {
      const result = await api.reset.requestCode({ email: event.email });
      return {
        step: 'sent', email: event.email, maskedEmail: result.maskedEmail,
      };
    }

    case 'advance':
      // Sent → code entry (the "Enter the code" CTA).
      return { ...state, step: state.step === 'sent'
        ? 'code'
        : state.step };

    case 'resetPassword': {
      const result = await api.reset.resetPassword({
        email: state.email, code: event.code, newPassword: event.newPassword,
      });
      if (result.status === 'expired') {
        return {
          ...state, step: 'code', expired: true,
          error: 'That code has expired. Request a fresh one and try again.',
        };
      }
      if (result.status === 'invalid_code') {
        return {
          ...state, step: 'code', expired: false,
          error: 'That code isn\'t right. Check the email and re-enter it.',
        };
      }
      return {
        ...state, step: 'done', tokens: result.tokens, error: undefined, expired: false,
      };
    }

    default:
      return state;
  }
};
