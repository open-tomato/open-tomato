/**
 * Two-factor ENROLLMENT flow state machine (security setup, post-login).
 *
 * TOTP branch:
 *   pick --continue(totp)--> scan --scanned--> confirm --submitCode(ok)--> done
 *   confirm --submitCode(bad)--> confirm + error
 * Passkey branch (D5, WebAuthn):
 *   pick --continue(passkey)--> passkey --register(ok)--> done
 *   passkey --register(fail)--> passkey + error
 *   passkey --cancel--> pick
 *
 * The Done step carries the recovery codes to display; it mints no new session
 * (the user is already authenticated), so the terminal CTA just redirects.
 */

import type { AuthApi, TotpEnrollment } from '../api/authApi';
import type { TwoFactorMethod } from '../types';

import { authApi as defaultApi } from '../api/authApi';

export type EnrollStep = 'pick' | 'scan' | 'confirm' | 'passkey' | 'done';

export interface EnrollState {
  step: EnrollStep;
  method: TwoFactorMethod;
  enrollment?: TotpEnrollment;
  recoveryCodes?: string[];
  error?: string;
}

export type EnrollEvent =
  | { kind: 'pickMethod'; method: TwoFactorMethod }
  | { kind: 'continue' }
  | { kind: 'scanned' }
  | { kind: 'submitCode'; code: string }
  | { kind: 'registerPasskey'; credential: unknown }
  | { kind: 'cancelPasskey' };

export const initialEnroll = (): EnrollState => ({ step: 'pick', method: 'totp' });

export const enrollReduce = async (
  state: EnrollState,
  event: EnrollEvent,
  api: AuthApi = defaultApi,
): Promise<EnrollState> => {
  switch (event.kind) {
    case 'pickMethod':
      return { ...state, method: event.method };

    case 'continue': {
      if (state.method === 'passkey') {
        return { ...state, step: 'passkey', error: undefined };
      }
      const enrollment = await api.twoFactor.enrollTotpStart();
      return { ...state, step: 'scan', enrollment };
    }

    case 'scanned':
      return { ...state, step: 'confirm' };

    case 'submitCode': {
      const result = await api.twoFactor.enrollTotpVerify({ code: event.code });
      if (result.status === 'invalid_code') {
        return { ...state, step: 'confirm', error: 'That code isn\'t right. Your authenticator rotates it every 30s — try the current one.' };
      }
      return {
        ...state, step: 'done', recoveryCodes: result.recoveryCodes, error: undefined,
      };
    }

    case 'registerPasskey': {
      const result = await api.twoFactor.enrollPasskeyFinish(event.credential);
      if (result.status === 'failed') {
        return { ...state, step: 'passkey', error: result.reason };
      }
      return {
        ...state, step: 'done', recoveryCodes: result.recoveryCodes, error: undefined,
      };
    }

    case 'cancelPasskey':
      return { ...state, step: 'pick', error: undefined };

    default:
      return state;
  }
};
